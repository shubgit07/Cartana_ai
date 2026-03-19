import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.models.database import engine, SessionLocal
from app.models.models import Base, User, RoleEnum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="VoiceTask AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def on_startup():
    """Create DB tables and ensure default users exist."""
    logger.info("Running startup: creating database tables...")
    Base.metadata.create_all(bind=engine)
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
