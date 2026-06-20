"""
Security utilities — JWT token creation/verification and password hashing.
This is the CORE of the authentication system.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings


# ============================================
# PASSWORD HASHING (bcrypt)
# ============================================

# bcrypt with automatic salt — industry standard
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt with auto-generated salt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ============================================
# JWT TOKEN MANAGEMENT
# ============================================

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a short-lived JWT access token.
    
    Default expiry: 15 minutes (configurable via ACCESS_TOKEN_EXPIRE_MINUTES).
    Contains: user_id (sub), role, email, unique token id (jti).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),  # Unique token ID for blacklisting
        "type": "access",
    })
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a long-lived JWT refresh token.
    
    Default expiry: 7 days (configurable via REFRESH_TOKEN_EXPIRE_DAYS).
    Used only to obtain new access tokens.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    })
    return jwt.encode(
        to_encode,
        settings.JWT_REFRESH_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate an access token.
    Returns the payload dict if valid, None if expired/invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    """
    Decode and validate a refresh token.
    Returns the payload dict if valid, None if expired/invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_REFRESH_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
