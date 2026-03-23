from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from app.models.models import NoteStatus, TaskStatus


# --- Request Models ---

class ProcessTextRequest(BaseModel):
    user_id: int
    text: str


# --- Response Models ---

class ProcessInputResponse(BaseModel):
    message: str
    note_id: int
    status: NoteStatus
    job_id: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Any = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_raw: Optional[str] = None
    status: TaskStatus
    assignee_id: Optional[int] = None
    note_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Include assignee details
    assignee: Optional[UserResponse] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    deadline_raw: Optional[str] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[int] = None


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: NoteStatus
    raw_text: Optional[str] = None
    pipeline_trace: Optional[dict] = None
    is_deleted: bool = False
    created_at: Optional[datetime] = None
    tasks: List[TaskResponse] = []
