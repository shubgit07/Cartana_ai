import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from app.api.routes import router
from app.core.config import settings
from app.models.database import engine, SessionLocal
from app.models.models import Base, User, RoleEnum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="VoiceTask AI")

allowed_origins = settings.cors_allow_origins_list
if settings.ENVIRONMENT.lower() == "production" and "*" in allowed_origins:
    logger.warning("CORS_ALLOW_ORIGINS is '*' in production; this is not recommended.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_request_size_limit(request: Request, call_next):
    """Reject oversized requests early using Content-Length."""
    max_bytes = settings.MAX_REQUEST_SIZE_MB * 1024 * 1024
    content_length = request.headers.get("content-length")

    if content_length:
        try:
            if int(content_length) > max_bytes:
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": f"Request too large. Max allowed size is {settings.MAX_REQUEST_SIZE_MB}MB.",
                    },
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid Content-Length header."},
            )

    return await call_next(request)

app.include_router(router)


def _ensure_message_chat_columns() -> None:
    inspector = inspect(engine)
    column_names = {col["name"] for col in inspector.get_columns("messages")}

    with engine.begin() as conn:
        if "manager_id" not in column_names:
            conn.execute(text("ALTER TABLE messages ADD COLUMN manager_id INTEGER"))
            conn.execute(text("ALTER TABLE messages ADD CONSTRAINT fk_messages_manager_id_users FOREIGN KEY (manager_id) REFERENCES users (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_manager_id ON messages (manager_id)"))
            logger.info("Added manager_id column to messages table")

        if "member_id" not in column_names:
            conn.execute(text("ALTER TABLE messages ADD COLUMN member_id INTEGER"))
            conn.execute(text("ALTER TABLE messages ADD CONSTRAINT fk_messages_member_id_users FOREIGN KEY (member_id) REFERENCES users (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_member_id ON messages (member_id)"))
            logger.info("Added member_id column to messages table")

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_manager_member_created_at ON messages (manager_id, member_id, created_at)"))


@app.on_event("startup")
def on_startup():
    """Create DB tables and ensure default users exist."""
    logger.info("Running startup: creating database tables...")
    Base.metadata.create_all(bind=engine)
    _ensure_message_chat_columns()
    logger.info("Database tables ready.")

    db = SessionLocal()
    try:
        # Seed users for Phase 1.5
        seed_users = [
            {"username": "Manager", "role": RoleEnum.MANAGER},
            {"username": "Swati", "role": RoleEnum.EMPLOYEE},
            {"username": "Shubham", "role": RoleEnum.EMPLOYEE},
            {"username": "Sid", "role": RoleEnum.EMPLOYEE},
            {"username": "James", "role": RoleEnum.EMPLOYEE},
        ]

        for user_data in seed_users:
            exists = db.query(User).filter(User.username == user_data["username"]).first()
            if not exists:
                new_user = User(username=user_data["username"], role=user_data["role"])
                db.add(new_user)
                logger.info(f"Seeded user: {user_data['username']} ({user_data['role']})")
        
        db.commit()
    except Exception as e:
        logger.error(f"Error during startup user creation: {e}")
        db.rollback()
    finally:
        db.close()

from app.services.websocket_manager import manager

@app.on_event("startup")
async def on_startup_async():
    await manager.connect_redis()

