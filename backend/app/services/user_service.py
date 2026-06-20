"""
User Service — member CRUD and admin management operations.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import date, timedelta

from app.models.user import User, UserRole, UserStatus
from app.models.membership import Membership, MembershipStatus
from app.models.membership_plan import MembershipPlan
from app.utils.security import hash_password
from app.utils.exceptions import (
    NotFoundException,
    ConflictException,
    BadRequestException,
)


class UserService:

    @staticmethod
    def get_all_members(
        db: Session,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> dict:
        """
        Get paginated list of members (admin use).
        Supports search by name/email and status filtering.
        """
        query = db.query(User).filter(User.role == UserRole.MEMBER)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.full_name.ilike(search_term)) | (User.email.ilike(search_term))
            )

        if status_filter:
            query = query.filter(User.status == status_filter)

        total = query.count()
        members = (
            query.order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        # Enrich with membership data
        result = []
        for member in members:
            active_membership = (
                db.query(Membership)
                .filter(
                    Membership.user_id == member.id,
                    Membership.status == MembershipStatus.ACTIVE,
                )
                .join(MembershipPlan)
                .first()
            )
            member_dict = {
                "id": member.id,
                "email": member.email,
                "full_name": member.full_name,
                "phone": member.phone,
                "role": member.role.value,
                "status": member.status.value,
                "avatar_url": member.avatar_url,
                "created_at": member.created_at.isoformat() if member.created_at else None,
                "current_plan": None,
                "plan_expiry": None,
            }
            if active_membership:
                plan = db.query(MembershipPlan).filter(
                    MembershipPlan.id == active_membership.plan_id
                ).first()
                member_dict["current_plan"] = plan.name if plan else None
                member_dict["plan_expiry"] = active_membership.end_date.isoformat()

            result.append(member_dict)

        return {
            "members": result,
            "total": total,
            "page": page,
            "per_page": per_page,
        }

    @staticmethod
    def get_member_by_id(db: Session, member_id: str) -> User:
        """Get a specific member by ID."""
        user = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
        if not user:
            raise NotFoundException("Member not found")
        return user

    @staticmethod
    def create_member(
        db: Session,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        plan_id: Optional[str] = None,
    ) -> User:
        """
        Admin creates a new member with optional plan assignment.
        """
        # Check duplicate
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ConflictException("Email already registered")

        member = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            phone=phone,
            role=UserRole.MEMBER,
            status=UserStatus.ACTIVE,
        )
        db.add(member)
        db.flush()  # Get the ID without committing

        # If plan_id provided, create membership
        if plan_id:
            plan = db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()
            if not plan:
                raise NotFoundException("Membership plan not found")

            membership = Membership(
                user_id=member.id,
                plan_id=plan.id,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=plan.duration_days),
                status=MembershipStatus.ACTIVE,
            )
            db.add(membership)

        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def update_member(
        db: Session,
        member_id: str,
        full_name: Optional[str] = None,
        phone: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> User:
        """Update member profile fields."""
        member = db.query(User).filter(User.id == member_id).first()
        if not member:
            raise NotFoundException("Member not found")

        if full_name is not None:
            member.full_name = full_name
        if phone is not None:
            member.phone = phone
        if avatar_url is not None:
            member.avatar_url = avatar_url

        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def update_member_status(db: Session, member_id: str, new_status: str) -> User:
        """Admin blocks/activates a member."""
        member = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
        if not member:
            raise NotFoundException("Member not found")

        member.status = UserStatus(new_status)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def delete_member(db: Session, member_id: str) -> None:
        """Soft or hard delete a member."""
        member = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
        if not member:
            raise NotFoundException("Member not found")

        # For safety, we block instead of hard delete to preserve attendance/payment history
        member.status = UserStatus.BLOCKED
        db.commit()

    @staticmethod
    def reset_member_password(db: Session, member_id: str) -> str:
        """Admin resets a member's password to a temporary one."""
        member = db.query(User).filter(User.id == member_id, User.role == UserRole.MEMBER).first()
        if not member:
            raise NotFoundException("Member not found")

        temp_password = "Gym@1234"  # In production, generate random password
        member.hashed_password = hash_password(temp_password)
        db.commit()
        return temp_password
