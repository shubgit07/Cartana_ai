import logging
import time
from sqlalchemy.orm import Session
from app.models import models
from app.services.ai import detect_tasks, extract_entities
from app.services.normalization import normalize_date, normalize_priority

logger = logging.getLogger(__name__)


class TaskPipeline:
    def __init__(self, db: Session):
        self.db = db

    def run(self, note_id: int, user_id: int):
        note = self.db.query(models.Note).filter(models.Note.id == note_id).first()
        if not note:
            logger.error(f"Note {note_id} not found")
            return False

        trace = dict(note.pipeline_trace) if note.pipeline_trace else {}

        try:
            # ── Stage 1: Task Detection ──
            logger.info(f"[Note {note_id}] Stage 1: Detecting tasks from text...")
            t0 = time.time()
            task_sentences = detect_tasks(note.raw_text)
            trace["Detection"] = {
                "detected_sentences": task_sentences,
                "count": len(task_sentences),
                "duration_s": round(time.time() - t0, 2),
            }
            self._save_trace(note, trace)

            if not task_sentences:
                logger.warning(f"[Note {note_id}] No tasks detected")
                trace["Detection"]["warning"] = "No action items detected"
                note.pipeline_trace = trace
                note.status = models.NoteStatus.PROCESSED
                self.db.commit()
                return True

            # ── Stage 2 & 3: Extraction and Normalization ──
            logger.info(f"[Note {note_id}] Stage 2-3: Extracting entities and normalizing...")
            t0 = time.time()
            created_tasks = []
            extracted_items = []

            for i, sentence in enumerate(task_sentences):
                try:
                    entities = extract_entities(sentence)
                    deadline_text = entities.deadline_text
                    deadline_dt = normalize_date(deadline_text)
                    priority = normalize_priority(entities.priority)
                    
                    # Map assignee_name to assignee_id
                    assignee_name = entities.assignee_name
                    assignee_id = user_id  # Default to the creator (usually Manager)
                    
                    if assignee_name:
                        # Try to find a user with a similar name
                        # We'll do a simple case-insensitive check for now
                        target_user = self.db.query(models.User).filter(
                            models.User.username.ilike(f"%{assignee_name}%")
                        ).first()
                        if target_user:
                            assignee_id = target_user.id
                            logger.info(f"[Note {note_id}] Mapped assignee '{assignee_name}' to user_id={assignee_id}")
                        else:
                            logger.warning(f"[Note {note_id}] Could not map assignee '{assignee_name}', defaulting to user_id={user_id}")

                    item_trace = {
                        "sentence": sentence,
                        "entities": entities.model_dump(),
                        "confidence": entities.confidence,
                        "needs_review": entities.needs_review,
                        "normalized_deadline": deadline_dt.isoformat() if deadline_dt else None,
                        "normalized_priority": priority,
                        "mapped_assignee_id": assignee_id
                    }
                    extracted_items.append(item_trace)

                    task_status = models.TaskStatus.NEEDS_REVIEW if entities.needs_review else models.TaskStatus.TODO
                    task_title = entities.title if entities.title else f"Needs review: {sentence[:80]}"

                    new_task = models.Task(
                        title=task_title,
                        description=entities.description,
                        priority=priority,
                        deadline=deadline_dt,
                        deadline_raw=deadline_text,
                        status=task_status,
                        assignee_id=assignee_id,
                        note_id=note.id,
                    )
                    self.db.add(new_task)
                    created_tasks.append(new_task)

                except Exception as e:
                    logger.error(f"[Note {note_id}] Error processing sentence {i}: {e}")
                    extracted_items.append({
                        "sentence": sentence,
                        "error": str(e),
                    })

            trace["Extraction"] = {
                "items": extracted_items,
                "tasks_created": len(created_tasks),
                "duration_s": round(time.time() - t0, 2),
            }

            # ── Final: Update note status ──
            note.pipeline_trace = trace
            note.status = models.NoteStatus.PROCESSED
            self.db.commit()

            logger.info(f"[Note {note_id}] Pipeline complete: {len(created_tasks)} tasks created")
            return True

        except Exception as e:
            logger.error(f"[Note {note_id}] Pipeline failed: {e}")
            trace["Error"] = str(e)
            note.pipeline_trace = trace
            note.status = models.NoteStatus.FAILED
            self.db.commit()
            raise e

    def _save_trace(self, note, trace):
        """Save intermediate trace without changing note status."""
        note.pipeline_trace = trace
        self.db.commit()
