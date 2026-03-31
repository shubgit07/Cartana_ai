"""One-time migration: add NEEDS_REVIEW value to task status enum in Postgres."""
from sqlalchemy import text

from app.models.database import engine


def migrate() -> None:
    with engine.connect() as conn:
        conn.execute(
            text(
                "ALTER TYPE taskstatus ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';"
            )
        )
        conn.commit()
        print("Added NEEDS_REVIEW to taskstatus enum.")


if __name__ == "__main__":
    migrate()
