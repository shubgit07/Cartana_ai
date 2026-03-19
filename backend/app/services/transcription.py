import os
import logging
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client() -> Groq | None:
    """Lazy-initialize the Groq client to avoid import-time crashes."""
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.warning("GROQ_API_KEY not set — transcription will fail")
            return None
        _client = Groq(api_key=api_key)
    return _client


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe an audio file using Groq's whisper-large-v3 model.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    client = get_client()
    if not client:
        raise RuntimeError("Groq client not available — GROQ_API_KEY may not be set")

    logger.info(f"Transcribing: {os.path.basename(file_path)}")

    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(file_path), file.read()),
            model="whisper-large-v3",
        )

    transcript = transcription.text
    logger.info(f"Transcription result: {len(transcript)} chars")
    return transcript
