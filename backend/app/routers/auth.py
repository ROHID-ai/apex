"""
Auth Router — Login, Register, Refresh Token, Change Password, Logout.

These endpoints are the entry point to the entire system.
No endpoint here requires authentication except change-password and logout.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RefreshTokenRequest,
    RefreshResponse,
    ChangePasswordRequest,
    MessageResponse,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.utils.dependencies import get_current_user
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new member account.
    
    - Email must be unique
    - Password minimum 6 characters
    - Account is created with 'active' status
    """
    AuthService.register_member(
        db=db,
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        phone=request.phone,
    )
    return MessageResponse(
        message="Registration successful",
        detail="You can now login with your email and password",
    )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email and password.
    
    Returns:
    - access_token (15 min lifetime)
    - refresh_token (7 day lifetime)
    - user profile data
    
    The access_token must be sent as Bearer token on all protected API calls.
    """
    result = AuthService.login(db=db, email=request.email, password=request.password)

    user = result["user"]
    return LoginResponse(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role.value,
            status=user.status.value,
            avatar_url=user.avatar_url,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Get a new access token using a valid refresh token.
    
    Call this when the access token expires (401 response).
    The refresh token remains valid for 7 days.
    """
    new_access_token = AuthService.refresh_access_token(
        db=db, refresh_token=request.refresh_token
    )
    return RefreshResponse(access_token=new_access_token)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Change the authenticated user's password.
    
    Requires:
    - Valid access token
    - Current password verification
    - New password (min 6 chars)
    """
    AuthService.change_password(
        db=db,
        user=current_user,
        current_password=request.current_password,
        new_password=request.new_password,
    )
    return MessageResponse(message="Password changed successfully")


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """
    Logout the current user.
    
    Note: In a production system, you would blacklist the JWT token.
    For now, the frontend should discard the tokens.
    """
    # In production: Add token JTI to a blacklist (Redis)
    return MessageResponse(
        message="Logged out successfully",
        detail="Please discard your tokens on the client side",
    )
