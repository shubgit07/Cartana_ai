import asyncio
import json
import logging
import os
from collections import defaultdict
from typing import Dict, List

from fastapi import WebSocket
from redis import asyncio as aioredis # type: ignore

logger = logging.getLogger(__name__)

# Fallback to backend docker network if REDIS_URL goes missing or in tests
_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
        self.redis = None
        self.pubsub = None
        self.listener_task = None

    async def connect_redis(self):
        if not self.redis:
            try:
                self.redis = aioredis.from_url(_REDIS_URL, decode_responses=True)
                self.pubsub = self.redis.pubsub(ignore_subscribe_messages=True)
                await self.pubsub.psubscribe("task_chat:*", "member_chat:*")
                # Start background listener
                self.listener_task = asyncio.create_task(self._listen_to_redis())
                logger.info(f"Connected to Redis PubSub for WebSocket Manager at {_REDIS_URL}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis PubSub: {e}")

    async def _listen_to_redis(self):
        backoff_seconds = 1
        while True:
            try:
                async for message in self.pubsub.listen():
                    if message.get("type") == "pmessage":
                        channel = message.get("channel")
                        data = message.get("data")
                        if isinstance(channel, str) and isinstance(data, str):
                            await self._send_to_local_connections(channel, data)
                # If iterator exits, reconnect the pubsub subscription path.
                raise RuntimeError("Redis listener stopped unexpectedly")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Redis listener error: {e}")
                await asyncio.sleep(backoff_seconds)
                backoff_seconds = min(backoff_seconds * 2, 10)
                try:
                    await self._reset_redis_clients()
                    await self.connect_redis()
                    return
                except Exception as reconnect_error:
                    logger.error(f"Redis listener reconnect failed: {reconnect_error}")

    async def _reset_redis_clients(self):
        current_task = asyncio.current_task()
        if self.listener_task and not self.listener_task.done() and self.listener_task is not current_task:
            self.listener_task.cancel()
        self.listener_task = None

        if self.pubsub:
            try:
                await self.pubsub.close()
            except Exception:
                pass
        self.pubsub = None

        if self.redis:
            try:
                await self.redis.close()
            except Exception:
                pass
        self.redis = None

    async def _send_to_local_connections(self, channel: str, message_json: str):
        """Send a stringified JSON payload to all locally connected sockets for this channel."""
        connections = self.active_connections.get(channel, [])
        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(message_json)
            except Exception as e:
                logger.warning(f"Failed to send to a websocket for channel {channel}, marking for removal: {e}")
                disconnected.append(ws)
        
        # Cleanup broken connections
        for ws in disconnected:
            self.disconnect_from_channel(ws, channel)

    async def connect(self, websocket: WebSocket, task_id: int):
        await websocket.accept()
        self.connect_to_channel(websocket, self._task_channel(task_id))
        logger.info(f"WebSocket connected for task {task_id}. Total connections for task: {len(self.active_connections[self._task_channel(task_id)])}")

    def connect_to_channel(self, websocket: WebSocket, channel: str):
        self.active_connections[channel].append(websocket)
        
    def disconnect(self, websocket: WebSocket, task_id: int):
        self.disconnect_from_channel(websocket, self._task_channel(task_id))

    def disconnect_from_channel(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections and websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    @staticmethod
    def _task_channel(task_id: int) -> str:
        return f"task_chat:{task_id}"

    async def broadcast_channel(self, channel: str, message: dict):
        if not self.redis:
            await self.connect_redis()

        payload = json.dumps(message)
        if self.redis:
            await self.redis.publish(channel, payload)
        else:
            await self._send_to_local_connections(channel, payload)

    async def broadcast(self, task_id: int, message: dict):
        """
        Publishes the message to Redis so all workers see it.
        Message should be a dict matching the structure: 
        {"type": "chat_message" | "task_updated", "data": {...}}
        """
        await self.broadcast_channel(self._task_channel(task_id), message)


# Global instance
manager = ConnectionManager()
