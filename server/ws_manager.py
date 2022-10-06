from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import ujson as json

class WSConnectionManager(WebSocket):
    def __init__(self):
        self.connections: dict = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.connections.update({
            websocket.get('client'): {
                'websocket': websocket,
                'ID': None
            }
        })

    async def disconnect(self, websocket: WebSocket):
        del self.connections[websocket.get('client')]

    async def send_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: str):
        for connection in self.connections:
            await self.send_message(message, connection['websocket'])
            
    async def get_websockets(self, user_ID: str) -> list:
        return [(i) for i in self.connections if i['ID'] == user_ID]