"""
Notification model — stores all notifications sent by admin.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
from app.database import Base
import enum


class NotificationType(str, enum.Enum):
    ANNOUNCEMENT = "announcement"
    REMINDER = "reminder"
    OFFER = "offer"
    ALERT = "alert"


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    APP = "app"
    ALL = "all"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(SAEnum(NotificationType), default=NotificationType.ANNOUNCEMENT)
    channel = Column(SAEnum(NotificationChannel), default=NotificationChannel.APP)
    target_audience = Column(String(100), default="all")  # "all", "active", "premium", etc.
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Notification {self.title} ({self.type})>"
