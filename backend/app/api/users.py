from fastapi import APIRouter
from pydantic import BaseModel
from app.main import db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


# -----------------------------------
# Registration Model
# -----------------------------------
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str


# -----------------------------------
# Login Model
# -----------------------------------
class UserLogin(BaseModel):
    email: str
    password: str


# -----------------------------------
# Register User
# -----------------------------------
@router.post("/register")
async def register_user(user: UserCreate):

    # Check whether email already exists
    existing_user = await db.users.find_one({
        "email": user.email
    })

    if existing_user:
        return {
            "message": "Email already registered"
        }

    # Check valid role
    valid_roles = [
        "learner",
        "content_creator",
        "educator"
    ]

    if user.role not in valid_roles:
        return {
            "message": "Invalid role"
        }

    # Create user document
    new_user = {
        "name": user.name,
        "email": user.email,
        "password": user.password,
        "role": user.role
    }

    # Save user to MongoDB Atlas
    result = await db.users.insert_one(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id),
        "role": user.role
    }


# -----------------------------------
# Login User
# -----------------------------------
@router.post("/login")
async def login_user(user: UserLogin):

    # Find user by email
    existing_user = await db.users.find_one({
        "email": user.email
    })

    if not existing_user:
        return {
            "message": "This email is not registered."
        }

    # Check password
    if existing_user["password"] != user.password:
        return {
            "message": "Incorrect password."
        }

    # Login successful
    return {
        "message": "Login successful",
        "name": existing_user["name"],
        "email": existing_user["email"],
        "role": existing_user.get("role", "learner"),
        "user_id": str(existing_user["_id"])
    }