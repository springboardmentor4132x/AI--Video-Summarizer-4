from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, ExpiredSignatureError
from beanie import PydanticObjectId
from app.core.security import decode_access_token
from app.models.user import User
# Points at the login route - this just tells FastAPI's docs UI where to get a token from
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    invalid_token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    expired_token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise invalid_token_exception
    except ExpiredSignatureError:
        raise expired_token_exception
    except JWTError:
        raise invalid_token_exception

    user = await User.get(PydanticObjectId(user_id))
    if user is None:
        raise invalid_token_exception
    return user
def require_role(*allowed_roles: str):
    """
    Dependency factory for role-based access, e.g.:
        Depends(require_role("administrator", "educator"))
    """
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to do this.",
            )
        return current_user
    return checker