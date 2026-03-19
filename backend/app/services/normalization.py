import dateparser
from datetime import datetime
import json
import pytz
from app.services.ai import get_client
from app.core.config import settings as app_settings


def normalize_date(deadline_text, base_date: datetime = None) -> datetime | None:
    """Uses dateparser to return a timezone-aware datetime object, with an LLM fallback."""
    if not deadline_text or not isinstance(deadline_text, str):
        return None

    deadline_text = deadline_text.strip()
    if not deadline_text:
        return None

    IST = pytz.timezone('Asia/Kolkata')

    # 1. Try dateparser first
    settings = {
        'TIMEZONE': 'Asia/Kolkata',
        'PREFER_DATES_FROM': 'future',
        'RETURN_AS_TIMEZONE_AWARE': True,
    }

    if base_date:
        settings['RELATIVE_BASE'] = base_date

    parsed_date = dateparser.parse(deadline_text, settings=settings)
    
    if parsed_date:
        if parsed_date.tzinfo is None:
            parsed_date = IST.localize(parsed_date)
        print(f"DEBUG: normalize_date - text: '{deadline_text}', parsed: {parsed_date}")
        return parsed_date

    # 2. Fallback to LLM if dateparser fails
    client = get_client()
    if not client:
        return None
        
    current_time = base_date.isoformat() if base_date else datetime.now(IST).isoformat()
    prompt = f"""
Convert the following natural language date/time phrase into an ISO-8601 string.
Assume current date and time is {current_time} (Asia/Kolkata).
IMPORTANT: Return the date in Asia/Kolkata timezone, but as a NAIVE ISO string (no 'Z' or offset).
Return ONLY a valid JSON object with the key "iso_date" containing the string, or null if it cannot be resolved.
Phrase: "{deadline_text}"
"""
    try:
        response = client.chat.completions.create(
            model=app_settings.LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        iso_str = data.get("iso_date")
        
        if iso_str:
            # Strip any existing timezone info from LLM just in case
            naive_iso = iso_str.split('+')[0].split('Z')[0]
            dt = datetime.fromisoformat(naive_iso)
            dt = IST.localize(dt)
            print(f"DEBUG: normalize_date LLM fallback - text: '{deadline_text}', final dt: {dt}")
            return dt
        return None
    except Exception as e:
        print(f"LLM normalization fallback failed: {e}")
        return None


def normalize_priority(priority_text) -> str:
    """Map informal priority phrases to structured levels: high, medium, low."""
    if not priority_text or not isinstance(priority_text, str):
        return "medium"

    text = priority_text.lower().strip()
    if not text:
        return "medium"

    if any(word in text for word in ["urgent", "asap", "immediate", "immediately", "high", "critical", "today"]):
        return "high"
    elif any(word in text for word in ["soon", "moderate", "medium", "important", "next week"]):
        return "medium"
    elif any(word in text for word in ["whenever", "low", "someday", "sometime", "no rush", "eventually"]):
        return "low"

    return "medium"
