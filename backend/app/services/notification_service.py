"""
Notification Service — handles sending and listing notifications.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.notification import (
    Notification,
    NotificationType,
    NotificationChannel,
)
from app.utils.exceptions import NotFoundException


class NotificationService:

    @staticmethod
    def send_notification(
        db: Session,
        sender_id: str,
        title: str,
        message: str,
        notification_type: str = "announcement",
        channel: str = "app",
        target_audience: str = "all",
    ) -> Notification:
        """
        Create and 'send' a notification.
        In production, this would integrate with email/SMS providers.
        """
        notification = Notification(
            sender_id=sender_id,
            title=title,
            message=message,
            type=NotificationType(notification_type),
            channel=NotificationChannel(channel),
            target_audience=target_audience,
            is_sent=True,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)

        # TODO: In production, dispatch to email/SMS/push service here
        # if channel in ["email", "all"]:
        #     send_email(...)
        # if channel in ["sms", "all"]:
        #     send_sms(...)

        return notification

    @staticmethod
    def get_all_notifications(db: Session, limit: int = 50) -> list:
        """Get all sent notifications."""
        notifications = (
            db.query(Notification)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type.value,
                "channel": n.channel.value,
                "target_audience": n.target_audience,
                "is_sent": n.is_sent,
                "sent_at": n.sent_at.isoformat() if n.sent_at else None,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ]

    @staticmethod
    def get_member_notifications(db: Session, limit: int = 20) -> list:
        """Get notifications relevant to members (from all or their audience)."""
        notifications = (
            db.query(Notification)
            .filter(Notification.is_sent == True)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type.value,
                "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            }
            for n in notifications
        ]

    @staticmethod
    def get_stats(db: Session) -> dict:
        """Notification statistics."""
        total = db.query(func.count(Notification.id)).filter(Notification.is_sent == True).scalar() or 0
        email_sent = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.is_sent == True,
                Notification.channel.in_([NotificationChannel.EMAIL, NotificationChannel.ALL]),
            )
            .scalar()
            or 0
        )
        sms_sent = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.is_sent == True,
                Notification.channel.in_([NotificationChannel.SMS, NotificationChannel.ALL]),
            )
            .scalar()
            or 0
        )
        app_sent = (
            db.query(func.count(Notification.id))
            .filter(
                Notification.is_sent == True,
                Notification.channel.in_([NotificationChannel.APP, NotificationChannel.ALL]),
            )
            .scalar()
            or 0
        )

        return {
            "total_sent": total,
            "email_sent": email_sent,
            "sms_sent": sms_sent,
            "app_sent": app_sent,
        }
