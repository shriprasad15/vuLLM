from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine
from db import models
from ws.manager import manager
from routers import auth, players, attacks, flags, defenses, admin

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Operation: vuLLM")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth")
app.include_router(players.router, prefix="/players")
app.include_router(attacks.router, prefix="/attacks")
app.include_router(flags.router, prefix="/flags")
app.include_router(defenses.router, prefix="/defenses")
app.include_router(admin.router, prefix="/admin")

@app.websocket("/ws/admin")
async def ws_admin(websocket: WebSocket):
    await manager.connect(websocket, "admins")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "admins")

@app.websocket("/ws/leaderboard")
async def ws_leaderboard(websocket: WebSocket):
    await manager.connect(websocket, "players")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "players")

@app.get("/health")
async def health():
    from llm.ollama_client import is_available
    return {"status": "ok", "ollama": await is_available()}
