import os
import sys
from sqlalchemy import inspect, text

# Add backend directory to PYTHONPATH so it can locate app module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import engine
from app.models.models import Base

if __name__ == "__main__":
    print("Ensuring DB tables and message thread columns...")
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    column_names = {col["name"] for col in inspector.get_columns("messages")}

    with engine.begin() as conn:
        if "manager_id" not in column_names:
            conn.execute(text("ALTER TABLE messages ADD COLUMN manager_id INTEGER"))
            conn.execute(text("ALTER TABLE messages ADD CONSTRAINT fk_messages_manager_id_users FOREIGN KEY (manager_id) REFERENCES users (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_manager_id ON messages (manager_id)"))
            print("Added manager_id column to messages table")

        if "member_id" not in column_names:
            conn.execute(text("ALTER TABLE messages ADD COLUMN member_id INTEGER"))
            conn.execute(text("ALTER TABLE messages ADD CONSTRAINT fk_messages_member_id_users FOREIGN KEY (member_id) REFERENCES users (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_member_id ON messages (member_id)"))
            print("Added member_id column to messages table")

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_manager_member_created_at ON messages (manager_id, member_id, created_at)"))

    print("Message chat thread migration completed.")
