from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db.models import User
import uuid

router = APIRouter(tags=["players"])

class RegisterRequest(BaseModel):
    username: str

@router.post("/register")
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username taken")
    user = User(
        username=req.username,
        session_id=str(uuid.uuid4()),
        ip_address=request.client.host,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "username": user.username, "session_id": user.session_id}

@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db)):
    from db.models import LabProgress
    from labs.content import LAB_CONTENT
    import json

    def _hints_used(p):
        try:
            return json.loads(p.hints_used or "[]")
        except Exception:
            return []

    def _score_for_lab(p):
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

    users = db.query(User).all()
    rows = []
    for user in users:
        progresses = db.query(LabProgress).filter(LabProgress.user_id == user.id).all()
        total = sum(_score_for_lab(p) for p in progresses)
        flags = sum(1 for p in progresses if p.flag_submitted)
        rows.append({"user_id": user.id, "username": user.username, "score": total, "flags": flags})

    rows.sort(key=lambda r: r["score"], reverse=True)
    return [{"rank": i + 1, **r} for i, r in enumerate(rows)]
