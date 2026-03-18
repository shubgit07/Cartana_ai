import logging
from app.core.celery_app import celery_app
from app.services.pipeline import TaskPipeline
from app.models.database import SessionLocal
from app.models import models
from app.services.transcription import transcribe_audio
import os

logger = logging.getLogger(__name__)

@celery_app.task(name="run_task_pipeline", bind=True)
def run_task_pipeline(self, note_id: int, text: str = None, audio_path: str = None):
    db = SessionLocal()
    try:
        logger.info(f"Starting pipeline for note_id: {note_id}")
        
        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if note and audio_path and os.path.exists(audio_path):
            logger.info(f"Transcribing audio from {audio_path}...")
            transcript = transcribe_audio(audio_path)
            note.raw_text = transcript
            db.commit()
            
        pipeline = TaskPipeline(db)
        
        # Using a dummy user_id 1 since MVP pipeline.run requires it
        pipeline.run(note_id=note_id, user_id=1)
        
        # Verify and update the note status
        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if note and note.status != models.NoteStatus.PROCESSED:
            note.status = models.NoteStatus.PROCESSED
            db.commit()
            
    except Exception as e:
        logger.error(f"Task pipeline failed for note {note_id}: {e}")
        db.rollback()
        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if note:
            note.status = models.NoteStatus.FAILED
            db.commit()
        raise e
    finally:
        db.close()
