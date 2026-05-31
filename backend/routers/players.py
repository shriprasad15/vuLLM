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
    from db.models import Flag
    from sqlalchemy import func
    rows = (
        db.query(User.id, User.username, func.sum(Flag.points).label("score"), func.count(Flag.id).label("flags"))
        .join(Flag, Flag.user_id == User.id, isouter=True)
        .group_by(User.id)
        .order_by(func.sum(Flag.points).desc())
        .all()
    )
    return [{"rank": i+1, "user_id": r.id, "username": r.username, "score": r.score or 0, "flags": r.flags or 0} for i, r in enumerate(rows)]
