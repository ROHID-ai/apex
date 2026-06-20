"""
Workout Plan model — stores workout schedules and diet plans assigned to members.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    plan_name = Column(String(255), nullable=False)
    schedule = Column(Text, nullable=True)    # JSON string — weekly workout schedule
    diet_plan = Column(Text, nullable=True)   # JSON string — diet plan details
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="workout_plans", foreign_keys=[user_id])

    def __repr__(self):
        return f"<WorkoutPlan {self.plan_name} for user={self.user_id}>"
