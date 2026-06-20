"""
Auth schemas — request/response validation for login, register, tokens.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


# ============================================
# REQUEST SCHEMAS
# ============================================

class LoginRequest(BaseModel):
    """POST /auth/login — request body."""
    email: EmailStr
    password: str = Field(..., min_length=3, max_length=128)


class RegisterRequest(BaseModel):
    """POST /auth/register — request body."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)


class RefreshTokenRequest(BaseModel):
    """POST /auth/refresh — request body."""
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """POST /auth/change-password — request body."""
    current_password: str = Field(..., min_length=3)
    new_password: str = Field(..., min_length=6, max_length=128)


# ============================================
# RESPONSE SCHEMAS
# ============================================

class UserResponse(BaseModel):
    """User data returned in responses (never includes password)."""
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    status: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    """POST /auth/login — response body."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshResponse(BaseModel):
    """POST /auth/refresh — response body."""
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    """Generic success message response."""
    message: str
    detail: Optional[str] = None
