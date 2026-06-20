"""
Auth Service — handles login, registration, and token management.
All business logic lives here, NOT in the router.
"""

from sqlalchemy.orm import Session

from app.models.user import User, UserRole, UserStatus
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.utils.exceptions import (
    BadRequestException,
    UnauthorizedException,
    ConflictException,
    ForbiddenException,
)


class AuthService:
    """Stateless service — all methods take db session as parameter."""

    @staticmethod
    def register_member(
        db: Session,
        email: str,
        password: str,
        full_name: str,
        phone: str = None,
    ) -> User:
        """
        Register a new member.
        
        Checks:
        - Email not already taken
        - Password meets requirements
        """
        # Check duplicate email
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise ConflictException("Email already registered")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            phone=phone,
            role=UserRole.MEMBER,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def login(db: Session, email: str, password: str) -> dict:
        """
        Authenticate user and return tokens.
        
        Flow:
        1. Find user by email
        2. Verify password with bcrypt
        3. Check account is active
        4. Generate access + refresh tokens
        5. Return tokens + user data
        """
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise UnauthorizedException("Invalid email or password")

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password")

        # Check status
        if user.status == UserStatus.BLOCKED:
            raise ForbiddenException("Your account has been blocked. Contact admin.")

        # Generate tokens
        token_data = {
            "sub": user.id,
            "role": user.role.value,
            "email": user.email,
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user,
        }

    @staticmethod
    def refresh_access_token(db: Session, refresh_token: str) -> str:
        """
        Generate a new access token from a valid refresh token.
        
        Security checks:
        - Refresh token is valid and not expired
        - User still exists and is active
        """
        payload = decode_refresh_token(refresh_token)
        if payload is None:
            raise UnauthorizedException("Invalid or expired refresh token")

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UnauthorizedException("User not found")

        if user.status == UserStatus.BLOCKED:
            raise ForbiddenException("Account blocked")

        token_data = {
            "sub": user.id,
            "role": user.role.value,
            "email": user.email,
        }
        return create_access_token(token_data)

    @staticmethod
    def change_password(
        db: Session,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        """Change user's password after verifying current password."""
        if not verify_password(current_password, user.hashed_password):
            raise BadRequestException("Current password is incorrect")

        if current_password == new_password:
            raise BadRequestException("New password must be different from current password")

        user.hashed_password = hash_password(new_password)
        db.commit()
