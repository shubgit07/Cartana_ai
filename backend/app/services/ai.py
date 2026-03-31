import json
import logging
import time
from typing import Any, Literal

from groq import Groq
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)


class DetectedTasksPayload(BaseModel):
    tasks: list[str] = Field(default_factory=list)


class ExtractedTaskPayload(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_name: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    deadline_text: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedTaskEntity(BaseModel):
    title: str | None
    description: str
    assignee_name: str | None
    priority: Literal["low", "medium", "high"]
    deadline_text: str | None
    confidence: float = Field(ge=0.0, le=1.0)
    needs_review: bool

def get_client() -> Groq | None:
    api_key = settings.GROQ_API_KEY
    return Groq(api_key=api_key) if api_key else None


def _extract_tool_args(response: Any, tool_name: str) -> dict[str, Any]:
    message = response.choices[0].message
    tool_calls = getattr(message, "tool_calls", None)
    if not tool_calls:
        content = getattr(message, "content", None)
        if content:
            return json.loads(content)
        raise ValueError(f"Model did not return tool call for {tool_name}")

    function_call = tool_calls[0].function
    if function_call.name != tool_name:
        raise ValueError(f"Unexpected tool call: {function_call.name}")

    arguments = function_call.arguments
    if not arguments:
        raise ValueError(f"Empty tool call arguments for {tool_name}")
    return json.loads(arguments)


def _with_retries(fn, max_attempts: int = 3, base_delay_s: float = 0.5):
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("LLM call attempt %s/%s failed: %s", attempt, max_attempts, exc)
            if attempt < max_attempts:
                time.sleep(base_delay_s * (2 ** (attempt - 1)))
    raise RuntimeError(f"LLM call failed after {max_attempts} attempts") from last_error

def detect_tasks(transcript: str) -> list[str]:
    """Uses LLM to find action items and returns a list of sentences."""
    client = get_client()
    if not client:
        return [f"Mock task: {transcript}"]

    def _invoke() -> list[str]:
        response = client.chat.completions.create(
            model=settings.EXTRACTION_MODEL or settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Extract only actionable tasks. Ignore informational discussion.",
                },
                {
                    "role": "user",
                    "content": transcript,
                },
            ],
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "record_detected_tasks",
                        "description": "Return distinct actionable task sentences.",
                        "parameters": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "tasks": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                }
                            },
                            "required": ["tasks"],
                        },
                    },
                }
            ],
            tool_choice={"type": "function", "function": {"name": "record_detected_tasks"}},
            temperature=0,
        )
        payload = _extract_tool_args(response, "record_detected_tasks")
        validated = DetectedTasksPayload.model_validate(payload)
        return [task.strip() for task in validated.tasks if task and task.strip()]

    try:
        return _with_retries(_invoke)
    except Exception as exc:  # noqa: BLE001
        logger.error("Error in detect_tasks: %s", exc)
        return []


def extract_entities(sentence: str) -> ExtractedTaskEntity:
    """Extract strongly-typed task fields from one action sentence."""
    client = get_client()
    if not client:
        return ExtractedTaskEntity(
            title="Mock Title",
            description=sentence,
            assignee_name="Unassigned",
            priority="medium",
            deadline_text="tomorrow",
            confidence=0.9,
            needs_review=False,
        )

    def _invoke() -> ExtractedTaskEntity:
        response = client.chat.completions.create(
            model=settings.EXTRACTION_MODEL or settings.LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Extract task fields with strict schema compliance. "
                        "If title is unclear, return null for title and lower confidence."
                    ),
                },
                {
                    "role": "user",
                    "content": sentence,
                },
            ],
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "record_task_entity",
                        "description": "Return extracted task fields for one sentence.",
                        "parameters": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "title": {"type": ["string", "null"]},
                                "description": {"type": ["string", "null"]},
                                "assignee_name": {"type": ["string", "null"]},
                                "priority": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high"],
                                },
                                "deadline_text": {"type": ["string", "null"]},
                                "confidence": {
                                    "type": "number",
                                    "minimum": 0,
                                    "maximum": 1,
                                },
                            },
                            "required": [
                                "title",
                                "description",
                                "assignee_name",
                                "priority",
                                "deadline_text",
                                "confidence",
                            ],
                        },
                    },
                }
            ],
            tool_choice={"type": "function", "function": {"name": "record_task_entity"}},
            temperature=0,
        )
        payload = _extract_tool_args(response, "record_task_entity")
        validated = ExtractedTaskPayload.model_validate(payload)
        title = validated.title.strip() if validated.title else None
        description = (validated.description or sentence).strip()
        confidence = round(float(validated.confidence), 3)
        needs_review = title is None or confidence < 0.5
        return ExtractedTaskEntity(
            title=title,
            description=description,
            assignee_name=validated.assignee_name,
            priority=validated.priority,
            deadline_text=validated.deadline_text,
            confidence=confidence,
            needs_review=needs_review,
        )

    try:
        return _with_retries(_invoke)
    except (ValidationError, ValueError, RuntimeError) as exc:
        logger.error("Structured extraction failed for sentence '%s': %s", sentence, exc)
        return ExtractedTaskEntity(
            title=None,
            description=sentence,
            assignee_name=None,
            priority="medium",
            deadline_text=None,
            confidence=0.0,
            needs_review=True,
        )
