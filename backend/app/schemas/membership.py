"""
Membership schemas — plans and member-plan assignments.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


# ============================================
# PLAN SCHEMAS
# ============================================

class PlanCreateRequest(BaseModel):
    """Admin creates a new membership plan."""
    name: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0)
    duration_days: int = Field(..., gt=0)
    features: Optional[List[str]] = None


class PlanUpdateRequest(BaseModel):
    """Admin updates a plan."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    duration_days: Optional[int] = Field(None, gt=0)
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PlanResponse(BaseModel):
    """Plan details in responses."""
    id: str
    name: str
    price: float
    duration_days: int
    features: Optional[List[str]] = None
    is_active: bool = True

    class Config:
        from_attributes = True


# ============================================
# MEMBERSHIP SCHEMAS
# ============================================

class MembershipAssignRequest(BaseModel):
    """Admin assigns a plan to a member."""
    user_id: str
    plan_id: str
    start_date: Optional[date] = None  # Defaults to today


class MembershipResponse(BaseModel):
    """Membership details in responses."""
    id: str
    plan_name: str
    plan_price: float
    start_date: str
    end_date: str
    status: str
    features: Optional[List[str]] = None

    class Config:
        from_attributes = True
