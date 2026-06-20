"""
Attendance schemas — QR check-in/out and attendance records.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QRGenerateResponse(BaseModel):
    """Response containing QR data for display."""
    qr_payload: str  # Base64-encoded signed payload
    expires_at: str  # ISO timestamp when QR expires


class CheckInRequest(BaseModel):
    """Member scans QR and sends this payload."""
    qr_payload: str = Field(..., min_length=10)


class CheckInResponse(BaseModel):
    """Response after successful check-in."""
    message: str
    check_in_time: str
    attendance_id: str


class CheckOutResponse(BaseModel):
    """Response after successful check-out."""
    message: str
    check_out_time: str
    duration_minutes: int


class AttendanceRecordResponse(BaseModel):
    """Single attendance record."""
    id: str
    user_id: str
    user_name: Optional[str] = None
    check_in: str
    check_out: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: str  # "in_gym" or "completed"

    class Config:
        from_attributes = True


class AttendanceListResponse(BaseModel):
    """List of attendance records."""
    records: List[AttendanceRecordResponse]
    total: int


class AttendanceAnalyticsResponse(BaseModel):
    """Attendance statistics for admin dashboard."""
    today_count: int
    week_count: int
    month_count: int
    daily_average: float
    weekly_breakdown: List[dict]  # [{day: "Mon", count: 78}, ...]
