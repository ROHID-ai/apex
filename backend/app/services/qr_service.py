"""
QR Service — generates HMAC-signed, time-limited QR tokens for attendance.

Security architecture:
- QR payload is signed with HMAC-SHA256 → can't be forged
- Contains timestamp → expires after QR_EXPIRY_SECONDS
- Contains nonce → prevents replay attacks
- Signature verified on check-in → ensures authenticity
"""

import hashlib
import hmac
import json
import time
import base64
import secrets

from app.config import settings


class QRService:

    @staticmethod
    def generate_qr_payload() -> dict:
        """
        Generate a signed QR attendance payload.
        
        The payload contains:
        - gym_id: identifies the gym
        - timestamp: when the QR was generated (Unix epoch)
        - nonce: random value to prevent replay attacks
        - signature: HMAC-SHA256 of the above data
        
        Returns:
            {
                "qr_payload": "base64-encoded-json",
                "expires_at": "ISO-8601 timestamp"
            }
        """
        timestamp = int(time.time())
        nonce = secrets.token_hex(16)  # 32-char random hex string

        # Data to sign
        data = {
            "gym_id": "gymlink",
            "timestamp": timestamp,
            "nonce": nonce,
        }

        # Create HMAC-SHA256 signature
        message = json.dumps(data, sort_keys=True).encode()
        signature = hmac.new(
            settings.QR_SECRET_KEY.encode(),
            message,
            hashlib.sha256,
        ).hexdigest()

        data["signature"] = signature

        # Base64 encode for QR
        payload_json = json.dumps(data)
        payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()

        expires_at = timestamp + settings.QR_EXPIRY_SECONDS

        return {
            "qr_payload": payload_b64,
            "expires_at": time.strftime(
                "%Y-%m-%dT%H:%M:%SZ", time.gmtime(expires_at)
            ),
        }

    @staticmethod
    def verify_qr_payload(qr_payload: str) -> dict:
        """
        Verify a QR payload's authenticity and freshness.
        
        Checks:
        1. Valid base64 and JSON structure
        2. HMAC signature matches (not forged)
        3. Timestamp is within QR_EXPIRY_SECONDS (not expired)
        
        Returns the decoded data dict if valid.
        Raises ValueError if invalid.
        """
        try:
            # Decode base64
            payload_json = base64.urlsafe_b64decode(qr_payload.encode()).decode()
            data = json.loads(payload_json)
        except Exception:
            raise ValueError("Invalid QR payload format")

        # Extract and remove signature for verification
        received_signature = data.pop("signature", None)
        if not received_signature:
            raise ValueError("QR payload missing signature")

        # Recompute HMAC
        message = json.dumps(data, sort_keys=True).encode()
        expected_signature = hmac.new(
            settings.QR_SECRET_KEY.encode(),
            message,
            hashlib.sha256,
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(received_signature, expected_signature):
            raise ValueError("Invalid QR signature — possible forgery")

        # Check expiry
        timestamp = data.get("timestamp", 0)
        current_time = int(time.time())
        if current_time - timestamp > settings.QR_EXPIRY_SECONDS:
            raise ValueError(
                f"QR code expired (was valid for {settings.QR_EXPIRY_SECONDS} seconds)"
            )

        return data

    @staticmethod
    def hash_nonce(nonce: str) -> str:
        """
        Hash the nonce for storage in the attendance record.
        We store hashes, not raw nonces, for security.
        """
        return hashlib.sha256(nonce.encode()).hexdigest()
