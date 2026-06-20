"""
Logging middleware — logs every request with timing information.
"""

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("gymlink")


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs all incoming requests with:
    - HTTP method and path
    - Response status code
    - Processing time in milliseconds
    - Client IP address
    """

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate processing time
        process_time = (time.time() - start_time) * 1000  # ms

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Log the request
        logger.info(
            f"{request.method} {request.url.path} "
            f"→ {response.status_code} "
            f"({process_time:.1f}ms) "
            f"[{client_ip}]"
        )

        # Add processing time header
        response.headers["X-Process-Time"] = f"{process_time:.1f}ms"

        return response
