from app.models.database import SessionLocal
from app.models.models import User

db = SessionLocal()
try:
    users = db.query(User).all()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Role: {u.role}")
finally:
    db.close()
