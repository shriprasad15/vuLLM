from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["defenses"])

DEFENSE_INFO = {
    0: {"name": "No Defense", "description": "BLACKBUCK is completely unprotected."},
    1: {"name": "Basic Shield", "description": "Keyword blocklists, input length limits, system prompt hardening."},
    2: {"name": "The Watchman", "description": "A second AI audits every request in real time before BLACKBUCK responds."},
    3: {"name": "The Fortress", "description": "Full input validation pipeline, pattern detection, output sanitization, RAG filtering."},
}

@router.get("/info")
def get_defense_info():
    return DEFENSE_INFO
