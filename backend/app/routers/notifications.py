"""
Notifications Router — send and list notifications.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.dependencies import get_current_admin
from app.schemas.notification import (
    NotificationCreateRequest,
    NotificationListResponse,
    NotificationStatsResponse,
)
from app.schemas.auth import MessageResponse
from app.services.notification_service import NotificationService


router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/", response_model=MessageResponse)
def send_notification(
    request: NotificationCreateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Send a notification to members (admin only).
    
    Supports email, SMS, app push, or all channels.
    Target: all, active, premium, etc.
    """
    NotificationService.send_notification(
        db=db,
        sender_id=admin.id,
        title=request.title,
        message=request.message,
        notification_type=request.type,
        channel=request.channel,
        target_audience=request.target_audience,
    )
    return MessageResponse(message="Notification sent successfully")


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all sent notifications (admin only)."""
    notifications = NotificationService.get_all_notifications(db=db)
    return NotificationListResponse(notifications=notifications, total=len(notifications))


@router.get("/stats", response_model=NotificationStatsResponse)
def get_notification_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get notification statistics (admin only)."""
    return NotificationStatsResponse(**NotificationService.get_stats(db=db))
