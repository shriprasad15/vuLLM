from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from db.models import User, Interaction, Flag, AdminSettings, GlobalSettings, LabProgress
from routers.auth import verify_admin_token
from labs.content import LAB_CONTENT
import csv, io, json

router = APIRouter(tags=["admin"])

def get_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True

def _lab_score(p, lab_content):
    lab = lab_content.get(p.lab_number, {})
    score = 0
    if p.questions_passed: score += 20
    if p.flag_submitted:
        score += 60
        if p.bonus_earned: score += 20
    try:
        hints = json.loads(p.hints_used or "[]")
    except Exception:
        hints = []
    if 1 in hints: score -= lab.get("hint_costs", [5, 10])[0]
    if 2 in hints: score -= lab.get("hint_costs", [5, 10])[1]
    if "payload" in hints: score -= lab.get("payload_cost", 20)
    return max(0, score)

@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(get_admin)):
    users = db.query(User).all()
    result = []
    for u in users:
        progresses = db.query(LabProgress).filter(LabProgress.user_id == u.id).all()
        score = sum(_lab_score(p, LAB_CONTENT) for p in progresses)
        flags = sum(1 for p in progresses if p.flag_submitted)
        last = db.query(Interaction).filter(Interaction.user_id == u.id).order_by(Interaction.timestamp.desc()).first()
        result.append({"id": u.id, "username": u.username, "score": score, "flags": flags,
                       "last_prompt": last.prompt[:80] if last else None, "last_seen": str(last.timestamp) if last else None})
    return result

@router.get("/interactions")
def list_interactions(user_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_admin)):
    q = db.query(Interaction)
    if user_id:
        q = q.filter(Interaction.user_id == user_id)
    return [{"id": i.id, "user_id": i.user_id, "act": i.act, "attack_type": i.attack_type,
             "defense_tier": i.defense_tier_active, "prompt": i.prompt, "response": i.response,
             "success": i.success, "flag_captured": i.flag_captured, "timestamp": str(i.timestamp)} for i in q.order_by(Interaction.timestamp.desc()).limit(200).all()]

class SettingsUpdate(BaseModel):
    timer_enabled: Optional[bool] = None
    timer_seconds: Optional[int] = None
    act_locked: Optional[bool] = None
    defense_tier_override: Optional[int] = None

@router.post("/settings/{act}")
def update_settings(act: int, body: SettingsUpdate, db: Session = Depends(get_db), _=Depends(get_admin)):
    s = db.query(AdminSettings).filter(AdminSettings.act == act).first()
    if not s:
        s = AdminSettings(act=act)
        db.add(s)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(s, field, val)
    db.commit()
    return {"message": "Settings updated"}

@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _=Depends(get_admin)):
    return db.query(AdminSettings).all()

@router.delete("/users")
def delete_all_users(db: Session = Depends(get_db), _=Depends(get_admin)):
    """Delete ALL users and their data. Irreversible."""
    db.query(Flag).delete()
    db.query(Interaction).delete()
    db.query(LabProgress).delete()
    db.query(User).delete()
    db.commit()
    return {"message": "All users deleted"}


@router.post("/reset")
def reset_user(user_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_admin)):
    q_flags = db.query(Flag)
    q_interactions = db.query(Interaction)
    q_progress = db.query(LabProgress)
    if user_id:
        q_flags = q_flags.filter(Flag.user_id == user_id)
        q_interactions = q_interactions.filter(Interaction.user_id == user_id)
        q_progress = q_progress.filter(LabProgress.user_id == user_id)
    q_flags.delete()
    q_interactions.delete()
    q_progress.delete()
    db.commit()
    return {"message": "Reset complete"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _=Depends(get_admin)):
    db.query(Flag).filter(Flag.user_id == user_id).delete()
    db.query(Interaction).filter(Interaction.user_id == user_id).delete()
    db.query(LabProgress).filter(LabProgress.user_id == user_id).delete()
    deleted = db.query(User).filter(User.id == user_id).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@router.post("/users/{user_id}/reset-pin")
def reset_pin(user_id: int, db: Session = Depends(get_db), _=Depends(get_admin)):
    """Admin resets a user's PIN — they can set a new one on next login attempt."""
    from passlib.context import CryptContext
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pin_hash = None
    db.commit()
    return {"message": f"PIN reset for {user.username}. They can set a new PIN on next login."}

@router.get("/global")
def get_global(db: Session = Depends(get_db), _=Depends(get_admin)):
    g = db.query(GlobalSettings).first()
    if not g:
        g = GlobalSettings(blackbuck_mode="demo")
        db.add(g); db.commit(); db.refresh(g)
    return {"blackbuck_mode": g.blackbuck_mode}

@router.post("/global")
def set_global(body: dict, db: Session = Depends(get_db), _=Depends(get_admin)):
    mode = body.get("blackbuck_mode", "demo")
    if mode not in ("demo", "realistic"):
        raise HTTPException(status_code=400, detail="mode must be 'demo' or 'realistic'")
    g = db.query(GlobalSettings).first()
    if not g:
        g = GlobalSettings(blackbuck_mode=mode)
        db.add(g)
    else:
        g.blackbuck_mode = mode
    db.commit()
    return {"blackbuck_mode": g.blackbuck_mode}

@router.get("/submissions")
def get_submissions(db: Session = Depends(get_db), _=Depends(get_admin)):
    users = db.query(User).all()
    result = []
    for u in users:
        row = {"user_id": u.id, "username": u.username, "labs": {}, "total_score": 0}
        for lab_num in range(1, 7):
            p = db.query(LabProgress).filter(
                LabProgress.user_id == u.id,
                LabProgress.lab_number == lab_num
            ).first()
            if p:
                try:
                    hints = json.loads(p.hints_used or "[]")
                except Exception:
                    hints = []
                lab = LAB_CONTENT[lab_num]
                score = 0
                if p.questions_passed: score += 20
                if p.flag_submitted:
                    score += 60
                    if p.bonus_earned: score += 20
                if 1 in hints: score -= lab["hint_costs"][0]
                if 2 in hints: score -= lab["hint_costs"][1]
                if "payload" in hints: score -= lab["payload_cost"]
                score = max(0, score)
                row["labs"][lab_num] = {
                    "complete": p.flag_submitted,
                    "score": score,
                    "hints_used": hints,
                    "bonus": p.bonus_earned,
                    "is_redo": p.is_redo or False,
                    "redo_count": p.redo_count or 0,
                    "started_at": str(p.started_at) if p.started_at else None,
                    "completed_at": str(p.completed_at) if p.completed_at else None,
                }
                row["total_score"] += score
            else:
                row["labs"][lab_num] = {"complete": False, "score": 0, "hints_used": [], "bonus": False}
        result.append(row)
    return result

@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), _=Depends(get_admin)):
    from fastapi.responses import StreamingResponse
    interactions = db.query(Interaction).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id","user_id","act","attack_type","defense_tier","prompt","response","success","flag_captured","timestamp"])
    for i in interactions:
        writer.writerow([i.id, i.user_id, i.act, i.attack_type, i.defense_tier_active, i.prompt, i.response, i.success, i.flag_captured, i.timestamp])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=interactions.csv"})
