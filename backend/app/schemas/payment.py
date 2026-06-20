"""
Payment schemas — payment records and revenue tracking.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class PaymentCreateRequest(BaseModel):
    """Admin records a payment."""
    user_id: str
    plan_id: str
    amount: float = Field(..., gt=0)
    payment_method: Optional[str] = "cash"
    payment_date: Optional[date] = None  # Defaults to today
    transaction_id: Optional[str] = None


class PaymentStatusUpdateRequest(BaseModel):
    """Admin updates payment status."""
    status: str = Field(..., pattern="^(paid|pending|overdue|failed)$")


class PaymentResponse(BaseModel):
    """Payment record in responses."""
    id: str
    user_id: str
    member_name: Optional[str] = None
    plan_name: Optional[str] = None
    amount: float
    status: str
    payment_method: Optional[str] = None
    payment_date: Optional[str] = None
    next_due_date: Optional[str] = None
    transaction_id: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Paginated payment list."""
    payments: List[PaymentResponse]
    total: int


class RevenueResponse(BaseModel):
    """Revenue analytics."""
    total_revenue: float
    paid_count: int
    pending_count: int
    overdue_count: int
    monthly_revenue: float
