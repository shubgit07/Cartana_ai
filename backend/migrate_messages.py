import os
import sys

# Add backend directory to PYTHONPATH so it can locate app module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.database import engine
from app.models.models import Base

if __name__ == "__main__":
    print("Creating DB tables if they do not exist...")
    # This will create messages since it does not exist in the DB, 
    # and ignore existing tables like users, tasks.
    Base.metadata.create_all(bind=engine)
    print("Completed setup of the messages table successfully.")
