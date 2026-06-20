from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    # New production field (kept with legacy password for migration safety).
    hashed_password = Column(String, nullable=True)
    password = Column(String, nullable=True)
    role = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    trainer_assigned = Column(String, nullable=True)
    membership_type = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=True)
    plan = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    join_date = Column(DateTime, nullable=True)
    membership_id = Column(String, unique=True, nullable=True, index=True)

    attendance_records = relationship("Attendance", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("Workout", back_populates="member", cascade="all, delete-orphan")
    diets = relationship("DietPlan", back_populates="member", cascade="all, delete-orphan")
    membership = relationship("Membership", back_populates="member", uselist=False, cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    check_in = Column(DateTime, nullable=False)
    check_in_time = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    member_id = Column(Integer, nullable=True, index=True)
    captured_image = Column(String, nullable=True)
    check_in_device = Column(String, nullable=True)
    check_out_device = Column(String, nullable=True)
    attendance_date = Column(Date, nullable=True, index=True)
    face_verification_status = Column(String, nullable=True)
    face_verification_confidence = Column(Float, nullable=True)

    user = relationship("User", back_populates="attendance_records")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)

    user = relationship("User", back_populates="payments")


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_template_id = Column(Integer, nullable=True, index=True)
    workout_name = Column(String, nullable=True)
    trainer = Column(String, nullable=True)
    schedule = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    difficulty = Column(String, nullable=True)
    progress_status = Column(String, nullable=True)
    assignment_scope = Column(String, nullable=True)
    assignment_targets = Column(Text, nullable=True)
    assignment_groups = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True)
    # Legacy/admin template fields.
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    level = Column(String, nullable=False)
    user_count = Column(Integer, nullable=False, default=0)

    member = relationship("User", back_populates="workouts")


class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    source_template_id = Column(Integer, nullable=True, index=True)
    meal_plan = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    admin_notes = Column(Text, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    difficulty = Column(String, nullable=True)
    macros = Column(String, nullable=True)
    progress_status = Column(String, nullable=True)
    assignment_scope = Column(String, nullable=True)
    assignment_targets = Column(Text, nullable=True)
    assignment_groups = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=True)
    # Legacy/admin template fields.
    title = Column(String, nullable=False)
    calories = Column(String, nullable=False)
    user_count = Column(Integer, nullable=False, default=0)

    member = relationship("User", back_populates="diets")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    payment_status = Column(String, nullable=False, default="pending")

    member = relationship("User", back_populates="membership")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    target = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)


class AttendanceQRConfig(Base):
    __tablename__ = "attendance_qr_config"

    id = Column(Integer, primary_key=True, index=True)
    qr_version = Column(Integer, nullable=False, default=1)
    qr_secret = Column(String, nullable=False)
    rotated_at = Column(DateTime, nullable=False)
