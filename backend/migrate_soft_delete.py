import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Adding is_deleted column to notes table...")
        try:
            conn.execute(text("ALTER TABLE notes ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
            conn.commit()
            print("Successfully added is_deleted column.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column is_deleted already exists.")
            else:
                print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
