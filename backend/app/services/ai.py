import json
import os
from groq import Groq
from app.core.config import settings

def get_client() -> Groq | None:
    api_key = settings.GROQ_API_KEY
    return Groq(api_key=api_key) if api_key else None

def detect_tasks(transcript: str) -> list[str]:
    """Uses LLM to find action items and returns a list of sentences."""
    client = get_client()
    if not client:
        return [f"Mock task: {transcript}"]

    prompt = f"""
Identify all distinct action items or tasks from the following transcript.
Return ONLY a valid JSON object with a single key "tasks" containing a list of strings, where each string is a sentence representing one task.
Transcript:
{transcript}
"""
    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        return data.get("tasks", [])
    except Exception as e:
        print(f"Error in detect_tasks: {e}")
        return []

def extract_entities(sentence: str) -> dict:
    """Takes an action item and returns a JSON object with task details."""
    client = get_client()
    if not client:
        return {
            "title": "Mock Title",
            "description": sentence,
            "assignee_name": "Unassigned",
            "priority": "medium",
            "deadline_text": "tomorrow"
        }

    prompt = f"""
Extract task details from the following sentence.
Return ONLY a valid JSON object with EXACTLY these keys:
- "title": A short, concise title.
- "description": Detailed description of the task.
- "assignee_name": The raw text of whoever the task is assigned to (or null if none).
- "priority": One of "low", "medium", or "high". Determine based on context, default to "medium".
- "deadline_text": The raw phrase indicating the deadline (or null if none).

Sentence:
{sentence}
"""
    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        print(f"DEBUG: extract_entities output: {data}")
        return data
    except Exception as e:
        print(f"Error in extract_entities: {e}")
        return {
            "title": "Error processing entity",
            "description": sentence,
            "assignee_name": None,
            "priority": "medium",
            "deadline_text": None
        }
