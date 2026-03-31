import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.models.database import Base


class RoleEnum(str, enum.Enum):
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"


class NoteStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class TaskStatus(str, enum.Enum):
    NEEDS_REVIEW = "NEEDS_REVIEW"
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    role = Column(Enum(RoleEnum), default=RoleEnum.EMPLOYEE)

    tasks = relationship("Task", back_populates="assignee")


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(UUID(as_uuid=True), default=uuid.uuid4, index=True, unique=True)
    raw_text = Column(String)
    status = Column(Enum(NoteStatus), default=NoteStatus.PENDING)
    pipeline_trace = Column(JSONB, default=dict)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    tasks = relationship("Task", back_populates="note")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(UUID(as_uuid=True), default=uuid.uuid4, index=True, unique=True)
    title = Column(String, index=True)
    description = Column(String)
    priority = Column(String)
    deadline = Column(DateTime(timezone=True))
    deadline_raw = Column(String)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    assignee_id = Column(Integer, ForeignKey("users.id"))
    note_id = Column(Integer, ForeignKey("notes.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    assignee = relationship("User", back_populates="tasks")
    note = relationship("Note", back_populates="tasks")
    messages = relationship("Message", back_populates="task", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    manager_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    member_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    content = Column(String)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    task = relationship("Task", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    manager = relationship("User", foreign_keys=[manager_id])
    member = relationship("User", foreign_keys=[member_id])
