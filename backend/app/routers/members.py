"""
Members Router — member self-service endpoints.

All endpoints here require 'member' role authentication.
Members can only access their OWN data.
"""

import json
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.membership import Membership, MembershipStatus
from app.models.membership_plan import MembershipPlan
from app.models.attendance import Attendance
from app.models.workout_plan import WorkoutPlan
from app.models.progress import ProgressRecord
from app.models.notification import Notification
from app.utils.dependencies import get_current_user
from app.schemas.auth import UserResponse, MessageResponse
from app.schemas.user import UserUpdateRequest
from app.schemas.membership import MembershipResponse
from app.schemas.dashboard import (
    MemberDashboardResponse,
    ProgressCreateRequest,
    ProgressResponse,
)
from app.services.attendance_service import AttendanceService
from app.services.notification_service import NotificationService


router = APIRouter(prefix="/members", tags=["Members"])


@router.get("/me", response_model=UserResponse)
def get_my_profile(user: User = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.value,
        status=user.status.value,
        avatar_url=user.avatar_url,
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.put("/me", response_model=MessageResponse)
def update_my_profile(
    request: UserUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the authenticated user's profile."""
    if request.full_name is not None:
        user.full_name = request.full_name
    if request.phone is not None:
        user.phone = request.phone
    if request.avatar_url is not None:
        user.avatar_url = request.avatar_url

    db.commit()
    return MessageResponse(message="Profile updated successfully")


@router.get("/me/dashboard", response_model=MemberDashboardResponse)
def get_my_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the member's dashboard data.
    
    Returns personalized info matching the member Dashboard.tsx:
    - Welcome name
    - Current plan & expiry
    - Today's check-in status
    - Monthly attendance count
    - Recent notifications
    """
    # Current plan
    active_membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == user.id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    plan_name = None
    plan_expiry = None
    if active_membership:
        plan = db.query(MembershipPlan).filter(
            MembershipPlan.id == active_membership.plan_id
        ).first()
        plan_name = plan.name if plan else None
        plan_expiry = active_membership.end_date.isoformat()

    # Today's attendance
    from datetime import timezone
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    today_attendance = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user.id,
            Attendance.check_in >= today_start,
        )
        .first()
    )

    # Monthly attendance count
    month_start = date.today().replace(day=1)
    month_start_dt = datetime.combine(month_start, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )
    from sqlalchemy import func
    attendance_count = (
        db.query(func.count(Attendance.id))
        .filter(
            Attendance.user_id == user.id,
            Attendance.check_in >= month_start_dt,
        )
        .scalar()
        or 0
    )

    # Recent notifications
    notifications = NotificationService.get_member_notifications(db=db, limit=5)

    return MemberDashboardResponse(
        user_name=user.full_name,
        plan_name=plan_name,
        plan_expiry=plan_expiry,
        today_checked_in=today_attendance is not None,
        check_in_time=today_attendance.check_in.isoformat() if today_attendance else None,
        attendance_this_month=attendance_count,
        notifications=notifications,
    )


@router.get("/me/membership", response_model=MembershipResponse)
def get_my_membership(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's current membership details."""
    from app.utils.exceptions import NotFoundException

    membership = (
        db.query(Membership)
        .filter(
            Membership.user_id == user.id,
            Membership.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    if not membership:
        raise NotFoundException("No active membership found")

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == membership.plan_id).first()

    features = None
    if plan and plan.features:
        try:
            features = json.loads(plan.features)
        except (json.JSONDecodeError, TypeError):
            features = []

    return MembershipResponse(
        id=membership.id,
        plan_name=plan.name if plan else "Unknown",
        plan_price=plan.price if plan else 0,
        start_date=membership.start_date.isoformat(),
        end_date=membership.end_date.isoformat(),
        status=membership.status.value,
        features=features,
    )


@router.get("/me/attendance")
def get_my_attendance(
    month: int = Query(None, ge=1, le=12),
    year: int = Query(None, ge=2020, le=2030),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's attendance history."""
    records = AttendanceService.get_user_attendance(
        db=db, user_id=user.id, month=month, year=year
    )
    return {"records": records, "total": len(records)}


@router.get("/me/workout")
def get_my_workout(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's assigned workout plan."""
    workout = (
        db.query(WorkoutPlan)
        .filter(WorkoutPlan.user_id == user.id)
        .order_by(WorkoutPlan.created_at.desc())
        .first()
    )

    if not workout:
        return {"message": "No workout plan assigned yet", "schedule": [], "diet_plan": None}

    schedule = []
    diet_plan = None
    try:
        if workout.schedule:
            schedule = json.loads(workout.schedule)
        if workout.diet_plan:
            diet_plan = json.loads(workout.diet_plan)
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "id": workout.id,
        "plan_name": workout.plan_name,
        "schedule": schedule,
        "diet_plan": diet_plan,
        "created_at": workout.created_at.isoformat() if workout.created_at else None,
    }


@router.get("/me/progress", response_model=list[ProgressResponse])
def get_my_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's body progress history."""
    records = (
        db.query(ProgressRecord)
        .filter(ProgressRecord.user_id == user.id)
        .order_by(ProgressRecord.record_date.desc())
        .limit(50)
        .all()
    )

    return [
        ProgressResponse(
            id=r.id,
            record_date=r.record_date.isoformat(),
            weight=r.weight,
            bmi=r.bmi,
            body_fat=r.body_fat,
            notes=r.notes,
        )
        for r in records
    ]


@router.post("/me/progress", response_model=MessageResponse)
def log_progress(
    request: ProgressCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a new body progress entry."""
    record = ProgressRecord(
        user_id=user.id,
        record_date=date.fromisoformat(request.record_date),
        weight=request.weight,
        bmi=request.bmi,
        body_fat=request.body_fat,
        notes=request.notes,
    )
    db.add(record)
    db.commit()
    return MessageResponse(message="Progress recorded successfully")


@router.get("/me/notifications")
def get_my_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notifications for the authenticated member."""
    notifications = NotificationService.get_member_notifications(db=db, limit=20)
    return {"notifications": notifications, "total": len(notifications)}
