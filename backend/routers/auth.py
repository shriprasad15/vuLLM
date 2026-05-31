from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
import os, datetime

router = APIRouter(tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"])
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")

class LoginRequest(BaseModel):
    password: str

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
