"""
Registration + Login (JWT).
This gives the rest of the team working /register and /login endpoints
today, so Harika's frontend has something real to call.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.concurrency import run_in_threadpool

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import Token, UserOut, UserRegister

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _to_out(user: User) -> UserOut:
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister):
    existing = await User.find_one(User.email == payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # bcrypt hashing is CPU-heavy and blocking - run it in a background
    # thread so it doesn't freeze the whole server's event loop while
    # it's computing (this was causing severe slowdowns under load,
    # even for unrelated endpoints like the health check).
    hashed = await run_in_threadpool(hash_password, payload.password)

    user = User(
        name=payload.name,
        email=payload.email,
        password=hashed,
        role=payload.role,
    )
    await user.insert()
    return _to_out(user)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # form_data.username holds the email (OAuth2 password flow calls it "username")
    user = await User.find_one(User.email == form_data.username)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Same fix here - verify_password uses bcrypt.checkpw, also blocking.
    is_valid = await run_in_threadpool(verify_password, form_data.password, user.password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return Token(access_token=token)