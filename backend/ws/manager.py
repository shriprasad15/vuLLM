from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {"players": [], "admins": []}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self.active.setdefault(channel, []).append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        self.active.get(channel, []).remove(websocket)

    async def broadcast(self, message: dict, channel: str = "admins"):
        import json
        dead = []
        for ws in self.active.get(channel, []):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active[channel].remove(ws)

manager = ConnectionManager()
