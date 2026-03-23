import asyncio
import json
import logging
import os
from collections import defaultdict
from typing import Dict, List, Any

from fastapi import WebSocket
from redis import asyncio as aioredis # type: ignore

logger = logging.getLogger(__name__)

# Fallback to backend docker network if REDIS_URL goes missing or in tests
_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = defaultdict(list)
        self.redis = None
        self.pubsub = None
        self.listener_task = None

    async def connect_redis(self):
        if not self.redis:
            try:
                self.redis = aioredis.from_url(_REDIS_URL, decode_responses=True)
                self.pubsub = self.redis.pubsub()
                await self.pubsub.psubscribe("task_chat:*")
                # Start background listener
                self.listener_task = asyncio.create_task(self._listen_to_redis())
                logger.info(f"Connected to Redis PubSub for WebSocket Manager at {_REDIS_URL}")
            except Exception as e:
                logger.error(f"Failed to connect to Redis PubSub: {e}")

    async def _listen_to_redis(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "pmessage":
                    channel = message["channel"]
                    data = message["data"]
                    # Extract task_id from "task_chat:<id>"
                    task_id_str = channel.split(":")[1]
                    if task_id_str.isdigit():
                        task_id = int(task_id_str)
                        await self._send_to_local_connections(task_id, data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
            # Optional: Add reconnect logic here if it crashed

    async def _send_to_local_connections(self, task_id: int, message_json: str):
        """Send a stringified JSON payload to all locally connected sockets for this task."""
        connections = self.active_connections.get(task_id, [])
        disconnected = []
        for ws in connections:
            try:
                await ws.send_text(message_json)
            except Exception as e:
                logger.warning(f"Failed to send to a websocket for task {task_id}, marking for removal: {e}")
                disconnected.append(ws)
        
        # Cleanup broken connections
        for ws in disconnected:
            self.disconnect(ws, task_id)

    async def connect(self, websocket: WebSocket, task_id: int):
        await websocket.accept()
        self.active_connections[task_id].append(websocket)
        logger.info(f"WebSocket connected for task {task_id}. Total connections for task: {len(self.active_connections[task_id])}")
        
    def disconnect(self, websocket: WebSocket, task_id: int):
        if task_id in self.active_connections and websocket in self.active_connections[task_id]:
            self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]

    async def broadcast(self, task_id: int, message: dict):
        """
        Publishes the message to Redis so all workers see it.
        Message should be a dict matching the structure: 
        {"type": "chat_message" | "task_updated", "data": {...}}
        """
        if not self.redis:
            await self.connect_redis()

        payload = json.dumps(message)
        if self.redis:
            channel = f"task_chat:{task_id}"
            await self.redis.publish(channel, payload)
        else:
            # Fallback to local only broadcasting if Redis is completely unavailable
            await self._send_to_local_connections(task_id, payload)


# Global instance
manager = ConnectionManager()
