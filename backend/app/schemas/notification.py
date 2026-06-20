"""
Notification schemas — send and list notifications.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class NotificationCreateRequest(BaseModel):
    """Admin sends a notification."""
    title: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=2, max_length=2000)
    type: str = Field(default="announcement", pattern="^(announcement|reminder|offer|alert)$")
    channel: str = Field(default="app", pattern="^(email|sms|app|all)$")
    target_audience: str = Field(default="all")  # "all", "active", "premium", etc.


class NotificationResponse(BaseModel):
    """Notification record in responses."""
    id: str
    title: str
    message: str
    type: str
    channel: str
    target_audience: str
    is_sent: bool
    sent_at: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications."""
    notifications: List[NotificationResponse]
    total: int


class NotificationStatsResponse(BaseModel):
    """Notification statistics."""
    total_sent: int
    email_sent: int
    sms_sent: int
    app_sent: int
