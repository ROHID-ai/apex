"""
Membership model — links a User to a MembershipPlan with start/end dates.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class MembershipStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    plan_id = Column(String(36), ForeignKey("membership_plans.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(SAEnum(MembershipStatus), default=MembershipStatus.ACTIVE)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="memberships")
    plan = relationship("MembershipPlan", back_populates="memberships")
    payments = relationship("Payment", back_populates="membership", lazy="dynamic")

    def __repr__(self):
        return f"<Membership user={self.user_id} plan={self.plan_id} status={self.status}>"
