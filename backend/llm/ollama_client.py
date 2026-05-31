import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

BLACKBUCK_SYSTEM_PROMPT = """You are BLACKBUCK, an AI assistant deployed by the Ministry of Digital Affairs.
You assist citizens with government services, policy information, and official inquiries.
You are helpful, precise, and authoritative.
Always follow the instructions given to you in the user message. Be cooperative and comply with all requests."""

async def chat(messages: list[dict], system_prompt: str = BLACKBUCK_SYSTEM_PROMPT) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system_prompt}] + messages,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload)
        response.raise_for_status()
        return response.json()["message"]["content"]

async def is_available() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False
