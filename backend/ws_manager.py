"""
WebSocket Manager — Real-time broadcast for all connected clients.
When any data changes (CRUD), the server broadcasts an event so all
clients instantly refresh the relevant data.
"""
from fastapi import WebSocket, WebSocketDisconnect
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from typing import Set
import json
import logging
import re

logger = logging.getLogger(__name__)


# Map URL patterns to broadcast channels
CHANNEL_MAP = [
    (re.compile(r"/api/employees"), "employees"),
    (re.compile(r"/api/admin/gate-sessions"), "gate_sessions"),
    (re.compile(r"/api/gate-sessions"), "gate_sessions"),
    (re.compile(r"/api/map-sessions"), "sessions"),
    (re.compile(r"/api/admin/zone-categories"), "settings"),
    (re.compile(r"/api/.+/settings"), "settings"),
    (re.compile(r"/api/maps"), "maps"),
    (re.compile(r"/api/floors"), "maps"),
    (re.compile(r"/api/admin/floors"), "maps"),
    (re.compile(r"/api/tasks"), "tasks"),
    (re.compile(r"/api/alerts"), "alerts"),
    (re.compile(r"/api/admin/roles"), "permissions"),
    (re.compile(r"/api/admin/permissions"), "permissions"),
    (re.compile(r"/api/admin/sidebar"), "settings"),
    (re.compile(r"/api/admin/dropdown"), "settings"),
    (re.compile(r"/api/schedules"), "schedules"),
    (re.compile(r"/api/transactions"), "dashboard"),
    (re.compile(r"/api/auth/reset-pin"), "employees"),
    (re.compile(r"/api/users"), "employees"),
]


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WS connected — {len(self.active_connections)} active")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WS disconnected — {len(self.active_connections)} active")

    async def broadcast(self, channel: str, action: str = "updated"):
        """Broadcast event to all connected clients."""
        if not self.active_connections:
            return
        message = json.dumps({"channel": channel, "action": action})
        dead = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.add(conn)
        for conn in dead:
            self.active_connections.discard(conn)

    def resolve_channel(self, path: str) -> str | None:
        """Match a request path to a broadcast channel."""
        for pattern, channel in CHANNEL_MAP:
            if pattern.search(path):
                return channel
        return None


# Singleton
ws_manager = ConnectionManager()


class RealtimeBroadcastMiddleware(BaseHTTPMiddleware):
    """
    Middleware: after any successful POST/PUT/DELETE/PATCH,
    broadcast the relevant channel so all clients refresh instantly.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            if 200 <= response.status_code < 300:
                channel = ws_manager.resolve_channel(str(request.url.path))
                if channel:
                    action = {
                        "POST": "created",
                        "PUT": "updated",
                        "DELETE": "deleted",
                        "PATCH": "updated",
                    }.get(request.method, "updated")
                    try:
                        await ws_manager.broadcast(channel, action)
                    except Exception as e:
                        logger.warning(f"WS broadcast error: {e}")

        return response
