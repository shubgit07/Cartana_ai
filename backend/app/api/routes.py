import os
import logging
import shutil
import threading
import time
from collections import deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import json

from app.core.config import settings
from app.models import database, models
from app.models.schemas import (
    ProcessInputResponse,
    JobStatusResponse,
    TaskResponse,
    TaskUpdate,
    UserResponse,
    NoteResponse,
    MessageResponse,
    ChatThreadMemberResponse,
)
from app.workers.worker_main import run_task_pipeline
from app.core.celery_app import celery_app
from app.services.websocket_manager import manager
from app.models.database import SessionLocal

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".flac"}
_rate_limit_lock = threading.Lock()
_process_input_buckets: dict[str, deque[float]] = {}


def _get_client_identifier(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _enforce_process_input_rate_limit(request: Request) -> None:
    now = time.time()
    window_seconds = settings.PROCESS_INPUT_RATE_WINDOW_SECONDS
    limit = settings.PROCESS_INPUT_RATE_LIMIT
    client_id = _get_client_identifier(request)

    with _rate_limit_lock:
        bucket = _process_input_buckets.get(client_id)
        if bucket is None:
            bucket = deque()
            _process_input_buckets[client_id] = bucket

        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again after {window_seconds} seconds.",
            )

        bucket.append(now)


# ─── Input Processing ────────────────────────────────────────────────

@router.post("/process-input", response_model=ProcessInputResponse)
def process_input(
    request: Request,
    user_id: int = Form(...),
    text: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(database.get_db),
):
    _enforce_process_input_rate_limit(request)

    # Validate user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Must provide at least one input
    if not text and not file:
        raise HTTPException(
            status_code=400,
            detail="Must provide either text or an audio file",
        )

    # Validate audio file type
    audio_path = None
    if file:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported audio format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_AUDIO_EXTENSIONS))}",
            )
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, file.filename)
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Audio file saved to {audio_path}")

    # Validate text length
    if text and len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text input cannot be empty")

    # Create Note
    new_note = models.Note(
        raw_text=text or "Pending Transcription...",
        status=models.NoteStatus.PENDING,
        pipeline_trace={},
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    # Dispatch async pipeline
    task = run_task_pipeline.delay(new_note.id, user_id=user_id, text=text, audio_path=audio_path)
    logger.info(f"Pipeline dispatched: note_id={new_note.id}, job_id={task.id}")

    return ProcessInputResponse(
        message="Input received and processing started",
        note_id=new_note.id,
        status=new_note.status,
        job_id=task.id,
    )


# ─── Job Status ───────────────────────────────────────────────────────

@router.get("/status/{job_id}", response_model=JobStatusResponse)
def get_task_status(job_id: str):
    task_result = celery_app.AsyncResult(job_id)
    result = task_result.result

    # Celery stores exceptions as result on failure — serialize safely
    if task_result.status == "FAILURE" and result is not None:
        result = str(result)

    return JobStatusResponse(
        job_id=job_id,
        status=task_result.status,
        result=result,
    )


# ─── Notes ────────────────────────────────────────────────────────────

@router.get("/notes", response_model=list[NoteResponse])
def get_notes(db: Session = Depends(database.get_db)):
    return db.query(models.Note).filter(models.Note.is_deleted == False).order_by(models.Note.created_at.desc()).all()


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(database.get_db)):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    note.is_deleted = True
    db.commit()
    return {"message": "Note deleted successfully"}


@router.get("/notes/{note_id}", response_model=NoteResponse)
def get_note_data(note_id: int, db: Session = Depends(database.get_db)):
    note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


# ─── Users ────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.User).all()


def _get_user_or_404(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_default_manager_or_404(db: Session) -> models.User:
    manager_user = db.query(models.User).filter(models.User.role == models.RoleEnum.MANAGER).first()
    if not manager_user:
        raise HTTPException(status_code=404, detail="Manager user not found")
    return manager_user


def _resolve_chat_pair(current_user: models.User, counterpart: models.User, db: Session) -> tuple[int, int]:
    if current_user.role == models.RoleEnum.MANAGER:
        if counterpart.role != models.RoleEnum.EMPLOYEE:
            raise HTTPException(status_code=403, detail="Managers can only open employee threads")
        return current_user.id, counterpart.id

    if current_user.role == models.RoleEnum.EMPLOYEE:
        manager_user = _get_default_manager_or_404(db)
        if counterpart.id != manager_user.id:
            raise HTTPException(status_code=403, detail="Employees can only chat with the manager")
        return manager_user.id, current_user.id

    raise HTTPException(status_code=403, detail="Invalid role for chat")


@router.get("/chat/members", response_model=list[ChatThreadMemberResponse])
def get_chat_members(user_id: int, db: Session = Depends(database.get_db)):
    current_user = _get_user_or_404(db, user_id)

    if current_user.role == models.RoleEnum.MANAGER:
        counterparts = db.query(models.User).filter(models.User.role == models.RoleEnum.EMPLOYEE).order_by(models.User.username.asc()).all()
        manager_id = current_user.id
        results = []
        for member in counterparts:
            latest = (
                db.query(models.Message)
                .filter(models.Message.manager_id == manager_id, models.Message.member_id == member.id)
                .order_by(models.Message.created_at.desc())
                .first()
            )
            results.append(
                ChatThreadMemberResponse(
                    member=UserResponse.model_validate(member),
                    last_message_at=latest.created_at if latest else None,
                    last_message_preview=latest.content[:120] if latest else None,
                )
            )
        return results

    manager_user = _get_default_manager_or_404(db)
    latest = (
        db.query(models.Message)
        .filter(models.Message.manager_id == manager_user.id, models.Message.member_id == current_user.id)
        .order_by(models.Message.created_at.desc())
        .first()
    )
    return [
        ChatThreadMemberResponse(
            member=UserResponse.model_validate(manager_user),
            last_message_at=latest.created_at if latest else None,
            last_message_preview=latest.content[:120] if latest else None,
        )
    ]


@router.get("/chat/threads/{member_id}/messages", response_model=list[MessageResponse])
def get_chat_thread_messages(member_id: int, user_id: int, db: Session = Depends(database.get_db)):
    current_user = _get_user_or_404(db, user_id)
    counterpart = _get_user_or_404(db, member_id)
    manager_id, member_thread_id = _resolve_chat_pair(current_user, counterpart, db)

    messages = (
        db.query(models.Message)
        .filter(models.Message.manager_id == manager_id, models.Message.member_id == member_thread_id)
        .order_by(models.Message.created_at.asc())
        .all()
    )
    return messages


# ─── Tasks ────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[TaskResponse])
def get_tasks(
    user_id: Optional[int] = None,
    status: Optional[models.TaskStatus] = None,
    db: Session = Depends(database.get_db),
):
    query = db.query(models.Task)
    
    # Filter by status if provided
    if status:
        query = query.filter(models.Task.status == status)
    
    # Role-based filtering logic
    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            if user.role == models.RoleEnum.EMPLOYEE:
                query = query.filter(models.Task.assignee_id == user_id)
            # Managers see all tasks (no additional filtering)
    
    return query.order_by(models.Task.id.desc()).all()


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # Broadcast task update
    task_data = TaskResponse.model_validate(task).model_dump(mode="json")
    
    def broadcast_sync():
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(task_id, {"type": "task_updated", "data": task_data}))
        except RuntimeError:
            asyncio.run(manager.broadcast(task_id, {"type": "task_updated", "data": task_data}))
    
    background_tasks.add_task(broadcast_sync)

    return task


@router.get("/tasks/{task_id}/messages", response_model=list[MessageResponse])
def get_task_messages(task_id: int, db: Session = Depends(database.get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    messages = db.query(models.Message).filter(models.Message.task_id == task_id).order_by(models.Message.created_at.asc()).all()
    return messages


@router.websocket("/ws/tasks/{task_id}")
async def websocket_chat_endpoint(websocket: WebSocket, task_id: int):
    await websocket.accept()
    
    db = SessionLocal()
    try:
        initial_msg = await websocket.receive_text()
        initial_data = json.loads(initial_msg)
        if initial_data.get("type") != "auth" or not initial_data.get("user_id"):
            await websocket.close(code=1008, reason="Missing or invalid auth")
            return
        user_id = initial_data["user_id"]
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        task = db.query(models.Task).filter(models.Task.id == task_id).first()
        
        if not user or not task:
            await websocket.close(code=1008, reason="Unauthorized")
            return
            
        if user.role == models.RoleEnum.EMPLOYEE and task.assignee_id != user.id:
            await websocket.close(code=1008, reason="Forbidden access to task")
            return

        # Register connection
        manager.connect_to_channel(websocket, f"task_chat:{task_id}")
        logger.info(f"User {user_id} connected to WebSocket for task {task_id}")
        
        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)
            
            if msg_data.get("type") == "chat_message":
                content = msg_data.get("content")
                if content:
                    new_message = models.Message(task_id=task_id, sender_id=user_id, content=content)
                    db.add(new_message)
                    db.commit()
                    db.refresh(new_message)
                    
                    msg_resp = MessageResponse.model_validate(new_message).model_dump(mode="json")
                    await manager.broadcast(task_id, {
                        "type": "chat_message",
                        "data": msg_resp
                    })

    except WebSocketDisconnect:
        logger.info(f"User left WebSocket chat for task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error in task {task_id}: {e}")
        try:
            await websocket.close(code=1011)
        except:
            pass
    finally:
        manager.disconnect(websocket, task_id)
        db.close()


@router.websocket("/ws/chat/{member_id}")
async def websocket_member_chat_endpoint(websocket: WebSocket, member_id: int):
    await websocket.accept()

    db = SessionLocal()
    channel = None
    try:
        initial_msg = await websocket.receive_text()
        initial_data = json.loads(initial_msg)
        if initial_data.get("type") != "auth" or not initial_data.get("user_id"):
            await websocket.close(code=1008, reason="Missing or invalid auth")
            return

        user_id = initial_data["user_id"]
        current_user = db.query(models.User).filter(models.User.id == user_id).first()
        counterpart = db.query(models.User).filter(models.User.id == member_id).first()

        if not current_user or not counterpart:
            await websocket.close(code=1008, reason="Unauthorized")
            return

        try:
            manager_id, member_thread_id = _resolve_chat_pair(current_user, counterpart, db)
        except HTTPException as auth_exc:
            await websocket.close(code=1008, reason=str(auth_exc.detail))
            return

        channel = f"member_chat:{manager_id}:{member_thread_id}"
        manager.connect_to_channel(websocket, channel)
        logger.info(f"User {user_id} connected to member chat channel {channel}")

        while True:
            data = await websocket.receive_text()
            msg_data = json.loads(data)

            if msg_data.get("type") == "chat_message":
                content = (msg_data.get("content") or "").strip()
                if not content:
                    continue

                new_message = models.Message(
                    task_id=None,
                    sender_id=user_id,
                    manager_id=manager_id,
                    member_id=member_thread_id,
                    content=content,
                )
                db.add(new_message)
                db.commit()
                db.refresh(new_message)

                msg_resp = MessageResponse.model_validate(new_message).model_dump(mode="json")
                await manager.broadcast_channel(channel, {
                    "type": "chat_message",
                    "data": msg_resp,
                })

    except WebSocketDisconnect:
        logger.info(f"User left member chat channel {channel or 'unknown'}")
    except Exception as e:
        logger.error(f"WebSocket member chat error for member {member_id}: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        if channel:
            manager.disconnect_from_channel(websocket, channel)
        db.close()


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(database.get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
