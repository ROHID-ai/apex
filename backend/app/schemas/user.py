"""
User schemas — for member/admin profile management.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date


class UserCreateRequest(BaseModel):
    """Admin creates a new member."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    plan_id: Optional[str] = None  # Optionally assign plan on creation


class UserUpdateRequest(BaseModel):
    """Update user profile (admin or self-service)."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None


class UserStatusUpdateRequest(BaseModel):
    """Admin blocks/activates a member."""
    status: str = Field(..., pattern="^(active|blocked|pending)$")


class UserDetailResponse(BaseModel):
    """Detailed user info with membership."""
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    status: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    current_plan: Optional[str] = None
    plan_expiry: Optional[str] = None

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    """Paginated member list."""
    members: List[UserDetailResponse]
    total: int
    page: int
    per_page: int
