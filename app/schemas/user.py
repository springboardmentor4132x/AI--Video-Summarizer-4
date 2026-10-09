from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.core.roles import VALID_ROLES
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "learner"
    @field_validator("password")
    @classmethod
    def password_must_be_strong_enough(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value
    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, value: str) -> str:
        if value not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
        return value
class UserLogin(BaseModel):
    email: EmailStr
    password: str
class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    created_at: datetime
    class Config:
        from_attributes = True
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"