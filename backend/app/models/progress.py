"""
Progress Record model — tracks body metrics over time.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ProgressRecord(Base):
    __tablename__ = "progress_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    record_date = Column(Date, nullable=False)
    weight = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    body_fat = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="progress_records")

    def __repr__(self):
        return f"<ProgressRecord user={self.user_id} date={self.record_date}>"
