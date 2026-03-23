import os
import logging
import shutil
import threading
import time
from collections import deque
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import database, models
from app.models.schemas import (
    ProcessInputResponse,
    JobStatusResponse,
    TaskResponse,
    TaskUpdate,
    UserResponse,
    NoteResponse,
)
from app.workers.worker_main import run_task_pipeline
from app.core.celery_app import celery_app

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
    return task


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(database.get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
