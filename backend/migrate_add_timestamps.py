"""One-time migration: add created_at / updated_at columns to existing tables."""
from app.models.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='tasks' AND column_name='created_at'"
        ))
        if result.fetchone():
            print("Timestamp columns already exist. Skipping.")
            return

        print("Adding created_at to notes...")
        conn.execute(text("ALTER TABLE notes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ"))

        print("Adding created_at to tasks...")
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ"))

        print("Adding updated_at to tasks...")
        conn.execute(text("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ"))

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
