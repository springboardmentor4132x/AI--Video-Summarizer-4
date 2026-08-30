"""
User + role management.
Provides "/me" plus example endpoints demonstrating role-based access
for all four roles defined in the project.
"""
from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, require_role
from app.core.roles import ADMINISTRATOR, CONTENT_CREATOR, EDUCATOR, LEARNER
from app.models.user import User
from app.schemas.user import UserOut
router = APIRouter(prefix="/api/users", tags=["Users"])
def _to_out(user: User) -> UserOut:
    return UserOut(id=str(user.id), name=user.name, email=user.email, role=user.role, created_at=user.created_at)
@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return _to_out(current_user)
@router.get("/admin-only-example", response_model=UserOut)
async def admin_only_example(current_user: User = Depends(require_role(ADMINISTRATOR))):
    """Example of a route restricted to Administrator only."""
    return _to_out(current_user)
@router.get("/educator-only-example", response_model=UserOut)
async def educator_only_example(current_user: User = Depends(require_role(EDUCATOR, ADMINISTRATOR))):
    """Example of a route open to Educators and Administrators."""
    return _to_out(current_user)
@router.get("/content-creator-only-example", response_model=UserOut)
async def content_creator_only_example(current_user: User = Depends(require_role(CONTENT_CREATOR, ADMINISTRATOR))):
    """Example of a route open to Content Creators and Administrators."""
    return _to_out(current_user)
@router.get("/learner-only-example", response_model=UserOut)
async def learner_only_example(current_user: User = Depends(require_role(LEARNER, ADMINISTRATOR))):
    """Example of a route open to Learners and Administrators."""
    return _to_out(current_user)