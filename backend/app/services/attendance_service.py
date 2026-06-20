"""
Attendance Service — handles check-in, check-out, and analytics.
"""

from datetime import datetime, date, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.models.attendance import Attendance
from app.models.membership import Membership, MembershipStatus
from app.models.membership_plan import MembershipPlan
from app.models.user import User
from app.services.qr_service import QRService
from app.utils.exceptions import BadRequestException, NotFoundException


class AttendanceService:

    @staticmethod
    def check_in(
        db: Session,
        user: User,
        qr_payload: str,
        ip_address: Optional[str] = None,
    ) -> Attendance:
        """
        Process a QR-based attendance check-in.
        
        Validates:
        1. QR payload authenticity (HMAC signature)
        2. QR not expired (time window)
        3. QR nonce not reused (replay attack prevention)
        4. User has active membership
        5. User hasn't already checked in today
        """
        # 1. Verify QR payload
        try:
            qr_data = QRService.verify_qr_payload(qr_payload)
        except ValueError as e:
            raise BadRequestException(str(e))

        nonce = qr_data.get("nonce", "")
        nonce_hash = QRService.hash_nonce(nonce)

        # 2. Check nonce not already used (replay attack prevention)
        existing_nonce = (
            db.query(Attendance)
            .filter(Attendance.qr_token_hash == nonce_hash)
            .first()
        )
        if existing_nonce:
            raise BadRequestException("QR code already used — possible replay attack")

        # 3. Check active membership
        active_membership = (
            db.query(Membership)
            .filter(
                Membership.user_id == user.id,
                Membership.status == MembershipStatus.ACTIVE,
                Membership.end_date >= date.today(),
            )
            .first()
        )
        if not active_membership:
            raise BadRequestException(
                "No active membership found. Please renew your membership."
            )

        # 4. Check for duplicate attendance today
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=timezone.utc
        )
        today_end = datetime.combine(date.today(), datetime.max.time()).replace(
            tzinfo=timezone.utc
        )

        existing_today = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user.id,
                Attendance.check_in >= today_start,
                Attendance.check_in <= today_end,
                Attendance.check_out.is_(None),  # Still checked in
            )
            .first()
        )
        if existing_today:
            raise BadRequestException("You are already checked in today")

        # 5. Create attendance record
        attendance = Attendance(
            user_id=user.id,
            check_in=datetime.now(timezone.utc),
            qr_token_hash=nonce_hash,
            ip_address=ip_address,
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance

    @staticmethod
    def check_out(db: Session, user: User) -> Attendance:
        """
        Check out the user from their current session.
        Calculates duration in minutes.
        """
        # Find today's open check-in
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=timezone.utc
        )

        attendance = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user.id,
                Attendance.check_in >= today_start,
                Attendance.check_out.is_(None),
            )
            .order_by(Attendance.check_in.desc())
            .first()
        )

        if not attendance:
            raise BadRequestException("No active check-in found for today")

        now = datetime.now(timezone.utc)
        attendance.check_out = now

        # Calculate duration
        check_in_time = attendance.check_in
        if check_in_time.tzinfo is None:
            check_in_time = check_in_time.replace(tzinfo=timezone.utc)
        duration = now - check_in_time
        attendance.duration_minutes = int(duration.total_seconds() / 60)

        db.commit()
        db.refresh(attendance)
        return attendance

    @staticmethod
    def get_today_attendance(db: Session) -> list:
        """Get all attendance records for today (admin view)."""
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=timezone.utc
        )
        today_end = datetime.combine(date.today(), datetime.max.time()).replace(
            tzinfo=timezone.utc
        )

        records = (
            db.query(Attendance, User.full_name)
            .join(User, Attendance.user_id == User.id)
            .filter(
                Attendance.check_in >= today_start,
                Attendance.check_in <= today_end,
            )
            .order_by(Attendance.check_in.desc())
            .all()
        )

        return [
            {
                "id": record.Attendance.id,
                "user_id": record.Attendance.user_id,
                "user_name": record.full_name,
                "check_in": record.Attendance.check_in.isoformat(),
                "check_out": record.Attendance.check_out.isoformat()
                if record.Attendance.check_out
                else None,
                "duration_minutes": record.Attendance.duration_minutes,
                "status": "completed" if record.Attendance.check_out else "in_gym",
            }
            for record in records
        ]

    @staticmethod
    def get_user_attendance(
        db: Session, user_id: str, month: Optional[int] = None, year: Optional[int] = None
    ) -> list:
        """Get attendance history for a specific user."""
        query = db.query(Attendance).filter(Attendance.user_id == user_id)

        if month and year:
            query = query.filter(
                extract("month", Attendance.check_in) == month,
                extract("year", Attendance.check_in) == year,
            )

        records = query.order_by(Attendance.check_in.desc()).limit(100).all()

        return [
            {
                "id": r.id,
                "user_id": r.user_id,
                "check_in": r.check_in.isoformat(),
                "check_out": r.check_out.isoformat() if r.check_out else None,
                "duration_minutes": r.duration_minutes,
                "status": "completed" if r.check_out else "in_gym",
            }
            for r in records
        ]

    @staticmethod
    def get_analytics(db: Session) -> dict:
        """
        Generate attendance analytics for admin dashboard.
        Returns today, week, month counts and daily breakdown.
        """
        now = datetime.now(timezone.utc)
        today_start = datetime.combine(date.today(), datetime.min.time()).replace(
            tzinfo=timezone.utc
        )
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        # Today's count
        today_count = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.check_in >= today_start)
            .scalar()
            or 0
        )

        # This week
        week_count = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.check_in >= week_start)
            .scalar()
            or 0
        )

        # This month
        month_count = (
            db.query(func.count(Attendance.id))
            .filter(Attendance.check_in >= month_start)
            .scalar()
            or 0
        )

        # Daily average this month
        days_elapsed = max((date.today() - month_start.date()).days, 1)
        daily_average = round(month_count / days_elapsed, 1)

        # Weekly breakdown (last 7 days)
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        weekly_breakdown = []
        for i in range(7):
            day_date = date.today() - timedelta(days=6 - i)
            day_start = datetime.combine(day_date, datetime.min.time()).replace(
                tzinfo=timezone.utc
            )
            day_end = datetime.combine(day_date, datetime.max.time()).replace(
                tzinfo=timezone.utc
            )
            count = (
                db.query(func.count(Attendance.id))
                .filter(
                    Attendance.check_in >= day_start,
                    Attendance.check_in <= day_end,
                )
                .scalar()
                or 0
            )
            weekly_breakdown.append({
                "day": day_names[day_date.weekday()],
                "count": count,
                "date": day_date.isoformat(),
            })

        return {
            "today_count": today_count,
            "week_count": week_count,
            "month_count": month_count,
            "daily_average": daily_average,
            "weekly_breakdown": weekly_breakdown,
        }
