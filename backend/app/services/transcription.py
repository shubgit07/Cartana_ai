import os
from groq import Groq

# Ensure your GROQ_API_KEY is defined in your environment (.env or OS level)
client = Groq()

def transcribe_audio(file_path: str) -> str:
    """
    Transcribe an audio file using Groq's whisper-large-v3 model.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")
        
    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(file_path), file.read()),
            model="whisper-large-v3",
        )
        return transcription.text
