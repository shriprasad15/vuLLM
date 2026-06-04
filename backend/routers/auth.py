from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from passlib.context import CryptContext
import os, datetime, httpx, uuid
from db.database import get_db
from db.models import User

router = APIRouter(tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"])
JWT_SECRET = os.getenv("JWT_SECRET", "supersecretkey")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"

class LoginRequest(BaseModel):
    password: str

class GoogleLoginRequest(BaseModel):
    credential: str   # Google ID token from client
    username: str     # chosen codename (pre-filled from Google name, editable)
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

@router.post("/google")
async def google_login(req: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    # Verify the Google ID token with Google's tokeninfo endpoint
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(GOOGLE_TOKEN_INFO_URL, params={"id_token": req.credential})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    info = r.json()

    # Verify audience matches our client ID (skip check if GOOGLE_CLIENT_ID not configured)
    if GOOGLE_CLIENT_ID and info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token audience mismatch")

    google_id = info.get("sub")
    email = info.get("email", "")
    picture = info.get("picture", "")

    if not google_id:
        raise HTTPException(status_code=401, detail="Could not extract Google identity")

    # Validate chosen username
    username = req.username.strip()
    if not username or len(username) < 2:
        raise HTTPException(status_code=422, detail="Codename must be at least 2 characters")

    # Look up existing user by google_id first, then fall back to username
    user = db.query(User).filter(User.google_id == google_id).first()

    if user:
        # Returning user — update picture in case it changed
        user.picture = picture
        db.commit()
    else:
        # Check if chosen username is taken by a different google_id
        existing = db.query(User).filter(User.username == username).first()
        if existing and existing.google_id != google_id:
            raise HTTPException(status_code=409, detail="Username taken — choose another")
        # New user — create
        user = User(
            username=username,
            session_id=str(uuid.uuid4()),
            ip_address=request.client.host,
            google_id=google_id,
            email=email,
            picture=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "user_id": user.id,
        "username": user.username,
        "session_id": user.session_id,
        "email": email,
        "picture": picture,
        "role": req.role,
    }
