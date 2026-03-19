from sqlalchemy import text
from app.models.database import engine

def migrate():
    commands = [
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_raw VARCHAR;",
        "ALTER TABLE tasks ALTER COLUMN deadline TYPE TIMESTAMP WITH TIME ZONE USING deadline::timestamptz;"
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                print(f"Running: {cmd}")
                conn.execute(text(cmd))
                conn.commit()
                print("Success.")
            except Exception as e:
                print(f"Error running {cmd}: {e}")
                conn.rollback()

if __name__ == "__main__":
    migrate()
