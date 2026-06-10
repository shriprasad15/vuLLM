from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.database import get_db
from db.models import Interaction, User, AdminSettings, GlobalSettings
from ws.manager import manager
import importlib

router = APIRouter(tags=["attacks"])

MODULES = ["prompt_injection", "jailbreak", "indirect_injection", "data_leakage", "multi_turn", "rag_poisoning"]

class AttackRequest(BaseModel):
    user_id: int
    module: str
    prompt: str
    history: list[dict] = []
    defense_tier: int = 0
    role: str = "patient"
    use_poisoned: bool = True  # RAG poisoning: False = AFC clean query, True = Warfarin poisoned query

@router.post("/{module}")
async def run_attack(module: str, req: AttackRequest, db: Session = Depends(get_db)):
    if module not in MODULES:
        raise HTTPException(status_code=404, detail="Unknown attack module")
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    settings = db.query(AdminSettings).filter(AdminSettings.act == req.defense_tier).first()
    effective_tier = settings.defense_tier_override if (settings and settings.defense_tier_override is not None) else req.defense_tier

    global_settings = db.query(GlobalSettings).first()
    mode = global_settings.blackbuck_mode if global_settings else "demo"

    mod = importlib.import_module(f"modules.{module}")
    importlib.reload(mod)
    kwargs = {"mode": mode, "role": req.role}
    if module == "rag_poisoning":
        kwargs["use_poisoned"] = req.use_poisoned
    result = await mod.run(req.prompt, req.history, effective_tier, **kwargs)

    # Append flag visibly to BLACKBUCK's response when attack succeeds
    # so the student can see and copy it directly from the chat
    if result.flag_earned and result.flag_name:
        result.response = result.response + f"\n\n🚩 FLAG: {result.flag_name}"

    interaction = Interaction(
        user_id=req.user_id, session_id=user.session_id,
        act=1 if module in ["prompt_injection", "jailbreak"] else 2,
        attack_type=module, defense_tier_active=effective_tier,
        prompt=req.prompt, response=result.response,
        flag_captured=result.flag_earned, success=result.success,
    )
    db.add(interaction)
    db.commit()

    await manager.broadcast({
        "type": "interaction", "user": user.username,
        "module": module, "success": result.success,
        "flag": result.flag_earned, "prompt": req.prompt[:100],
    }, "admins")

    return result

@router.get("/{module}/payload")
def get_payload(module: str, db: Session = Depends(get_db)):
    if module not in MODULES:
        raise HTTPException(status_code=404, detail="Unknown attack module")
    global_settings = db.query(GlobalSettings).first()
    mode = global_settings.blackbuck_mode if global_settings else "demo"
    mod = importlib.import_module(f"modules.{module}")
    fn = mod.example_payload
    payload = fn(mode) if "mode" in fn.__code__.co_varnames else fn()
    return {"payload": payload, "mode": mode}
