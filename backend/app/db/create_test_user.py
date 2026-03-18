# backend/app/db/create_test_user.py
from app.models.database import SessionLocal 
from app.models import models

def create_users():
    db = SessionLocal()
    try:
        # 1. Create Manager
        # Note: Check karein aapke models.py mein 'username' hai ya 'name'
        manager = db.query(models.User).filter(models.User.role == "MANAGER").first()
        if not manager:
            # Agar 'username' field hai toh:
            manager = models.User(username="test_manager", role="MANAGER")
            # Agar models.py mein 'name' hai toh upar wali line ko comment karke niche wali use karein:
            # manager = models.User(name="test_manager", role="MANAGER")
            
            db.add(manager)
            db.commit()
            db.refresh(manager)
            print(f"✅ Created Manager. ID: {manager.id}")
        else:
            print(f"ℹ️ Manager already exists. ID: {manager.id}")

        # 2. Create Employee
        employee = db.query(models.User).filter(models.User.role == "EMPLOYEE").first()
        if not employee:
            employee = models.User(username="test_employee", role="EMPLOYEE")
            db.add(employee)
            db.commit()
            db.refresh(employee)
            print(f"✅ Created Employee. ID: {employee.id}")
        else:
            print(f"ℹ️ Employee already exists. ID: {employee.id}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_users()