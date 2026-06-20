"""
Payments Router — payment recording, status updates, and revenue analytics.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_admin
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentStatusUpdateRequest,
    PaymentResponse,
    PaymentListResponse,
    RevenueResponse,
)
from app.schemas.auth import MessageResponse
from app.services.payment_service import PaymentService


router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/", response_model=MessageResponse)
def record_payment(
    request: PaymentCreateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Record a new payment (admin only).
    
    This also activates/extends the member's membership automatically.
    """
    PaymentService.record_payment(
        db=db,
        user_id=request.user_id,
        plan_id=request.plan_id,
        amount=request.amount,
        payment_method=request.payment_method,
        payment_date=request.payment_date,
        transaction_id=request.transaction_id,
    )
    return MessageResponse(message="Payment recorded and membership activated")


@router.get("/", response_model=PaymentListResponse)
def list_payments(
    status: str = Query(None, description="Filter: paid, pending, overdue, failed"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all payments with optional status filter."""
    payments = PaymentService.get_all_payments(db=db, status_filter=status)
    return PaymentListResponse(payments=payments, total=len(payments))


@router.get("/due", response_model=PaymentListResponse)
def get_due_payments(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all pending and overdue payments."""
    payments = PaymentService.get_due_payments(db=db)
    return PaymentListResponse(payments=payments, total=len(payments))


@router.get("/revenue", response_model=RevenueResponse)
def get_revenue(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get revenue analytics."""
    return RevenueResponse(**PaymentService.get_revenue_analytics(db=db))


@router.patch("/{payment_id}/status", response_model=MessageResponse)
def update_payment_status(
    payment_id: str,
    request: PaymentStatusUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a payment's status."""
    PaymentService.update_payment_status(
        db=db, payment_id=payment_id, new_status=request.status
    )
    return MessageResponse(message=f"Payment status updated to {request.status}")
