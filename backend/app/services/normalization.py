import dateparser

def normalize_date(deadline_text: str) -> str | None:
    """Uses dateparser to return an ISO date string."""
    if not deadline_text:
        return None
    
    parsed_date = dateparser.parse(
        deadline_text,
        settings={
            'TIMEZONE': 'Asia/Kolkata',
            'PREFER_DATES_FROM': 'future',
            'RETURN_AS_TIMEZONE_AWARE': True
        }
    )
    
    if parsed_date:
        return parsed_date.isoformat()
    return None

def normalize_priority(priority_text: str) -> str:
    """Map informal priority phrases to structured levels: high, medium, low."""
    if not priority_text:
        return "medium"
        
    text = priority_text.lower()
    if any(word in text for word in ["urgent", "asap", "immediate", "high"]):
        return "high"
    elif any(word in text for word in ["soon", "moderate", "medium"]):
        return "medium"
    elif any(word in text for word in ["whenever", "low", "someday", "no rush"]):
        return "low"
        
    return "medium"
