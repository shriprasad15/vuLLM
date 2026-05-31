from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from db.models import User, Interaction, Flag, AdminSettings
from routers.auth import verify_admin_token
import csv, io

router = APIRouter(tags=["admin"])

def get_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    if not verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return True

@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(get_admin)):
    users = db.query(User).all()
    result = []
    for u in users:
        flags = db.query(Flag).filter(Flag.user_id == u.id).all()
        score = sum(f.points for f in flags)
        last = db.query(Interaction).filter(Interaction.user_id == u.id).order_by(Interaction.timestamp.desc()).first()
        result.append({"id": u.id, "username": u.username, "score": score, "flags": len(flags),
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

@router.post("/reset")
def reset_user(user_id: Optional[int] = None, db: Session = Depends(get_db), _=Depends(get_admin)):
    q_flags = db.query(Flag)
    q_interactions = db.query(Interaction)
    if user_id:
        q_flags = q_flags.filter(Flag.user_id == user_id)
        q_interactions = q_interactions.filter(Interaction.user_id == user_id)
    q_flags.delete()
    q_interactions.delete()
    db.commit()
    return {"message": "Reset complete"}

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
