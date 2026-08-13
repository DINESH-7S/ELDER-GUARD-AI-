import asyncio
import logging
from collections import defaultdict
from typing import Any, Dict, Set

from fastapi import WebSocket

logger = logging.getLogger("elderguard.connected.realtime")


class ElderRoomManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, elder_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[elder_id].add(websocket)

    def disconnect(self, elder_id: str, websocket: WebSocket) -> None:
        sockets = self._rooms.get(elder_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._rooms.pop(elder_id, None)

    async def emit(self, elder_id: str, event: str, payload: Dict[str, Any]) -> None:
        sockets = list(self._rooms.get(elder_id, set()))
        if not sockets:
            return

        message = {"event": event, "elder_id": elder_id, "payload": payload}
        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(message)
            except Exception as exc:
                logger.warning("Realtime send failed for elder %s: %s", elder_id, exc)
                stale.append(socket)
        for socket in stale:
            self.disconnect(elder_id, socket)

    def emit_background(self, elder_id: str, event: str, payload: Dict[str, Any]) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.emit(elder_id, event, payload))
        except RuntimeError:
            asyncio.run(self.emit(elder_id, event, payload))


elder_room_manager = ElderRoomManager()
