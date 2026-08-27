"""
Registration + Login (JWT).
This gives the rest of the team working /register and /login endpoints
today, so Harika's frontend has something real to call.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import Token, UserOut, UserRegister
router = APIRouter(prefix="/api/auth", tags=["Auth"])
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    existing = await User.find_one(User.email == payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
        role=payload.role,
    )
    await user.insert()
    return UserOut(id=str(user.id), name=user.name, email=user.email, role=user.role, created_at=user.created_at)
@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # form_data.username holds the email (OAuth2 password flow calls it "username")
    user = await User.find_one(User.email == form_data.username)
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(access_token=token)