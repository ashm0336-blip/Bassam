"""
WebSocket Manager — Real-time broadcast for all connected clients.
When any data changes (CRUD), the server broadcasts an event so all
clients instantly refresh the relevant data.
Also tracks online users by mapping connections to user IDs.
"""
from fastapi import WebSocket, WebSocketDisconnect
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from typing import Set, Dict
import json
import logging
import re

logger = logging.getLogger(__name__)


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
    (re.compile(r"/api/admin/role-permissions"), "permissions"),
    (re.compile(r"/api/admin/permissions"), "permissions"),
    (re.compile(r"/api/admin/sidebar-menu"), "permissions"),
    (re.compile(r"/api/admin/sidebar"), "settings"),
    (re.compile(r"/api/admin/dropdown"), "settings"),
    (re.compile(r"/api/schedules"), "schedules"),
    (re.compile(r"/api/transactions"), "dashboard"),
    (re.compile(r"/api/auth/reset-pin"), "employees"),
    (re.compile(r"/api/users"), "employees"),
    (re.compile(r"/api/admin/activity-logs"), "activity_logs"),
    (re.compile(r"/api/manager/activity-logs"), "activity_logs"),
]


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._conn_to_user: Dict[WebSocket, str] = {}
        self._user_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str | None = None):
        await websocket.accept()
        self.active_connections.add(websocket)
        if user_id:
            self._conn_to_user[websocket] = user_id
            if user_id not in self._user_connections:
                self._user_connections[user_id] = set()
            self._user_connections[user_id].add(websocket)
        logger.info(f"WS connected — {len(self.active_connections)} active, {len(self.get_online_user_ids())} users")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        user_id = self._conn_to_user.pop(websocket, None)
        if user_id and user_id in self._user_connections:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
        logger.info(f"WS disconnected — {len(self.active_connections)} active, {len(self.get_online_user_ids())} users")

    def get_online_user_ids(self) -> list[str]:
        return list(self._user_connections.keys())

    async def broadcast(self, channel, action: str = "updated"):
        if not self.active_connections:
            return
        if isinstance(channel, dict):
            message = json.dumps(channel)
        else:
            message = json.dumps({"channel": channel, "action": action})
        dead = set()
        for conn in self.active_connections:
            try:
                await conn.send_text(message)
            except Exception:
                dead.add(conn)
        for conn in dead:
            self._cleanup_dead(conn)

    def _cleanup_dead(self, conn: WebSocket):
        self.active_connections.discard(conn)
        user_id = self._conn_to_user.pop(conn, None)
        if user_id and user_id in self._user_connections:
            self._user_connections[user_id].discard(conn)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]

    def resolve_channel(self, path: str) -> str | None:
        for pattern, channel in CHANNEL_MAP:
            if pattern.search(path):
                return channel
        return None


ws_manager = ConnectionManager()


class RealtimeBroadcastMiddleware(BaseHTTPMiddleware):
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
