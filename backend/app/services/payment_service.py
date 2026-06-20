"""
Payment Service — handles payment recording, status updates, and revenue analytics.
"""

from datetime import date, datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.payment import Payment, PaymentStatus
from app.models.membership import Membership, MembershipStatus
from app.models.membership_plan import MembershipPlan
from app.models.user import User, UserRole
from app.utils.exceptions import NotFoundException, BadRequestException


class PaymentService:

    @staticmethod
    def record_payment(
        db: Session,
        user_id: str,
        plan_id: str,
        amount: float,
        payment_method: str = "cash",
        payment_date: Optional[date] = None,
        transaction_id: Optional[str] = None,
    ) -> Payment:
        """
        Record a payment and (optionally) activate/extend membership.
        """
        # Validate user and plan exist
        user = db.query(User).filter(User.id == user_id, User.role == UserRole.MEMBER).first()
        if not user:
            raise NotFoundException("Member not found")

        plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
        if not plan:
            raise NotFoundException("Plan not found")

        pay_date = payment_date or date.today()
        next_due = pay_date + timedelta(days=plan.duration_days)

        # Create or extend membership
        active_membership = (
            db.query(Membership)
            .filter(
                Membership.user_id == user_id,
                Membership.status == MembershipStatus.ACTIVE,
            )
            .first()
        )

        if active_membership:
            # Extend existing membership
            active_membership.end_date = max(active_membership.end_date, next_due)
            active_membership.plan_id = plan_id
            membership_id = active_membership.id
        else:
            # Create new membership
            membership = Membership(
                user_id=user_id,
                plan_id=plan_id,
                start_date=pay_date,
                end_date=next_due,
                status=MembershipStatus.ACTIVE,
            )
            db.add(membership)
            db.flush()
            membership_id = membership.id

        # Record payment
        payment = Payment(
            user_id=user_id,
            plan_id=plan_id,
            membership_id=membership_id,
            amount=amount,
            status=PaymentStatus.PAID,
            payment_method=payment_method,
            payment_date=pay_date,
            next_due_date=next_due,
            transaction_id=transaction_id,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_all_payments(db: Session, status_filter: Optional[str] = None) -> list:
        """Get all payments with optional status filter."""
        query = db.query(Payment, User.full_name, MembershipPlan.name.label("plan_name")).join(
            User, Payment.user_id == User.id
        ).join(
            MembershipPlan, Payment.plan_id == MembershipPlan.id
        )

        if status_filter:
            query = query.filter(Payment.status == PaymentStatus(status_filter))

        payments = query.order_by(Payment.created_at.desc()).all()

        return [
            {
                "id": p.Payment.id,
                "user_id": p.Payment.user_id,
                "member_name": p.full_name,
                "plan_name": p.plan_name,
                "amount": p.Payment.amount,
                "status": p.Payment.status.value,
                "payment_method": p.Payment.payment_method,
                "payment_date": p.Payment.payment_date.isoformat() if p.Payment.payment_date else None,
                "next_due_date": p.Payment.next_due_date.isoformat() if p.Payment.next_due_date else None,
                "transaction_id": p.Payment.transaction_id,
            }
            for p in payments
        ]

    @staticmethod
    def get_due_payments(db: Session) -> list:
        """Get payments that are pending or overdue."""
        payments = (
            db.query(Payment, User.full_name, MembershipPlan.name.label("plan_name"))
            .join(User, Payment.user_id == User.id)
            .join(MembershipPlan, Payment.plan_id == MembershipPlan.id)
            .filter(
                Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.OVERDUE])
            )
            .order_by(Payment.next_due_date.asc())
            .all()
        )

        return [
            {
                "id": p.Payment.id,
                "user_id": p.Payment.user_id,
                "member_name": p.full_name,
                "plan_name": p.plan_name,
                "amount": p.Payment.amount,
                "status": p.Payment.status.value,
                "next_due_date": p.Payment.next_due_date.isoformat() if p.Payment.next_due_date else None,
            }
            for p in payments
        ]

    @staticmethod
    def update_payment_status(db: Session, payment_id: str, new_status: str) -> Payment:
        """Update a payment's status."""
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise NotFoundException("Payment not found")

        payment.status = PaymentStatus(new_status)
        if new_status == "paid" and not payment.payment_date:
            payment.payment_date = date.today()

        db.commit()
        db.refresh(payment)
        return payment

    @staticmethod
    def get_revenue_analytics(db: Session) -> dict:
        """Calculate revenue statistics."""
        month_start = date.today().replace(day=1)

        total_revenue = (
            db.query(func.sum(Payment.amount))
            .filter(Payment.status == PaymentStatus.PAID)
            .scalar()
            or 0.0
        )

        monthly_revenue = (
            db.query(func.sum(Payment.amount))
            .filter(
                Payment.status == PaymentStatus.PAID,
                Payment.payment_date >= month_start,
            )
            .scalar()
            or 0.0
        )

        paid_count = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.PAID).scalar() or 0
        pending_count = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.PENDING).scalar() or 0
        overdue_count = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.OVERDUE).scalar() or 0

        return {
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "paid_count": paid_count,
            "pending_count": pending_count,
            "overdue_count": overdue_count,
        }
