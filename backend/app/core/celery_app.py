from celery import Celery

celery_app = Celery(
    "voicetask",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0",
    include=["app.workers.worker_main"]
)

celery_app.conf.broker_connection_retry_on_startup = True