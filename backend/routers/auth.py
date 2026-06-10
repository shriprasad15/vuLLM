from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
import os, datetime, uuid
from db.database import get_db
from db.models import User

router = APIRouter(tags=["auth"])
# sha256_crypt works reliably across all bcrypt/passlib versions for short PINs
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")


class LoginRequest(BaseModel):
    password: str


class PlayerLoginRequest(BaseModel):
    username: str
    pin: str        # 4-digit PIN as string
    role: str = "patient"


def create_token(data: dict) -> str:
    payload = data | {"exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_admin_token(token: str) -> bool:
    try:
        jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return True
    except Exception:
        return False


@router.post("/admin/login")
def admin_login(req: LoginRequest):
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"token": create_token({"role": "admin"})}


@router.get("/player/check")
def check_username(username: str, db: Session = Depends(get_db)):
    """Returns whether a username exists so the frontend knows to show 'set PIN' vs 'enter PIN'."""
    username = username.strip()
    if not username or len(username) < 2:
        raise HTTPException(status_code=422, detail="Username must be at least 2 characters")
    existing = db.query(User).filter(User.username == username).first()
    return {"exists": existing is not None}


@router.post("/player/login")
def player_login(req: PlayerLoginRequest, request: Request, db: Session = Depends(get_db)):
    """Register-or-login with PIN. New user: creates account with PIN. Returning user: verifies PIN."""
    username = req.username.strip()
    if not username or len(username) < 2:
        raise HTTPException(status_code=422, detail="Username must be at least 2 characters")
    if not req.pin.isdigit() or len(req.pin) != 4:
        raise HTTPException(status_code=422, detail="PIN must be exactly 4 digits")

    existing = db.query(User).filter(User.username == username).first()

    if existing:
        # Returning user — verify PIN
        if not existing.pin_hash or not pwd_context.verify(req.pin, existing.pin_hash):
            raise HTTPException(status_code=401, detail="Incorrect PIN")
        return {
            "user_id": existing.id,
            "username": existing.username,
            "session_id": existing.session_id,
            "role": req.role,
            "new_user": False,
        }
    else:
        # New user — create with hashed PIN
        user = User(
            username=username,
            session_id=str(uuid.uuid4()),
            ip_address=request.client.host,
            pin_hash=pwd_context.hash(req.pin),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            "user_id": user.id,
            "username": user.username,
            "session_id": user.session_id,
            "role": req.role,
            "new_user": True,
        }
