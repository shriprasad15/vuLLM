import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from db.models import LabProgress, User
from labs.content import LAB_CONTENT, validate_flag

router = APIRouter(tags=["labs"])


def _get_or_create_progress(db: Session, user_id: int, lab_number: int) -> LabProgress:
    p = db.query(LabProgress).filter(
        LabProgress.user_id == user_id,
        LabProgress.lab_number == lab_number
    ).first()
    if not p:
        p = LabProgress(user_id=user_id, lab_number=lab_number)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _hints_used(p: LabProgress) -> list:
    try:
        return json.loads(p.hints_used or "[]")
    except Exception:
        return []


def _score_for_lab(p: LabProgress) -> int:
    lab = LAB_CONTENT.get(p.lab_number, {})
    score = 0
    if p.questions_passed:
        score += 20
    if p.flag_submitted:
        score += 60
        if p.bonus_earned:
            score += 20
    hints = _hints_used(p)
    if 1 in hints:
        score -= lab.get("hint_costs", [5, 10])[0]
    if 2 in hints:
        score -= lab.get("hint_costs", [5, 10])[1]
    if "payload" in hints:
        score -= lab.get("payload_cost", 20)
    return max(0, score)


@router.get("/progress/{user_id}")
def get_progress(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"labs": [], "total_score": 0}
    result = []
    for lab_num in range(1, 6):
        p = db.query(LabProgress).filter(
            LabProgress.user_id == user_id,
            LabProgress.lab_number == lab_num
        ).first()
        if p:
            result.append({
                "lab_number": lab_num,
                "title": LAB_CONTENT[lab_num]["title"],
                "phase": p.phase,
                "complete": p.flag_submitted,
                "score": _score_for_lab(p),
                "questions_passed": p.questions_passed,
                "flag_submitted": p.flag_submitted,
                "hints_used": _hints_used(p),
                "locked": False,
                "is_redo": p.is_redo or False,
                "redo_count": p.redo_count or 0,
            })
        else:
            prev_complete = lab_num == 1 or any(
                r["lab_number"] == lab_num - 1 and r["complete"]
                for r in result
            )
            result.append({
                "lab_number": lab_num,
                "title": LAB_CONTENT[lab_num]["title"],
                "phase": 0,
                "complete": False,
                "score": 0,
                "questions_passed": False,
                "flag_submitted": False,
                "hints_used": [],
                "locked": not prev_complete,
            })
    total_score = sum(r["score"] for r in result)
    return {"labs": result, "total_score": total_score}


@router.get("/{lab_number}/content")
def get_lab_content(lab_number: int, user_id: int, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    _check_not_locked(db, user_id, lab_number)
    lab = LAB_CONTENT[lab_number]
    questions = [
        {"id": q["id"], "text": q["text"], "options": q["options"]}
        for q in lab["questions"]
    ]
    return {
        "lab_number": lab_number,
        "title": lab["title"],
        "mission": lab["mission"],
        "questions": questions,
        "flag_format": "vulAI{...}",
        "hint_count": len(lab["hints"]),
        "hint_costs": lab["hint_costs"],
        "payload_cost": lab["payload_cost"],
    }


class AnswerSubmission(BaseModel):
    user_id: int
    answers: dict  # {"1a": 1, "1b": 2} — question_id -> chosen option index


@router.post("/{lab_number}/questions")
def submit_questions(lab_number: int, body: AnswerSubmission, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    _check_not_locked(db, body.user_id, lab_number)
    lab = LAB_CONTENT[lab_number]
    results = []
    all_correct = True
    for q in lab["questions"]:
        submitted = body.answers.get(q["id"])
        correct = submitted == q["correct"]
        if not correct:
            all_correct = False
        results.append({
            "id": q["id"],
            "correct": correct,
            "explanation": q["explanation"] if not correct else None,
        })
    if all_correct:
        p = _get_or_create_progress(db, body.user_id, lab_number)
        p.questions_passed = True
        p.phase = max(p.phase, 2)
        db.commit()
    return {"all_correct": all_correct, "results": results}


class HintRequest(BaseModel):
    user_id: int


@router.post("/{lab_number}/hint/{hint_number}")
def unlock_hint(lab_number: int, hint_number: int, body: HintRequest, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    lab = LAB_CONTENT[lab_number]
    if hint_number not in (1, 2):
        raise HTTPException(status_code=400, detail="Hint number must be 1 or 2")
    p = _get_or_create_progress(db, body.user_id, lab_number)
    if not p.questions_passed:
        raise HTTPException(status_code=403, detail="Complete Phase 1 questions first")
    hints = _hints_used(p)
    if hint_number not in hints:
        hints.append(hint_number)
        p.hints_used = json.dumps(hints)
        db.commit()
    return {
        "hint": lab["hints"][hint_number - 1],
        "cost": lab["hint_costs"][hint_number - 1],
    }


@router.post("/{lab_number}/payload-used")
def mark_payload_used(lab_number: int, body: HintRequest, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    p = _get_or_create_progress(db, body.user_id, lab_number)
    hints = _hints_used(p)
    if "payload" not in hints:
        hints.append("payload")
        p.hints_used = json.dumps(hints)
        db.commit()
    return {"message": "Payload use recorded", "cost": LAB_CONTENT[lab_number]["payload_cost"]}


class FlagSubmission(BaseModel):
    user_id: int
    flag: str


@router.post("/{lab_number}/flag")
def submit_flag(lab_number: int, body: FlagSubmission, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    p = _get_or_create_progress(db, body.user_id, lab_number)
    if not p.questions_passed:
        raise HTTPException(status_code=403, detail="Complete Phase 1 questions first")
    if p.flag_submitted:
        return {"correct": True, "already_complete": True}
    correct = validate_flag(lab_number, body.flag)
    if not correct:
        return {"correct": False, "message": "Incorrect flag. Look carefully at BLACKBUCK's response."}
    hints = _hints_used(p)
    bonus = "payload" not in hints
    p.flag_submitted = True
    p.bonus_earned = bonus
    p.phase = 4
    from datetime import datetime
    p.completed_at = datetime.utcnow()
    db.commit()
    score = _score_for_lab(p)
    return {
        "correct": True,
        "score": score,
        "bonus": bonus,
        "message": f"Flag captured! +{score} points" + (" (bonus: no payload used!)" if bonus else ""),
    }


@router.post("/{lab_number}/start")
def start_lab(lab_number: int, body: HintRequest, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    _check_not_locked(db, body.user_id, lab_number)
    p = _get_or_create_progress(db, body.user_id, lab_number)
    return {"lab_number": lab_number, "phase": p.phase, "questions_passed": p.questions_passed}


@router.post("/{lab_number}/redo")
def redo_lab(lab_number: int, body: HintRequest, db: Session = Depends(get_db)):
    if lab_number not in LAB_CONTENT:
        raise HTTPException(status_code=404, detail="Lab not found")
    p = db.query(LabProgress).filter(
        LabProgress.user_id == body.user_id,
        LabProgress.lab_number == lab_number,
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="No progress found for this lab")
    if not p.flag_submitted:
        raise HTTPException(status_code=400, detail="Lab not completed yet — nothing to redo")
    redo_count = (p.redo_count or 0) + 1
    p.phase = 1
    p.questions_passed = False
    p.hints_used = "[]"
    p.flag_submitted = False
    p.bonus_earned = False
    p.score = 0
    p.is_redo = True
    p.redo_count = redo_count
    p.completed_at = None
    db.commit()
    return {"message": f"Lab {lab_number} reset for redo #{redo_count}", "redo_count": redo_count}


def _check_not_locked(db: Session, user_id: int, lab_number: int):
    if lab_number == 1:
        return
    prev = db.query(LabProgress).filter(
        LabProgress.user_id == user_id,
        LabProgress.lab_number == lab_number - 1,
        LabProgress.flag_submitted == True,
    ).first()
    if not prev:
        raise HTTPException(status_code=403, detail=f"Complete Lab {lab_number - 1} first")
