"""
Attendance Router — QR generation, check-in/out, and analytics.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_admin, get_current_user
from app.schemas.attendance import (
    QRGenerateResponse,
    CheckInRequest,
    CheckInResponse,
    CheckOutResponse,
    AttendanceListResponse,
    AttendanceAnalyticsResponse,
)
from app.services.qr_service import QRService
from app.services.attendance_service import AttendanceService


router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ============================================
# QR CODE GENERATION (Admin only)
# ============================================

@router.get("/qr/generate", response_model=QRGenerateResponse)
def generate_qr(admin: User = Depends(get_current_admin)):
    """
    Generate a signed QR attendance token.
    
    The admin displays this QR code on a screen in the gym.
    Members scan it within 5 minutes to check in.
    
    Security features:
    - HMAC-SHA256 signed (can't be forged)
    - Time-limited (5 minutes)
    - Nonce-based (prevents replay)
    """
    result = QRService.generate_qr_payload()
    return QRGenerateResponse(**result)


# ============================================
# CHECK-IN / CHECK-OUT (Member)
# ============================================

@router.post("/check-in", response_model=CheckInResponse)
def check_in(
    request: CheckInRequest,
    http_request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark attendance by scanning the QR code.
    
    Flow:
    1. Member scans QR displayed in gym → gets qr_payload
    2. Frontend sends qr_payload + JWT to this endpoint
    3. Backend verifies: QR signature, expiry, nonce, membership, duplicates
    4. Records attendance if all checks pass
    
    Anti-fraud measures:
    - QR must be valid HMAC signature
    - QR must not be expired (5 min window)
    - QR nonce must not be reused (replay prevention)
    - Member must have active membership
    - No duplicate check-in today
    """
    # Get client IP for audit logging
    ip_address = http_request.client.host if http_request.client else None

    attendance = AttendanceService.check_in(
        db=db,
        user=user,
        qr_payload=request.qr_payload,
        ip_address=ip_address,
    )

    return CheckInResponse(
        message="Check-in successful! 💪",
        check_in_time=attendance.check_in.isoformat(),
        attendance_id=attendance.id,
    )


@router.post("/check-out", response_model=CheckOutResponse)
def check_out(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark check-out for today's session.
    Automatically calculates workout duration.
    """
    attendance = AttendanceService.check_out(db=db, user=user)

    return CheckOutResponse(
        message="Checked out successfully! Great workout! 🎉",
        check_out_time=attendance.check_out.isoformat(),
        duration_minutes=attendance.duration_minutes or 0,
    )


# ============================================
# ADMIN VIEWS
# ============================================

@router.get("/today", response_model=AttendanceListResponse)
def get_today_attendance(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get today's attendance log (admin only)."""
    records = AttendanceService.get_today_attendance(db=db)
    return AttendanceListResponse(records=records, total=len(records))


@router.get("/analytics", response_model=AttendanceAnalyticsResponse)
def get_attendance_analytics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Get attendance analytics (admin only).
    Returns today/week/month counts and daily breakdown.
    """
    analytics = AttendanceService.get_analytics(db=db)
    return AttendanceAnalyticsResponse(**analytics)
