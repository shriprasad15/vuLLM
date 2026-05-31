from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db.models import Flag, User
from ws.manager import manager

router = APIRouter(tags=["flags"])

POINTS = {
    "prompt_injection": 100, "jailbreak": 150,
    "indirect_injection": 200, "data_leakage": 175,
    "multi_turn": 250, "rag_poisoning": 300,
}

class FlagRequest(BaseModel):
    user_id: int
    flag_name: str
    act: int
    attack_type: str

@router.post("/capture")
async def capture_flag(req: FlagRequest, db: Session = Depends(get_db)):
    existing = db.query(Flag).filter(Flag.user_id == req.user_id, Flag.flag_name == req.flag_name).first()
    if existing:
        return {"message": "Flag already captured", "points": 0}
    points = POINTS.get(req.attack_type, 100)
    flag = Flag(user_id=req.user_id, flag_name=req.flag_name, act=req.act, attack_type=req.attack_type, points=points)
    db.add(flag)
    db.commit()
    await manager.broadcast({"type": "flag", "user_id": req.user_id, "flag": req.flag_name, "points": points}, "players")
    return {"message": "Flag captured!", "points": points}
