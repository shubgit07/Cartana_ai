from celery import Celery

celery_app = Celery(
    "voicetask",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["app.workers.worker_main"]
)
