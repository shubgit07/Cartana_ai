import logging
import time
from app.core.celery_app import celery_app
from app.services.pipeline import TaskPipeline
from app.models.database import SessionLocal
from app.models import models
from app.services.transcription import transcribe_audio
import os

logger = logging.getLogger(__name__)


@celery_app.task(name="run_task_pipeline", bind=True)
def run_task_pipeline(self, note_id: int, user_id: int = 1, text: str = None, audio_path: str = None):
    db = SessionLocal()
    try:
        logger.info(f"[Job {self.request.id}] Starting pipeline for note_id={note_id}, user_id={user_id}")

        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if not note:
            logger.error(f"[Job {self.request.id}] Note {note_id} not found")
            return {"error": f"Note {note_id} not found"}

        trace = dict(note.pipeline_trace) if note.pipeline_trace else {}

        # ── Stage 0: Transcription (if audio) ──
        if audio_path and os.path.exists(audio_path):
            logger.info(f"[Job {self.request.id}] Transcribing audio: {audio_path}")
            t0 = time.time()
            try:
                transcript = transcribe_audio(audio_path)
                note.raw_text = transcript
                trace["Transcription"] = {
                    "source": os.path.basename(audio_path),
                    "transcript_length": len(transcript),
                    "duration_s": round(time.time() - t0, 2),
                }
                db.commit()
                logger.info(f"[Job {self.request.id}] Transcription complete: {len(transcript)} chars")
            except Exception as e:
                logger.error(f"[Job {self.request.id}] Transcription failed: {e}")
                trace["Transcription"] = {"error": str(e)}
                note.pipeline_trace = trace
                note.status = models.NoteStatus.FAILED
                db.commit()
                raise e
        elif audio_path and not os.path.exists(audio_path):
            logger.error(f"[Job {self.request.id}] Audio file not found: {audio_path}")
            trace["Transcription"] = {"error": f"File not found: {audio_path}"}
            note.pipeline_trace = trace
            note.status = models.NoteStatus.FAILED
            db.commit()
            return {"error": "Audio file not found"}

        # Save transcription trace before pipeline
        note.pipeline_trace = trace
        db.commit()

        # ── Run the extraction pipeline ──
        pipeline = TaskPipeline(db)
        pipeline.run(note_id=note_id, user_id=user_id)

        logger.info(f"[Job {self.request.id}] Pipeline completed successfully for note {note_id}")
        return {"note_id": note_id, "status": "processed"}

    except Exception as e:
        logger.error(f"[Job {self.request.id}] Task pipeline failed for note {note_id}: {e}")
        db.rollback()
        note = db.query(models.Note).filter(models.Note.id == note_id).first()
        if note and note.status != models.NoteStatus.FAILED:
            note.status = models.NoteStatus.FAILED
            db.commit()
        raise e
    finally:
        db.close()
