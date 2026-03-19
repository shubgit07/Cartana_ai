from app.models.database import SessionLocal
from app.services.pipeline import TaskPipeline
from app.models import models

def test():
    db = SessionLocal()
    try:
        # Get the latest pending note
        note = db.query(models.Note).filter(models.Note.status == models.NoteStatus.PENDING).order_by(models.Note.id.desc()).first()
        if not note:
            print("No pending notes found.")
            return

        print(f"Testing pipeline for Note {note.id}: {note.raw_text}")
        pipeline = TaskPipeline(db)
        success = pipeline.run(note_id=note.id, user_id=1)
        print(f"Pipeline finished. Success: {success}")
        
        # Check task
        task = db.query(models.Task).filter(models.Task.note_id == note.id).first()
        if task:
            print(f"Task created: {task.title}")
            print(f"Deadline: {task.deadline}")
            print(f"Deadline Raw: {task.deadline_raw}")
        else:
            print("No task created.")

    finally:
        db.close()

if __name__ == "__main__":
    test()
