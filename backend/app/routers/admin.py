"""
Admin Router — all admin-only operations.

Every endpoint requires the get_current_admin dependency,
which checks both JWT validity AND admin role.
"""

import json
from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.membership import Membership, MembershipStatus
from app.models.membership_plan import MembershipPlan
from app.models.attendance import Attendance
from app.models.payment import Payment, PaymentStatus
from app.models.notification import Notification
from app.utils.dependencies import get_current_admin
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserStatusUpdateRequest,
    UserDetailResponse,
    MemberListResponse,
)
from app.schemas.membership import (
    PlanCreateRequest,
    PlanUpdateRequest,
    PlanResponse,
    MembershipAssignRequest,
)
from app.schemas.auth import MessageResponse
from app.schemas.dashboard import DashboardStatsResponse
from app.services.user_service import UserService


router = APIRouter(prefix="/admin", tags=["Admin"])


# ============================================
# DASHBOARD
# ============================================

@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Get admin dashboard statistics.
    
    Returns:
    - Total/active member counts
    - Today's attendance
    - Monthly revenue
    - Pending/overdue payments
    - Expiring memberships
    - Recent members
    - Recent notifications
    """
    total_members = db.query(func.count(User.id)).filter(User.role == UserRole.MEMBER).scalar() or 0
    active_members = (
        db.query(func.count(User.id))
        .filter(User.role == UserRole.MEMBER, User.status == "active")
        .scalar()
        or 0
    )

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    today_attendance = (
        db.query(func.count(Attendance.id))
        .filter(Attendance.check_in >= today_start)
        .scalar()
        or 0
    )

    month_start = date.today().replace(day=1)
    monthly_revenue = (
        db.query(func.sum(Payment.amount))
        .filter(Payment.status == PaymentStatus.PAID, Payment.payment_date >= month_start)
        .scalar()
        or 0.0
    )

    pending_payments = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == PaymentStatus.PENDING)
        .scalar()
        or 0
    )
    overdue_payments = (
        db.query(func.count(Payment.id))
        .filter(Payment.status == PaymentStatus.OVERDUE)
        .scalar()
        or 0
    )

    expiry_threshold = date.today() + timedelta(days=7)
    expiring = (
        db.query(func.count(Membership.id))
        .filter(
            Membership.status == MembershipStatus.ACTIVE,
            Membership.end_date <= expiry_threshold,
            Membership.end_date >= date.today(),
        )
        .scalar()
        or 0
    )

    recent = (
        db.query(User)
        .filter(User.role == UserRole.MEMBER)
        .order_by(User.created_at.desc())
        .limit(5)
        .all()
    )
    recent_members = [
        {
            "id": m.id,
            "name": m.full_name,
            "email": m.email,
            "status": m.status.value,
            "joined": m.created_at.isoformat() if m.created_at else None,
        }
        for m in recent
    ]

    notifications = (
        db.query(Notification)
        .order_by(Notification.created_at.desc())
        .limit(5)
        .all()
    )
    recent_notifs = [
        {
            "id": n.id,
            "title": n.title,
            "type": n.type.value,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]

    return DashboardStatsResponse(
        total_members=total_members,
        active_members=active_members,
        today_attendance=today_attendance,
        monthly_revenue=monthly_revenue,
        pending_payments=pending_payments,
        overdue_payments=overdue_payments,
        expiring_memberships=expiring,
        recent_members=recent_members,
        notifications=recent_notifs,
    )


# ============================================
# MEMBER MANAGEMENT
# ============================================

@router.get("/members", response_model=MemberListResponse)
def list_members(
    search: str = Query(None, description="Search by name or email"),
    status: str = Query(None, description="Filter by status: active, blocked, pending"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all members with optional search and filtering."""
    result = UserService.get_all_members(
        db=db, search=search, status_filter=status, page=page, per_page=per_page
    )
    return MemberListResponse(**result)


@router.post("/members", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    request: UserCreateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new member account.
    Optionally assign a membership plan immediately.
    """
    UserService.create_member(
        db=db,
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        phone=request.phone,
        plan_id=request.plan_id,
    )
    return MessageResponse(message="Member created successfully")


@router.get("/members/{member_id}", response_model=UserDetailResponse)
def get_member(
    member_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get detailed info for a specific member."""
    member = UserService.get_member_by_id(db=db, member_id=member_id)

    active_membership = (
        db.query(Membership)
        .filter(Membership.user_id == member.id, Membership.status == MembershipStatus.ACTIVE)
        .first()
    )
    plan_name = None
    plan_expiry = None
    if active_membership:
        plan = db.query(MembershipPlan).filter(MembershipPlan.id == active_membership.plan_id).first()
        plan_name = plan.name if plan else None
        plan_expiry = active_membership.end_date.isoformat()

    return UserDetailResponse(
        id=member.id,
        email=member.email,
        full_name=member.full_name,
        phone=member.phone,
        role=member.role.value,
        status=member.status.value,
        avatar_url=member.avatar_url,
        created_at=member.created_at.isoformat() if member.created_at else None,
        current_plan=plan_name,
        plan_expiry=plan_expiry,
    )


@router.put("/members/{member_id}", response_model=MessageResponse)
def update_member(
    member_id: str,
    request: UserUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a member's profile."""
    UserService.update_member(
        db=db,
        member_id=member_id,
        full_name=request.full_name,
        phone=request.phone,
        avatar_url=request.avatar_url,
    )
    return MessageResponse(message="Member updated successfully")


@router.patch("/members/{member_id}/status", response_model=MessageResponse)
def update_member_status(
    member_id: str,
    request: UserStatusUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Block or activate a member."""
    UserService.update_member_status(db=db, member_id=member_id, new_status=request.status)
    return MessageResponse(message=f"Member status updated to {request.status}")


@router.delete("/members/{member_id}", response_model=MessageResponse)
def delete_member(
    member_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete (block) a member. We soft-delete to preserve history."""
    UserService.delete_member(db=db, member_id=member_id)
    return MessageResponse(message="Member deleted (blocked) successfully")


@router.post("/members/{member_id}/reset-password", response_model=MessageResponse)
def reset_member_password(
    member_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Reset a member's password to a temporary one."""
    temp_password = UserService.reset_member_password(db=db, member_id=member_id)
    return MessageResponse(
        message="Password reset successful",
        detail=f"Temporary password: {temp_password}",
    )


# ============================================
# MEMBERSHIP PLANS
# ============================================

@router.post("/plans", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    request: PlanCreateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new membership plan."""
    plan = MembershipPlan(
        name=request.name,
        price=request.price,
        duration_days=request.duration_days,
        features=json.dumps(request.features) if request.features else None,
    )
    db.add(plan)
    db.commit()
    return MessageResponse(message=f"Plan '{request.name}' created successfully")


@router.get("/plans", response_model=list[PlanResponse])
def list_plans(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all membership plans."""
    plans = db.query(MembershipPlan).order_by(MembershipPlan.price.asc()).all()
    result = []
    for plan in plans:
        features = None
        if plan.features:
            try:
                features = json.loads(plan.features)
            except (json.JSONDecodeError, TypeError):
                features = []
        result.append(PlanResponse(
            id=plan.id,
            name=plan.name,
            price=plan.price,
            duration_days=plan.duration_days,
            features=features,
            is_active=plan.is_active,
        ))
    return result


@router.put("/plans/{plan_id}", response_model=MessageResponse)
def update_plan(
    plan_id: str,
    request: PlanUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a membership plan."""
    from app.utils.exceptions import NotFoundException

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        raise NotFoundException("Plan not found")

    if request.name is not None:
        plan.name = request.name
    if request.price is not None:
        plan.price = request.price
    if request.duration_days is not None:
        plan.duration_days = request.duration_days
    if request.features is not None:
        plan.features = json.dumps(request.features)
    if request.is_active is not None:
        plan.is_active = request.is_active

    db.commit()
    return MessageResponse(message="Plan updated successfully")


@router.delete("/plans/{plan_id}", response_model=MessageResponse)
def delete_plan(
    plan_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a plan (soft delete)."""
    from app.utils.exceptions import NotFoundException

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
    if not plan:
        raise NotFoundException("Plan not found")

    plan.is_active = False
    db.commit()
    return MessageResponse(message="Plan deactivated successfully")


# ============================================
# MEMBERSHIP ASSIGNMENT
# ============================================

@router.post("/memberships/assign", response_model=MessageResponse)
def assign_membership(
    request: MembershipAssignRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Assign a membership plan to a member."""
    from app.utils.exceptions import NotFoundException

    user = db.query(User).filter(User.id == request.user_id, User.role == UserRole.MEMBER).first()
    if not user:
        raise NotFoundException("Member not found")

    plan = db.query(MembershipPlan).filter(MembershipPlan.id == request.plan_id).first()
    if not plan:
        raise NotFoundException("Plan not found")

    start = request.start_date or date.today()
    end = start + timedelta(days=plan.duration_days)

    # Expire any existing active membership
    existing = (
        db.query(Membership)
        .filter(Membership.user_id == request.user_id, Membership.status == MembershipStatus.ACTIVE)
        .first()
    )
    if existing:
        existing.status = MembershipStatus.EXPIRED

    membership = Membership(
        user_id=request.user_id,
        plan_id=request.plan_id,
        start_date=start,
        end_date=end,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.commit()

    return MessageResponse(message=f"Membership assigned: {plan.name} until {end.isoformat()}")
