"""
Membership Plan model — defines available gym plans (Basic, Standard, Premium).
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    duration_days = Column(Integer, nullable=False)  # e.g., 30, 90, 365
    features = Column(Text, nullable=True)  # JSON string of features
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    memberships = relationship("Membership", back_populates="plan", lazy="dynamic")
    payments = relationship("Payment", back_populates="plan", lazy="dynamic")

    def __repr__(self):
        return f"<MembershipPlan {self.name} ${self.price}>"
