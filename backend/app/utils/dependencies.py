"""
FastAPI Dependencies — reusable auth checks injected via Depends().

These are used on EVERY protected route to:
1. Extract JWT from Authorization header
2. Decode and validate the token
3. Fetch the user from database
4. Check role-based permissions
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.utils.security import decode_access_token


# HTTPBearer extracts "Bearer <token>" from Authorization header
security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Core dependency — validates JWT and returns the authenticated User.
    
    Used on ALL protected routes:
        @router.get("/me")
        def get_profile(user: User = Depends(get_current_user)):
            ...
    
    Raises 401 if token is invalid/expired.
    Raises 403 if user account is blocked.
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing user ID",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Contact admin.",
        )

    return user


async def get_current_admin(
    user: User = Depends(get_current_user),
) -> User:
    """
    Admin-only dependency — requires the authenticated user to be an admin.
    
    Used on admin routes:
        @router.post("/members")
        def create_member(admin: User = Depends(get_current_admin)):
            ...
    
    Raises 403 if user is not an admin.
    """
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def get_current_member(
    user: User = Depends(get_current_user),
) -> User:
    """
    Member-only dependency — requires the authenticated user to be a member.
    
    Used on member self-service routes:
        @router.post("/check-in")
        def check_in(member: User = Depends(get_current_member)):
            ...
    
    Raises 403 if user is not a member.
    """
    if user.role != UserRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member access required",
        )
    return user
