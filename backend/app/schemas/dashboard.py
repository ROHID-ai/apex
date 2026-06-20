"""
Dashboard schemas — aggregated stats for admin dashboard.
"""

from pydantic import BaseModel
from typing import List, Optional


class DashboardStatsResponse(BaseModel):
    """Admin dashboard overview — matches the admin Dashboard.tsx stats cards."""
    total_members: int
    active_members: int
    today_attendance: int
    monthly_revenue: float
    pending_payments: int
    overdue_payments: int
    expiring_memberships: int  # Memberships expiring in next 7 days
    recent_members: List[dict]
    notifications: List[dict]


class MemberDashboardResponse(BaseModel):
    """Member dashboard overview — matches the member Dashboard.tsx."""
    user_name: str
    plan_name: Optional[str] = None
    plan_expiry: Optional[str] = None
    today_checked_in: bool
    check_in_time: Optional[str] = None
    attendance_this_month: int
    notifications: List[dict]


class ProgressCreateRequest(BaseModel):
    """Member logs body progress."""
    record_date: str  # YYYY-MM-DD
    weight: Optional[float] = None
    bmi: Optional[float] = None
    body_fat: Optional[float] = None
    notes: Optional[str] = None


class ProgressResponse(BaseModel):
    """Progress record response."""
    id: str
    record_date: str
    weight: Optional[float] = None
    bmi: Optional[float] = None
    body_fat: Optional[float] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
