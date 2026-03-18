from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
import os
import shutil
from sqlalchemy.orm import Session
from app.models import database, models, schemas
from app.workers.worker_main import run_task_pipeline
from app.core.celery_app import celery_app

app = FastAPI(title="VoiceTask AI")

@app.post("/process-input", response_model=schemas.ProcessTextResponse)
def process_input(
    user_id: int = Form(...),
    text: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(database.get_db)
):
    # Optional: Verify if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not text and not file:
        raise HTTPException(status_code=400, detail="Must provide either text or audio file")

    audio_path = None
    if file:
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        audio_path = os.path.join(upload_dir, file.filename)
        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    # Create the Note based on raw_text or a placeholder
    new_note = models.Note(
        raw_text=text or "Pending Transcription...",
        status=models.NoteStatus.PENDING,
        pipeline_trace={}
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    # Run the pipeline asynchronously via Celery
    task = run_task_pipeline.delay(new_note.id, text=text, audio_path=audio_path)
    
    return schemas.ProcessTextResponse(
        message="Input received and processing started",
        note_id=new_note.id,
        status=new_note.status,
        job_id=task.id
    )

@app.get("/status/{job_id}")
def get_task_status(job_id: str):
    task_result = celery_app.AsyncResult(job_id)
    return {
        "job_id": job_id,
        "status": task_result.status,
        "result": task_result.result
    }
