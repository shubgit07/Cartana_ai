from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from app.models.models import NoteStatus

class ProcessTextRequest(BaseModel):
    user_id: int
    text: str

class ProcessTextResponse(BaseModel):
    message: str
    note_id: int
    status: NoteStatus
    job_id: Optional[UUID] = None
