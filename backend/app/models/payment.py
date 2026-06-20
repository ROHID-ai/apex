"""
Payment model — tracks all membership payments with status.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class PaymentStatus(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"
    FAILED = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("membership_plans.id"), nullable=False)
    membership_id = Column(String(36), ForeignKey("memberships.id"), nullable=True)
    amount = Column(Float, nullable=False)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=True)  # cash, card, upi, etc.
    payment_date = Column(Date, nullable=True)
    next_due_date = Column(Date, nullable=True)
    transaction_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="payments")
    plan = relationship("MembershipPlan", back_populates="payments")
    membership = relationship("Membership", back_populates="payments")

    def __repr__(self):
        return f"<Payment {self.id} user={self.user_id} amount={self.amount} status={self.status}>"
