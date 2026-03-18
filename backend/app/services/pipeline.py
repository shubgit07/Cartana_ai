from sqlalchemy.orm import Session
from app.models import models
from app.services.ai import detect_tasks, extract_entities
from app.services.normalization import normalize_date, normalize_priority

class TaskPipeline:
    def __init__(self, db: Session):
        self.db = db

    def run(self, note_id: int, user_id: int):
        note = self.db.query(models.Note).filter(models.Note.id == note_id).first()
        if not note:
            return

        trace = dict(note.pipeline_trace) if note.pipeline_trace else {}
        
        try:
            # Stage 1: Detection
            task_sentences = detect_tasks(note.raw_text)
            trace["Detection"] = {"detected_sentences": task_sentences}
            
            created_tasks = []
            extracted_items = []
            
            # Stage 2 & 3: Extraction and Normalization
            for sentence in task_sentences:
                entities = extract_entities(sentence)
                deadline_iso = normalize_date(entities.get("deadline_text"))
                
                extracted_items.append({
                    "sentence": sentence,
                    "entities": entities,
                    "normalized_deadline": deadline_iso
                })
                
                new_task = models.Task(
                    title=entities.get("title", "Untitled Task"),
                    description=entities.get("description", sentence),
                    priority=normalize_priority(entities.get("priority", "medium")),
                    deadline=deadline_iso,
                    status=models.TaskStatus.TODO,
                    assignee_id=user_id,
                    note_id=note.id
                )
                self.db.add(new_task)
                created_tasks.append(new_task)
            
            trace["Extraction"] = {"items": extracted_items}
            
            # Update trace and status
            note.pipeline_trace = trace
            note.status = models.NoteStatus.PROCESSED
            self.db.commit()
            
            return True
            
        except Exception as e:
            print(f"Error in pipeline: {e}")
            trace["Error"] = str(e)
            note.pipeline_trace = trace
            note.status = models.NoteStatus.FAILED
            self.db.commit()
            raise e
