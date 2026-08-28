import base64
import json
import logging
import os
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4
from datetime import datetime, timedelta
from typing import Any, Dict, Generator, List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import func, inspect, or_, text
from sqlalchemy.orm import Session

from database import Base, SessionLocal, DB_BACKEND, engine, migration_engine
from models import Attendance, AttendanceQRConfig, DietPlan, Membership, Notification, Payment, User, Workout

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret-in-production")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "720"))
QR_TOKEN_EXPIRE_DAYS = int(os.getenv("ATTENDANCE_QR_TOKEN_EXPIRE_DAYS", "365"))
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Gym Admin API")

logger = logging.getLogger("gym_admin_api")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
    role: str = Field(pattern="^(admin|member)$")


class AuthUser(BaseModel):
    id: int
    member_id: Optional[str] = None
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    age: Optional[int] = None
    membership_type: Optional[str] = None
    plan: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    join_date: Optional[str] = None
    membership_id: Optional[str] = None


class LoginResponse(BaseModel):
    token: str
    user: AuthUser


class MemberCreate(BaseModel):
    name: str
    email: str
    phone: str
    age: Optional[int] = None
    membership_type: Optional[str] = "Basic"
    plan: Optional[str] = "Basic"
    status: Optional[str] = "active"
    password: Optional[str] = Field(default="member123", min_length=6)


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    membership_type: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None


class MemberOut(BaseModel):
    id: int
    member_id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str]
    age: Optional[int] = None
    membership_type: Optional[str] = None
    role: str
    plan: Optional[str]
    status: str
    created_at: Optional[str] = None
    join_date: Optional[str]
    membership_id: Optional[str]


class AttendanceCheckInRequest(BaseModel):
    membership_id: str


class AttendanceLogOut(BaseModel):
    id: int
    user_id: int
    check_in: str
    check_out: Optional[str]
    duration: Optional[int]
    status: str
    member_name: str
    membership_id: str
    captured_image: Optional[str] = None
    check_in_device: Optional[str] = None
    check_out_device: Optional[str] = None


class AttendanceStatsOut(BaseModel):
    present_now: int
    today_total: int


class PaymentCreate(BaseModel):
    user_id: int
    amount: float
    method: str
    status: str = "paid"


class PaymentOut(BaseModel):
    id: int
    user_id: int
    amount: float
    method: str
    date: str
    status: str
    member_name: str


class WorkoutCreate(BaseModel):
    title: str
    category: str
    level: str
    user_count: int = 0
    workout_name: Optional[str] = None
    trainer: Optional[str] = None
    schedule: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    apply_to: Optional[str] = Field(default="all", pattern="^(all|specific|group)$")
    member_ids: List[int] = Field(default_factory=list)
    membership_groups: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)


class WorkoutOut(BaseModel):
    id: int
    title: str
    category: str
    level: str
    user_count: int
    apply_to: Optional[str] = None
    member_ids: List[int] = Field(default_factory=list)
    membership_groups: List[str] = Field(default_factory=list)
    trainer: Optional[str] = None
    schedule: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    is_active: bool = True


class DietPlanCreate(BaseModel):
    title: str
    calories: str
    meal_plan: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    macros: Optional[str] = None
    apply_to: Optional[str] = Field(default="all", pattern="^(all|specific|group)$")
    member_ids: List[int] = Field(default_factory=list)
    membership_groups: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    workout_name: Optional[str] = None
    trainer: Optional[str] = None
    schedule: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    apply_to: Optional[str] = Field(default=None, pattern="^(all|specific|group)$")
    member_ids: Optional[List[int]] = None
    membership_groups: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None


class DietPlanUpdate(BaseModel):
    title: Optional[str] = None
    calories: Optional[str] = None
    meal_plan: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    macros: Optional[str] = None
    apply_to: Optional[str] = Field(default=None, pattern="^(all|specific|group)$")
    member_ids: Optional[List[int]] = None
    membership_groups: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None


class DietPlanOut(BaseModel):
    id: int
    title: str
    calories: str
    user_count: int
    apply_to: Optional[str] = None
    member_ids: List[int] = Field(default_factory=list)
    membership_groups: List[str] = Field(default_factory=list)
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    macros: Optional[str] = None
    is_active: bool = True


class ReportSummaryOut(BaseModel):
    growth_rate: float
    total_members: int
    revenue_growth: float
    average_attendance_per_day: float


class NotificationCreate(BaseModel):
    title: str
    message: str
    platform: str
    target: str


class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class MessageResponse(BaseModel):
    message: str


class DashboardStatsOut(BaseModel):
    total_members: int
    active_members: int
    attendance_today: int
    revenue: float


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    platform: str
    target: str
    created_at: str


class MemberDashboardOut(BaseModel):
    total_visits: int
    current_plan: Optional[str]
    membership_status: str
    notification_count: int


class MemberAttendanceResponse(BaseModel):
    total_visits: int
    active_session: bool
    recent_visits: List[AttendanceLogOut]


class MarkAttendanceRequest(BaseModel):
    image_data: str = Field(min_length=50)
    enable_face_verification: bool = False


class MemberQrAttendanceRequest(BaseModel):
    qr_token: str = Field(min_length=20)
    device_info: Optional[str] = Field(default=None, max_length=255)


class AttendanceQRConfigOut(BaseModel):
    qr_version: int
    rotated_at: str
    check_in_url: str
    check_out_url: str


class LiveAttendanceMemberOut(BaseModel):
    attendance_id: int
    member_name: str
    membership_id: str
    check_in: str


class LiveAttendanceOut(BaseModel):
    active_count: int
    active_members: List[LiveAttendanceMemberOut]


class MemberQrAttendanceResult(BaseModel):
    message: str
    action: str
    status: str
    member_name: str
    occurred_at: str
    attendance_id: int
    attendance: MemberAttendanceResponse


class MembershipDetailsOut(BaseModel):
    membership_id: Optional[str]
    member_id: Optional[str]
    name: str
    email: str
    plan: Optional[str]
    membership_type: Optional[str]
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    payment_status: Optional[str] = None
    join_date: Optional[str]


class MemberProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    membership_type: Optional[str] = None


class MemberWorkoutOut(BaseModel):
    id: int
    member_id: int
    workout_name: str
    trainer: Optional[str] = None
    schedule: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    progress_status: Optional[str] = None


class MemberDietOut(BaseModel):
    id: int
    member_id: int
    meal_plan: str
    calories: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    duration_weeks: Optional[int] = None
    difficulty: Optional[str] = None
    macros: Optional[str] = None
    progress_status: Optional[str] = None


class AssignmentHistoryOut(BaseModel):
    id: str
    plan_type: str
    plan_name: str
    action: str
    scope: str
    assigned_count: int
    created_at: str


def dt_to_iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(payload: Dict[str, Any]) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_frontend_base_url() -> str:
    return FRONTEND_BASE_URL.rstrip("/")


def get_or_create_attendance_qr_config(db: Session) -> AttendanceQRConfig:
    config = db.query(AttendanceQRConfig).order_by(AttendanceQRConfig.id.asc()).first()
    if config:
        return config

    config = AttendanceQRConfig(
        qr_version=1,
        qr_secret=uuid4().hex,
        rotated_at=datetime.utcnow(),
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def create_attendance_qr_token(action: str, config: AttendanceQRConfig) -> str:
    now = datetime.utcnow()
    payload = {
        "kind": "attendance_qr",
        "action": action,
        "qr_version": config.qr_version,
        "exp": now + timedelta(days=QR_TOKEN_EXPIRE_DAYS),
        "iat": now,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def build_attendance_qr_config_response(db: Session, config: AttendanceQRConfig) -> AttendanceQRConfigOut:
    check_in_token = create_attendance_qr_token("checkin", config)
    check_out_token = create_attendance_qr_token("checkout", config)
    base_url = get_frontend_base_url()

    return AttendanceQRConfigOut(
        qr_version=config.qr_version,
        rotated_at=dt_to_iso(config.rotated_at) or "",
        check_in_url=f"{base_url}/attendance/checkin?token={quote(check_in_token)}",
        check_out_url=f"{base_url}/attendance/checkout?token={quote(check_out_token)}",
    )


def validate_attendance_qr_token(token: str, config: AttendanceQRConfig) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired QR code") from exc

    if payload.get("kind") != "attendance_qr":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid QR payload")

    action = str(payload.get("action") or "").strip().lower()
    if action not in {"checkin", "checkout"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported QR action")

    if payload.get("qr_version") != config.qr_version:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="QR code expired. Please use the latest code from reception")

    return action


def verify_password(stored_password: str, provided_password: str) -> bool:
    if not stored_password:
        return False

    # Preferred path: bcrypt hash verification.
    if stored_password.startswith("$2"):
        try:
            return pwd_context.verify(provided_password, stored_password)
        except Exception:
            logger.exception("Password hash verification failed due to malformed hash")
            return False

    # Backward compatibility for legacy plain-text rows.
    return stored_password == provided_password


def get_stored_password(user: User) -> str:
    return user.hashed_password or user.password or ""


def set_password(user: User, raw_password: str) -> None:
    hashed = pwd_context.hash(raw_password)
    user.hashed_password = hashed
    # Keep legacy column synced during migration period.
    user.password = hashed


def verify_user_password(user: User, provided_password: str) -> bool:
    return verify_password(get_stored_password(user), provided_password)


def generate_member_code(db: Session) -> str:
    next_id = db.query(User).filter(User.role == "member").count() + 1001
    while True:
        candidate = f"FIT-{next_id}"
        exists = db.query(User).filter(User.membership_id == candidate).first()
        if not exists:
            return candidate
        next_id += 1


def dumps_json_list(values: Optional[List[Any]]) -> str:
    return json.dumps(values or [])


def loads_json_list(raw: Optional[str]) -> List[Any]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def apply_member_filters(query, filters: Dict[str, Any]):
    status_filter = filters.get("status")
    if status_filter and status_filter != "all":
        query = query.filter(User.status == status_filter)

    membership_type_filter = filters.get("membership_type")
    if membership_type_filter and membership_type_filter != "all":
        query = query.filter(func.lower(func.coalesce(User.membership_type, "")) == membership_type_filter.lower())

    gender_filter = filters.get("gender")
    if gender_filter and gender_filter != "all":
        query = query.filter(func.lower(func.coalesce(User.gender, "")) == gender_filter.lower())

    trainer_filter = filters.get("trainer_assigned")
    if trainer_filter and trainer_filter != "all":
        query = query.filter(func.lower(func.coalesce(User.trainer_assigned, "")) == trainer_filter.lower())

    age_group = filters.get("age_group")
    if age_group and age_group != "all":
        if age_group == "under_18":
            query = query.filter(User.age.isnot(None), User.age < 18)
        elif age_group == "18_25":
            query = query.filter(User.age.isnot(None), User.age >= 18, User.age <= 25)
        elif age_group == "26_40":
            query = query.filter(User.age.isnot(None), User.age >= 26, User.age <= 40)
        elif age_group == "41_plus":
            query = query.filter(User.age.isnot(None), User.age >= 41)

    return query


def resolve_assignment_members(
    db: Session,
    apply_to: str,
    member_ids: List[int],
    membership_groups: List[str],
    filters: Dict[str, Any],
) -> List[User]:
    base_query = db.query(User).filter(User.role == "member")
    base_query = apply_member_filters(base_query, filters)

    if apply_to == "specific":
        if not member_ids:
            return []
        return (
            base_query
            .filter(User.id.in_(member_ids))
            .order_by(User.id.asc())
            .all()
        )

    if apply_to == "group":
        if not membership_groups:
            return []
        lowered = [g.lower() for g in membership_groups]
        return (
            base_query
            .filter(func.lower(func.coalesce(User.membership_type, User.plan, "")).in_(lowered))
            .order_by(User.id.asc())
            .all()
        )

    return base_query.order_by(User.id.asc()).all()


def build_assignment_history(db: Session, limit: int = 40) -> List[AssignmentHistoryOut]:
    events: List[AssignmentHistoryOut] = []

    workout_templates = (
        db.query(Workout)
        .filter(Workout.member_id.is_(None))
        .order_by(Workout.id.desc())
        .limit(limit)
        .all()
    )
    for row in workout_templates:
        created_at = dt_to_iso(getattr(row, "created_at", None)) or dt_to_iso(datetime.utcnow()) or ""
        events.append(
            AssignmentHistoryOut(
                id=f"workout-{row.id}",
                plan_type="workout",
                plan_name=row.title,
                action="assigned",
                scope=row.assignment_scope or "all",
                assigned_count=row.user_count,
                created_at=created_at,
            )
        )

    diet_templates = (
        db.query(DietPlan)
        .filter(DietPlan.member_id.is_(None))
        .order_by(DietPlan.id.desc())
        .limit(limit)
        .all()
    )
    for row in diet_templates:
        created_at = dt_to_iso(getattr(row, "created_at", None)) or dt_to_iso(datetime.utcnow()) or ""
        events.append(
            AssignmentHistoryOut(
                id=f"diet-{row.id}",
                plan_type="diet",
                plan_name=row.title,
                action="assigned",
                scope=row.assignment_scope or "all",
                assigned_count=row.user_count,
                created_at=created_at,
            )
        )

    return sorted(events, key=lambda event: event.created_at, reverse=True)[:limit]


def assign_workout_template_to_members(
    db: Session,
    template: Workout,
    members: List[User],
    replace_existing: bool = True,
) -> None:
    for member in members:
        if replace_existing:
            db.query(Workout).filter(
                Workout.member_id == member.id,
                Workout.source_template_id == template.id,
            ).delete()

        db.add(
            Workout(
                member_id=member.id,
                source_template_id=template.id,
                workout_name=template.workout_name or template.title,
                trainer=template.trainer,
                schedule=template.schedule,
                admin_notes=template.admin_notes,
                duration_weeks=template.duration_weeks,
                difficulty=template.difficulty or template.level,
                progress_status="not_started",
                assignment_scope=template.assignment_scope,
                assignment_targets=template.assignment_targets,
                assignment_groups=template.assignment_groups,
                is_active=template.is_active,
                created_at=datetime.utcnow(),
                title=template.title,
                category=template.category,
                level=template.level,
                user_count=1,
            )
        )


def assign_diet_template_to_members(
    db: Session,
    template: DietPlan,
    members: List[User],
    replace_existing: bool = True,
) -> None:
    for member in members:
        if replace_existing:
            db.query(DietPlan).filter(
                DietPlan.member_id == member.id,
                DietPlan.source_template_id == template.id,
            ).delete()

        db.add(
            DietPlan(
                member_id=member.id,
                source_template_id=template.id,
                meal_plan=template.meal_plan or template.title,
                calories=template.calories,
                notes=template.notes,
                admin_notes=template.admin_notes,
                duration_weeks=template.duration_weeks,
                difficulty=template.difficulty,
                macros=template.macros,
                progress_status="not_started",
                assignment_scope=template.assignment_scope,
                assignment_targets=template.assignment_targets,
                assignment_groups=template.assignment_groups,
                is_active=template.is_active,
                created_at=datetime.utcnow(),
                title=template.title,
                user_count=1,
            )
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("id")
        token_member_id = payload.get("member_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if token_member_id and user.membership_id and token_member_id != user.membership_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token identity")
    return user


def require_role(user: User, allowed_roles: List[str]) -> User:
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this resource",
        )
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    return require_role(user, ["admin"])


def get_current_member(user: User = Depends(get_current_user)) -> User:
    return require_role(user, ["member"])


def get_notification_rows(db: Session, user: User) -> List[Notification]:
    targets = ["All Members", user.name, user.email, user.membership_id or ""]
    if user.status == "active":
        targets.append("Active Members")
    else:
        targets.append("Expired Members")

    return (
        db.query(Notification)
        .filter(Notification.target.in_(targets))
        .order_by(Notification.created_at.desc())
        .all()
    )


def get_uploads_root() -> Path:
    return Path(__file__).resolve().parent / "uploads" / "attendance"


def ensure_attendance_schema() -> None:
    inspector = inspect(migration_engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("attendance")}
    except Exception:
        return

    alter_statements = []
    if "check_in_time" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN check_in_time TIMESTAMP")
    if "member_id" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN member_id INTEGER")
    if "captured_image" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN captured_image VARCHAR")
    if "check_in_device" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN check_in_device VARCHAR")
    if "check_out_device" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN check_out_device VARCHAR")
    if "attendance_date" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN attendance_date DATE")
    if "face_verification_status" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN face_verification_status VARCHAR")
    if "face_verification_confidence" not in columns:
        alter_statements.append("ALTER TABLE attendance ADD COLUMN face_verification_confidence DOUBLE PRECISION")

    with migration_engine.begin() as conn:
        for stmt in alter_statements:
            conn.execute(text(stmt))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON attendance (member_id, attendance_date)"))


def ensure_attendance_qr_schema(db: Session) -> None:
    get_or_create_attendance_qr_config(db)


def ensure_user_schema() -> None:
    inspector = inspect(migration_engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("users")}
    except Exception:
        return

    alter_statements = []
    if "hashed_password" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN hashed_password VARCHAR")
    if "age" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN age INTEGER")
    if "membership_type" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN membership_type VARCHAR")
    if "created_at" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN created_at TIMESTAMP")
    if "gender" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN gender VARCHAR")
    if "trainer_assigned" not in columns:
        alter_statements.append("ALTER TABLE users ADD COLUMN trainer_assigned VARCHAR")

    with migration_engine.begin() as conn:
        for stmt in alter_statements:
            conn.execute(text(stmt))


def ensure_workout_schema() -> None:
    inspector = inspect(migration_engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("workouts")}
    except Exception:
        return

    alter_statements = []
    if "member_id" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN member_id INTEGER")
    if "workout_name" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN workout_name VARCHAR")
    if "trainer" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN trainer VARCHAR")
    if "schedule" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN schedule VARCHAR")
    if "source_template_id" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN source_template_id INTEGER")
    if "admin_notes" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN admin_notes TEXT")
    if "duration_weeks" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN duration_weeks INTEGER")
    if "difficulty" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN difficulty VARCHAR")
    if "progress_status" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN progress_status VARCHAR")
    if "assignment_scope" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN assignment_scope VARCHAR")
    if "assignment_targets" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN assignment_targets TEXT")
    if "assignment_groups" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN assignment_groups TEXT")
    if "is_active" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
    if "created_at" not in columns:
        alter_statements.append("ALTER TABLE workouts ADD COLUMN created_at TIMESTAMP")

    with migration_engine.begin() as conn:
        for stmt in alter_statements:
            conn.execute(text(stmt))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workouts_member_id ON workouts (member_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_workouts_source_template_id ON workouts (source_template_id)"))


def ensure_diet_schema() -> None:
    inspector = inspect(migration_engine)
    try:
        columns = {col["name"] for col in inspector.get_columns("diet_plans")}
    except Exception:
        return

    alter_statements = []
    if "member_id" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN member_id INTEGER")
    if "meal_plan" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN meal_plan VARCHAR")
    if "notes" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN notes VARCHAR")
    if "source_template_id" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN source_template_id INTEGER")
    if "admin_notes" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN admin_notes TEXT")
    if "duration_weeks" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN duration_weeks INTEGER")
    if "difficulty" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN difficulty VARCHAR")
    if "macros" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN macros VARCHAR")
    if "progress_status" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN progress_status VARCHAR")
    if "assignment_scope" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN assignment_scope VARCHAR")
    if "assignment_targets" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN assignment_targets TEXT")
    if "assignment_groups" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN assignment_groups TEXT")
    if "is_active" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
    if "created_at" not in columns:
        alter_statements.append("ALTER TABLE diet_plans ADD COLUMN created_at TIMESTAMP")

    with migration_engine.begin() as conn:
        for stmt in alter_statements:
            conn.execute(text(stmt))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_diet_plans_member_id ON diet_plans (member_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_diet_plans_source_template_id ON diet_plans (source_template_id)"))


def ensure_membership_schema() -> None:
    inspector = inspect(migration_engine)
    try:
        has_table = "memberships" in inspector.get_table_names()
    except Exception:
        return

    with migration_engine.begin() as conn:
        if not has_table:
            conn.execute(
                text(
                    """
                    CREATE TABLE memberships (
                        id SERIAL PRIMARY KEY,
                        member_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        start_date TIMESTAMP NOT NULL,
                        end_date TIMESTAMP,
                        payment_status VARCHAR NOT NULL DEFAULT 'pending'
                    )
                    """
                )
            )
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships (member_id)"))


def decode_data_url(image_data: str) -> tuple[bytes, str]:
    if not image_data.startswith("data:image/") or ";base64," not in image_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image payload")

    header, encoded = image_data.split(",", 1)
    mime = header.split(";")[0].replace("data:", "")
    extension = mime.split("/")[-1].lower()
    if extension == "jpeg":
        extension = "jpg"
    if extension not in {"jpg", "png", "webp"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format")

    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image encoding") from exc

    if len(decoded) < 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Captured image is too small")
    return decoded, extension


def run_face_verification_placeholder(user: User, image_path: str, enabled: bool) -> dict[str, Any]:
    # Placeholder architecture for future AI model integration.
    if not enabled:
        return {"status": "not_requested", "confidence": None}
    return {
        "status": "pending_model_integration",
        "confidence": None,
        "metadata": {
            "member_id": user.id,
            "image_path": image_path,
            "strategy": "embedding-comparison",
        },
    }


def build_member_attendance_response(user: User, db: Session) -> MemberAttendanceResponse:
    rows = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id)
        .order_by(Attendance.check_in.desc())
        .limit(25)
        .all()
    )
    total_visits = db.query(Attendance).filter(Attendance.user_id == user.id).count()
    active_session = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id, Attendance.check_out.is_(None))
        .count()
        > 0
    )

    return MemberAttendanceResponse(
        total_visits=total_visits,
        active_session=active_session,
        recent_visits=[
            AttendanceLogOut(
                id=attendance.id,
                user_id=attendance.user_id,
                check_in=dt_to_iso(attendance.check_in) or "",
                check_out=dt_to_iso(attendance.check_out),
                duration=attendance.duration,
                status=attendance.status,
                member_name=user.name,
                membership_id=user.membership_id or "",
                captured_image=attendance.captured_image,
                check_in_device=attendance.check_in_device,
                check_out_device=attendance.check_out_device,
            )
            for attendance in rows
        ],
    )


def seed_database(db: Session) -> None:
    now = datetime.utcnow()
    admin = db.query(User).filter(User.email == "admin@gym.com").first()
    if not admin:
        admin = User(
            name="Admin",
            email="admin@gym.com",
            role="admin",
            phone="",
            age=None,
            membership_type="Admin",
            created_at=now,
            plan="",
            status="active",
            join_date=now,
            membership_id="ADMIN-0001",
        )
        set_password(admin, "admin123")
        db.add(admin)
        logger.info("Seeded default admin user: admin@gym.com")

    # Backfill new auth/profile columns for legacy users.
    users = db.query(User).all()
    for user in users:
        normalized_role = (user.role or "").strip().lower()
        if normalized_role in {"admin", "member"} and user.role != normalized_role:
            user.role = normalized_role

        # Normalize legacy password columns into bcrypt hashes.
        if not user.hashed_password and user.password:
            if user.password.startswith("$2"):
                user.hashed_password = user.password
            else:
                set_password(user, user.password)
        elif user.hashed_password and not user.hashed_password.startswith("$2"):
            set_password(user, user.hashed_password)
        elif user.hashed_password and user.password != user.hashed_password:
            user.password = user.hashed_password

        if not user.created_at:
            user.created_at = user.join_date or now
        if user.role == "member" and not user.membership_type:
            user.membership_type = user.plan or "Basic"

    if db.query(Workout).count() == 0:
        db.add_all(
            [
                Workout(
                    title="Weight Loss Basic",
                    workout_name="Weight Loss Basic",
                    category="Fat Loss",
                    level="Beginner",
                    difficulty="Beginner",
                    assignment_scope="all",
                    user_count=45,
                    is_active=True,
                    created_at=now,
                ),
                Workout(
                    title="Muscle Gain Pro",
                    workout_name="Muscle Gain Pro",
                    category="Bodybuilding",
                    level="Advanced",
                    difficulty="Advanced",
                    assignment_scope="all",
                    user_count=32,
                    is_active=True,
                    created_at=now,
                ),
            ]
        )
        logger.info("Seeded default workout plans")

    if db.query(DietPlan).count() == 0:
        db.add_all(
            [
                DietPlan(
                    title="Keto Starter",
                    meal_plan="Keto Starter",
                    calories="1800 kcal",
                    assignment_scope="all",
                    user_count=28,
                    is_active=True,
                    created_at=now,
                ),
                DietPlan(
                    title="High Protein Bulk",
                    meal_plan="High Protein Bulk",
                    calories="3200 kcal",
                    assignment_scope="all",
                    user_count=35,
                    is_active=True,
                    created_at=now,
                ),
            ]
        )
        logger.info("Seeded default diet plans")

    members = db.query(User).filter(User.role == "member").all()
    for member in members:
        membership = db.query(Membership).filter(Membership.member_id == member.id).first()
        if not membership:
            start_date = member.join_date or now
            db.add(
                Membership(
                    member_id=member.id,
                    start_date=start_date,
                    end_date=start_date + timedelta(days=30),
                    payment_status="paid" if member.status == "active" else "pending",
                )
            )

        member_workout = db.query(Workout).filter(Workout.member_id == member.id).first()
        if not member_workout:
            db.add(
                Workout(
                    member_id=member.id,
                    source_template_id=None,
                    workout_name="Starter Strength Plan",
                    trainer="Assigned Trainer",
                    schedule="Mon/Wed/Fri - 7:00 AM",
                    admin_notes="Focus on form and progressive overload.",
                    duration_weeks=8,
                    difficulty="Beginner",
                    assignment_scope="specific",
                    assignment_targets=dumps_json_list([member.id]),
                    assignment_groups=dumps_json_list([]),
                    is_active=True,
                    created_at=now,
                    title="Starter Strength Plan",
                    category="General Fitness",
                    level="Beginner",
                    user_count=1,
                )
            )

        member_diet = db.query(DietPlan).filter(DietPlan.member_id == member.id).first()
        if not member_diet:
            db.add(
                DietPlan(
                    member_id=member.id,
                    source_template_id=None,
                    meal_plan="Balanced High Protein",
                    calories="2200 kcal",
                    notes="Personalized starter diet based on onboarding details.",
                    admin_notes="Hydration target: 3L/day.",
                    duration_weeks=8,
                    difficulty="Beginner",
                    macros="Protein 35% / Carbs 40% / Fat 25%",
                    assignment_scope="specific",
                    assignment_targets=dumps_json_list([member.id]),
                    assignment_groups=dumps_json_list([]),
                    is_active=True,
                    created_at=now,
                    title="Balanced High Protein",
                    user_count=1,
                )
            )

    db.commit()


@app.on_event("startup")
def startup_event() -> None:
    logger.info("Starting API and checking database connection (%s)", DB_BACKEND)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error(
            "Database connection failed. For Supabase, set the correct DB_PASSWORD in "
            "fastapi_server/.env (Supabase -> Project Settings -> Database). "
            "Temporary local fallback: USE_LOCAL_DB=true"
        )
        raise exc
    logger.info("Database connection established")

    Base.metadata.create_all(bind=migration_engine)
    ensure_user_schema()
    ensure_attendance_schema()
    ensure_workout_schema()
    ensure_diet_schema()
    ensure_membership_schema()
    get_uploads_root().mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        seed_database(db)
        ensure_attendance_qr_schema(db)
        users_total = db.query(User).count()
        admins_total = db.query(User).filter(User.role == "admin").count()
        members_total = db.query(User).filter(User.role == "member").count()
        logger.info(
            "Database ready: users=%s admins=%s members=%s",
            users_total,
            admins_total,
            members_total,
        )
    finally:
        db.close()


@app.post("/api/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    normalized_email = payload.email.strip().lower()
    normalized_role = payload.role.strip().lower()

    logger.info("Login attempt: email=%s role=%s", normalized_email, normalized_role)

    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user:
        logger.warning("Login denied: email not found (%s)", normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_user_password(user, payload.password):
        logger.warning("Login denied: wrong password for email=%s", normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Opportunistically migrate legacy plain-text password rows to bcrypt once verified.
    stored_password = get_stored_password(user)
    if stored_password and not stored_password.startswith("$2"):
        set_password(user, payload.password)
        db.commit()
        db.refresh(user)
        logger.info("Upgraded legacy password hash for user_id=%s", user.id)

    user_role_normalized = (user.role or "").strip().lower()
    if user_role_normalized != normalized_role:
        logger.warning("Login denied: role mismatch for email=%s (account=%s, requested=%s)", normalized_email, user_role_normalized, normalized_role)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account must log in as {user_role_normalized or 'member'}",
        )

    logger.info("Login success: user_id=%s role=%s", user.id, user.role)
    token = create_token({"id": user.id, "member_id": user.membership_id, "role": user.role})
    return LoginResponse(
        token=token,
        user=AuthUser(
            id=user.id,
            member_id=user.membership_id,
            name=user.name,
            email=user.email,
            role=user.role,
            phone=user.phone,
            age=user.age,
            membership_type=user.membership_type,
            plan=user.plan,
            status=user.status,
            created_at=dt_to_iso(user.created_at),
            join_date=dt_to_iso(user.join_date),
            membership_id=user.membership_id,
        ),
    )


@app.get("/api/admin/members", response_model=List[MemberOut])
@app.get("/api/members", response_model=List[MemberOut])
def get_members(search: str = "", _: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[MemberOut]:
    term = f"%{search.lower()}%"
    members = (
        db.query(User)
        .filter(
            User.role == "member",
            or_(
                func.lower(User.name).like(term),
                func.lower(User.email).like(term),
                func.lower(func.coalesce(User.phone, "")).like(term),
            ),
        )
        .order_by(User.id.desc())
        .all()
    )

    return [
        MemberOut(
            id=member.id,
            member_id=member.membership_id,
            name=member.name,
            email=member.email,
            phone=member.phone,
            age=member.age,
            membership_type=member.membership_type,
            role=member.role,
            plan=member.plan,
            status=member.status,
            created_at=dt_to_iso(member.created_at),
            join_date=dt_to_iso(member.join_date),
            membership_id=member.membership_id,
        )
        for member in members
    ]


@app.get("/api/admin/members/assignment-candidates", response_model=List[MemberOut])
def get_assignment_candidates(
    search: str = "",
    status_filter: str = "all",
    membership_type: str = "all",
    gender: str = "all",
    trainer_assigned: str = "all",
    age_group: str = "all",
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> List[MemberOut]:
    query = db.query(User).filter(User.role == "member")

    if search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(term),
                func.lower(User.email).like(term),
                func.lower(func.coalesce(User.phone, "")).like(term),
                func.lower(func.coalesce(User.membership_id, "")).like(term),
            )
        )

    query = apply_member_filters(
        query,
        {
            "status": status_filter,
            "membership_type": membership_type,
            "gender": gender,
            "trainer_assigned": trainer_assigned,
            "age_group": age_group,
        },
    )

    members = query.order_by(User.name.asc()).all()
    return [
        MemberOut(
            id=member.id,
            member_id=member.membership_id,
            name=member.name,
            email=member.email,
            phone=member.phone,
            age=member.age,
            membership_type=member.membership_type,
            role=member.role,
            plan=member.plan,
            status=member.status,
            created_at=dt_to_iso(member.created_at),
            join_date=dt_to_iso(member.join_date),
            membership_id=member.membership_id,
        )
        for member in members
    ]


@app.post("/api/admin/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
@app.post("/api/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(payload: MemberCreate, _: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> MemberOut:
    normalized_email = payload.email.strip().lower()
    exists = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    membership_id = generate_member_code(db)
    now = datetime.utcnow()

    member = User(
        name=payload.name,
        email=normalized_email,
        role="member",
        phone=payload.phone,
        age=payload.age,
        membership_type=payload.membership_type or payload.plan or "Basic",
        created_at=now,
        plan=payload.plan,
        status=payload.status or "active",
        join_date=now,
        membership_id=membership_id,
    )
    set_password(member, payload.password or "member123")
    db.add(member)
    db.flush()

    db.add(
        Membership(
            member_id=member.id,
            start_date=now,
            end_date=now + timedelta(days=30),
            payment_status="paid" if member.status == "active" else "pending",
        )
    )

    db.add(
        Workout(
            member_id=member.id,
            workout_name="Starter Strength Plan",
            trainer="Assigned Trainer",
            schedule="Mon/Wed/Fri - 7:00 AM",
            title="Starter Strength Plan",
            category="General Fitness",
            level="Beginner",
            user_count=1,
        )
    )
    db.add(
        DietPlan(
            member_id=member.id,
            meal_plan="Balanced High Protein",
            calories="2200 kcal",
            notes="Personalized starter diet based on onboarding details.",
            title="Balanced High Protein",
            user_count=1,
        )
    )

    db.commit()
    db.refresh(member)

    return MemberOut(
        id=member.id,
        member_id=member.membership_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        age=member.age,
        membership_type=member.membership_type,
        role=member.role,
        plan=member.plan,
        status=member.status,
        created_at=dt_to_iso(member.created_at),
        join_date=dt_to_iso(member.join_date),
        membership_id=member.membership_id,
    )


@app.put("/api/admin/members/{member_id}", response_model=MemberOut)
@app.put("/api/members/{member_id}", response_model=MemberOut)
def update_member(
    member_id: int,
    payload: MemberUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MemberOut:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update payload")

    if "email" in updates and updates["email"]:
        updates["email"] = updates["email"].strip().lower()
        exists = (
            db.query(User)
            .filter(func.lower(User.email) == updates["email"], User.id != member_id)
            .first()
        )
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    member = db.query(User).filter(User.id == member_id, User.role == "member").first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    for key, value in updates.items():
        setattr(member, key, value)

    if payload.membership_type:
        member.plan = payload.membership_type

    membership = db.query(Membership).filter(Membership.member_id == member.id).first()
    if membership and payload.status:
        membership.payment_status = "paid" if payload.status == "active" else "pending"

    db.commit()
    db.refresh(member)

    return MemberOut(
        id=member.id,
        member_id=member.membership_id,
        name=member.name,
        email=member.email,
        phone=member.phone,
        age=member.age,
        membership_type=member.membership_type,
        role=member.role,
        plan=member.plan,
        status=member.status,
        created_at=dt_to_iso(member.created_at),
        join_date=dt_to_iso(member.join_date),
        membership_id=member.membership_id,
    )


@app.delete("/api/admin/members/{member_id}", response_model=MessageResponse)
@app.delete("/api/members/{member_id}", response_model=MessageResponse)
def delete_member(member_id: int, _: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> MessageResponse:
    member = db.query(User).filter(User.id == member_id, User.role == "member").first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    db.delete(member)
    db.commit()
    return MessageResponse(message="Member removed")


@app.post("/api/attendance/checkin", response_model=MessageResponse)
def attendance_checkin(
    payload: AttendanceCheckInRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    member = (
        db.query(User)
        .filter(User.membership_id == payload.membership_id, User.role == "member")
        .first()
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    active = (
        db.query(Attendance)
        .filter(Attendance.user_id == member.id, Attendance.check_out.is_(None))
        .first()
    )
    if active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Member already checked in")

    attendance = Attendance(
        user_id=member.id,
        member_id=member.id,
        check_in=datetime.utcnow(),
        check_in_time=datetime.utcnow(),
        status="present",
        attendance_date=datetime.utcnow().date(),
    )
    db.add(attendance)
    db.commit()

    return MessageResponse(message=f"Check-in successful for {member.name}")


@app.get("/api/attendance/logs", response_model=List[AttendanceLogOut])
def attendance_logs(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[AttendanceLogOut]:
    rows = (
        db.query(Attendance, User.name.label("member_name"), User.membership_id)
        .join(User, User.id == Attendance.user_id)
        .order_by(Attendance.check_in.desc())
        .limit(100)
        .all()
    )

    return [
        AttendanceLogOut(
            id=attendance.id,
            user_id=attendance.user_id,
            check_in=dt_to_iso(attendance.check_in) or "",
            check_out=dt_to_iso(attendance.check_out),
            duration=attendance.duration,
            status=attendance.status,
            member_name=member_name,
            membership_id=membership_id or "",
            captured_image=attendance.captured_image,
            check_in_device=attendance.check_in_device,
            check_out_device=attendance.check_out_device,
        )
        for attendance, member_name, membership_id in rows
    ]


@app.get("/api/attendance/stats", response_model=AttendanceStatsOut)
def attendance_stats(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> AttendanceStatsOut:
    today = datetime.utcnow().date()
    present_now = db.query(Attendance).filter(Attendance.check_out.is_(None)).count()
    today_total = db.query(Attendance).filter(func.date(Attendance.check_in) == today).count()

    return AttendanceStatsOut(present_now=present_now, today_total=today_total)


@app.get("/api/attendance/qr/config", response_model=AttendanceQRConfigOut)
def get_attendance_qr_config(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> AttendanceQRConfigOut:
    config = get_or_create_attendance_qr_config(db)
    return build_attendance_qr_config_response(db, config)


@app.post("/api/attendance/qr/refresh", response_model=AttendanceQRConfigOut)
def refresh_attendance_qr(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> AttendanceQRConfigOut:
    config = get_or_create_attendance_qr_config(db)
    config.qr_version = (config.qr_version or 1) + 1
    config.qr_secret = uuid4().hex
    config.rotated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    return build_attendance_qr_config_response(db, config)


@app.get("/api/attendance/live", response_model=LiveAttendanceOut)
def get_live_attendance(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> LiveAttendanceOut:
    rows = (
        db.query(Attendance, User.name.label("member_name"), User.membership_id)
        .join(User, User.id == Attendance.user_id)
        .filter(Attendance.check_out.is_(None))
        .order_by(Attendance.check_in.desc())
        .limit(50)
        .all()
    )

    members = [
        LiveAttendanceMemberOut(
            attendance_id=attendance.id,
            member_name=member_name,
            membership_id=membership_id or "",
            check_in=dt_to_iso(attendance.check_in) or "",
        )
        for attendance, member_name, membership_id in rows
    ]

    return LiveAttendanceOut(active_count=len(members), active_members=members)


@app.get("/api/payments", response_model=List[PaymentOut])
def get_payments(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[PaymentOut]:
    rows = (
        db.query(Payment, User.name.label("member_name"))
        .join(User, User.id == Payment.user_id)
        .order_by(Payment.date.desc())
        .all()
    )

    return [
        PaymentOut(
            id=payment.id,
            user_id=payment.user_id,
            amount=payment.amount,
            method=payment.method,
            date=dt_to_iso(payment.date) or "",
            status=payment.status,
            member_name=member_name,
        )
        for payment, member_name in rows
    ]


@app.post("/api/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    member = db.query(User).filter(User.id == payload.user_id, User.role == "member").first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    payment = Payment(
        user_id=payload.user_id,
        amount=payload.amount,
        method=payload.method,
        date=datetime.utcnow(),
        status=payload.status,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return PaymentOut(
        id=payment.id,
        user_id=payment.user_id,
        amount=payment.amount,
        method=payment.method,
        date=dt_to_iso(payment.date) or "",
        status=payment.status,
        member_name=member.name,
    )


@app.get("/api/workouts", response_model=List[WorkoutOut])
def get_workouts(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[WorkoutOut]:
    rows = (
        db.query(Workout)
        .filter(Workout.member_id.is_(None))
        .order_by(Workout.id.desc())
        .all()
    )
    return [
        WorkoutOut(
            id=row.id,
            title=row.title,
            category=row.category,
            level=row.level,
            user_count=row.user_count,
            apply_to=row.assignment_scope,
            member_ids=[int(v) for v in loads_json_list(row.assignment_targets)],
            membership_groups=[str(v) for v in loads_json_list(row.assignment_groups)],
            trainer=row.trainer,
            schedule=row.schedule,
            admin_notes=row.admin_notes,
            duration_weeks=row.duration_weeks,
            difficulty=row.difficulty,
            is_active=bool(row.is_active),
        )
        for row in rows
    ]


@app.post("/api/workouts", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def create_workout(
    payload: WorkoutCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> WorkoutOut:
    apply_to = payload.apply_to or "all"
    target_members = resolve_assignment_members(
        db,
        apply_to=apply_to,
        member_ids=payload.member_ids,
        membership_groups=payload.membership_groups,
        filters=payload.filters or {},
    )

    workout = Workout(
        member_id=None,
        source_template_id=None,
        workout_name=payload.workout_name or payload.title,
        trainer=payload.trainer,
        schedule=payload.schedule,
        admin_notes=payload.admin_notes,
        duration_weeks=payload.duration_weeks,
        difficulty=payload.difficulty or payload.level,
        progress_status=None,
        assignment_scope=apply_to,
        assignment_targets=dumps_json_list([member.id for member in target_members]),
        assignment_groups=dumps_json_list(payload.membership_groups),
        is_active=True,
        created_at=datetime.utcnow(),
        title=payload.title,
        category=payload.category,
        level=payload.level,
        user_count=len(target_members) if target_members else payload.user_count,
    )
    db.add(workout)
    db.flush()

    if target_members:
        assign_workout_template_to_members(db, workout, target_members, replace_existing=True)

    db.commit()
    db.refresh(workout)

    return WorkoutOut(
        id=workout.id,
        title=workout.title,
        category=workout.category,
        level=workout.level,
        user_count=workout.user_count,
        apply_to=workout.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(workout.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(workout.assignment_groups)],
        trainer=workout.trainer,
        schedule=workout.schedule,
        admin_notes=workout.admin_notes,
        duration_weeks=workout.duration_weeks,
        difficulty=workout.difficulty,
        is_active=bool(workout.is_active),
    )


@app.put("/api/workouts/{workout_id}", response_model=WorkoutOut)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> WorkoutOut:
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.member_id.is_(None)).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    updates = payload.model_dump(exclude_unset=True)
    reassign = False

    for key, value in updates.items():
        if key in {"member_ids", "membership_groups", "filters", "apply_to"}:
            reassign = True
            continue
        setattr(workout, key, value)

    if payload.workout_name:
        workout.title = payload.workout_name

    apply_to = payload.apply_to or workout.assignment_scope or "all"
    member_ids = payload.member_ids if payload.member_ids is not None else [int(v) for v in loads_json_list(workout.assignment_targets)]
    groups = payload.membership_groups if payload.membership_groups is not None else [str(v) for v in loads_json_list(workout.assignment_groups)]
    filters = payload.filters or {}

    target_members = resolve_assignment_members(db, apply_to, member_ids, groups, filters)
    workout.assignment_scope = apply_to
    workout.assignment_targets = dumps_json_list([member.id for member in target_members])
    workout.assignment_groups = dumps_json_list(groups)
    workout.user_count = len(target_members)

    if reassign or updates:
        db.query(Workout).filter(
            Workout.source_template_id == workout.id,
            Workout.member_id.isnot(None),
        ).delete()
        assign_workout_template_to_members(db, workout, target_members, replace_existing=False)

    db.commit()
    db.refresh(workout)

    return WorkoutOut(
        id=workout.id,
        title=workout.title,
        category=workout.category,
        level=workout.level,
        user_count=workout.user_count,
        apply_to=workout.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(workout.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(workout.assignment_groups)],
        trainer=workout.trainer,
        schedule=workout.schedule,
        admin_notes=workout.admin_notes,
        duration_weeks=workout.duration_weeks,
        difficulty=workout.difficulty,
        is_active=bool(workout.is_active),
    )


@app.post("/api/workouts/{workout_id}/duplicate", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED)
def duplicate_workout(
    workout_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> WorkoutOut:
    existing = db.query(Workout).filter(Workout.id == workout_id, Workout.member_id.is_(None)).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    target_ids = [int(v) for v in loads_json_list(existing.assignment_targets)]
    target_members = db.query(User).filter(User.role == "member", User.id.in_(target_ids)).all() if target_ids else []

    duplicated = Workout(
        title=f"{existing.title} Copy",
        category=existing.category,
        level=existing.level,
        workout_name=existing.workout_name,
        trainer=existing.trainer,
        schedule=existing.schedule,
        admin_notes=existing.admin_notes,
        duration_weeks=existing.duration_weeks,
        difficulty=existing.difficulty,
        assignment_scope=existing.assignment_scope,
        assignment_targets=existing.assignment_targets,
        assignment_groups=existing.assignment_groups,
        is_active=existing.is_active,
        created_at=datetime.utcnow(),
        user_count=len(target_members),
    )
    db.add(duplicated)
    db.flush()

    if target_members:
        assign_workout_template_to_members(db, duplicated, target_members, replace_existing=False)

    db.commit()
    db.refresh(duplicated)

    return WorkoutOut(
        id=duplicated.id,
        title=duplicated.title,
        category=duplicated.category,
        level=duplicated.level,
        user_count=duplicated.user_count,
        apply_to=duplicated.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(duplicated.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(duplicated.assignment_groups)],
        trainer=duplicated.trainer,
        schedule=duplicated.schedule,
        admin_notes=duplicated.admin_notes,
        duration_weeks=duplicated.duration_weeks,
        difficulty=duplicated.difficulty,
        is_active=bool(duplicated.is_active),
    )


@app.patch("/api/workouts/{workout_id}/toggle", response_model=MessageResponse)
def toggle_workout_status(
    workout_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.member_id.is_(None)).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    workout.is_active = not bool(workout.is_active)
    db.query(Workout).filter(Workout.source_template_id == workout.id).update({"is_active": workout.is_active})
    db.commit()
    return MessageResponse(message=f"Workout {'activated' if workout.is_active else 'deactivated'}")


@app.delete("/api/workouts/{workout_id}", response_model=MessageResponse)
def delete_workout(workout_id: int, _: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> MessageResponse:
    workout = db.query(Workout).filter(Workout.id == workout_id, Workout.member_id.is_(None)).first()
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    db.query(Workout).filter(Workout.source_template_id == workout.id).delete()
    db.delete(workout)
    db.commit()
    return MessageResponse(message="Workout removed")


@app.get("/api/diet-plans", response_model=List[DietPlanOut])
def get_diet_plans(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[DietPlanOut]:
    rows = (
        db.query(DietPlan)
        .filter(DietPlan.member_id.is_(None))
        .order_by(DietPlan.id.desc())
        .all()
    )
    return [
        DietPlanOut(
            id=row.id,
            title=row.title,
            calories=row.calories,
            user_count=row.user_count,
            apply_to=row.assignment_scope,
            member_ids=[int(v) for v in loads_json_list(row.assignment_targets)],
            membership_groups=[str(v) for v in loads_json_list(row.assignment_groups)],
            admin_notes=row.admin_notes,
            duration_weeks=row.duration_weeks,
            difficulty=row.difficulty,
            macros=row.macros,
            is_active=bool(row.is_active),
        )
        for row in rows
    ]


@app.post("/api/diet-plans", response_model=DietPlanOut, status_code=status.HTTP_201_CREATED)
def create_diet_plan(
    payload: DietPlanCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DietPlanOut:
    apply_to = payload.apply_to or "all"
    target_members = resolve_assignment_members(
        db,
        apply_to=apply_to,
        member_ids=payload.member_ids,
        membership_groups=payload.membership_groups,
        filters=payload.filters or {},
    )

    diet = DietPlan(
        member_id=None,
        source_template_id=None,
        title=payload.title,
        calories=payload.calories,
        meal_plan=payload.meal_plan or payload.title,
        notes=payload.notes,
        admin_notes=payload.admin_notes,
        duration_weeks=payload.duration_weeks,
        difficulty=payload.difficulty,
        macros=payload.macros,
        assignment_scope=apply_to,
        assignment_targets=dumps_json_list([member.id for member in target_members]),
        assignment_groups=dumps_json_list(payload.membership_groups),
        is_active=True,
        created_at=datetime.utcnow(),
        user_count=len(target_members),
    )
    db.add(diet)
    db.flush()

    if target_members:
        assign_diet_template_to_members(db, diet, target_members, replace_existing=True)

    db.commit()
    db.refresh(diet)

    return DietPlanOut(
        id=diet.id,
        title=diet.title,
        calories=diet.calories,
        user_count=diet.user_count,
        apply_to=diet.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(diet.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(diet.assignment_groups)],
        admin_notes=diet.admin_notes,
        duration_weeks=diet.duration_weeks,
        difficulty=diet.difficulty,
        macros=diet.macros,
        is_active=bool(diet.is_active),
    )


@app.put("/api/diet-plans/{diet_id}", response_model=DietPlanOut)
def update_diet_plan(
    diet_id: int,
    payload: DietPlanUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DietPlanOut:
    diet = db.query(DietPlan).filter(DietPlan.id == diet_id, DietPlan.member_id.is_(None)).first()
    if not diet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet plan not found")

    updates = payload.model_dump(exclude_unset=True)
    reassign = False

    for key, value in updates.items():
        if key in {"member_ids", "membership_groups", "filters", "apply_to"}:
            reassign = True
            continue
        setattr(diet, key, value)

    apply_to = payload.apply_to or diet.assignment_scope or "all"
    member_ids = payload.member_ids if payload.member_ids is not None else [int(v) for v in loads_json_list(diet.assignment_targets)]
    groups = payload.membership_groups if payload.membership_groups is not None else [str(v) for v in loads_json_list(diet.assignment_groups)]
    filters = payload.filters or {}
    target_members = resolve_assignment_members(db, apply_to, member_ids, groups, filters)

    diet.assignment_scope = apply_to
    diet.assignment_targets = dumps_json_list([member.id for member in target_members])
    diet.assignment_groups = dumps_json_list(groups)
    diet.user_count = len(target_members)

    if reassign or updates:
        db.query(DietPlan).filter(
            DietPlan.source_template_id == diet.id,
            DietPlan.member_id.isnot(None),
        ).delete()
        assign_diet_template_to_members(db, diet, target_members, replace_existing=False)

    db.commit()
    db.refresh(diet)

    return DietPlanOut(
        id=diet.id,
        title=diet.title,
        calories=diet.calories,
        user_count=diet.user_count,
        apply_to=diet.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(diet.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(diet.assignment_groups)],
        admin_notes=diet.admin_notes,
        duration_weeks=diet.duration_weeks,
        difficulty=diet.difficulty,
        macros=diet.macros,
        is_active=bool(diet.is_active),
    )


@app.post("/api/diet-plans/{diet_id}/duplicate", response_model=DietPlanOut, status_code=status.HTTP_201_CREATED)
def duplicate_diet_plan(
    diet_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> DietPlanOut:
    existing = db.query(DietPlan).filter(DietPlan.id == diet_id, DietPlan.member_id.is_(None)).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet plan not found")

    target_ids = [int(v) for v in loads_json_list(existing.assignment_targets)]
    target_members = db.query(User).filter(User.role == "member", User.id.in_(target_ids)).all() if target_ids else []

    duplicated = DietPlan(
        title=f"{existing.title} Copy",
        calories=existing.calories,
        meal_plan=existing.meal_plan,
        notes=existing.notes,
        admin_notes=existing.admin_notes,
        duration_weeks=existing.duration_weeks,
        difficulty=existing.difficulty,
        macros=existing.macros,
        assignment_scope=existing.assignment_scope,
        assignment_targets=existing.assignment_targets,
        assignment_groups=existing.assignment_groups,
        is_active=existing.is_active,
        created_at=datetime.utcnow(),
        user_count=len(target_members),
    )
    db.add(duplicated)
    db.flush()
    if target_members:
        assign_diet_template_to_members(db, duplicated, target_members, replace_existing=False)

    db.commit()
    db.refresh(duplicated)

    return DietPlanOut(
        id=duplicated.id,
        title=duplicated.title,
        calories=duplicated.calories,
        user_count=duplicated.user_count,
        apply_to=duplicated.assignment_scope,
        member_ids=[int(v) for v in loads_json_list(duplicated.assignment_targets)],
        membership_groups=[str(v) for v in loads_json_list(duplicated.assignment_groups)],
        admin_notes=duplicated.admin_notes,
        duration_weeks=duplicated.duration_weeks,
        difficulty=duplicated.difficulty,
        macros=duplicated.macros,
        is_active=bool(duplicated.is_active),
    )


@app.patch("/api/diet-plans/{diet_id}/toggle", response_model=MessageResponse)
def toggle_diet_plan_status(
    diet_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    diet = db.query(DietPlan).filter(DietPlan.id == diet_id, DietPlan.member_id.is_(None)).first()
    if not diet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet plan not found")

    diet.is_active = not bool(diet.is_active)
    db.query(DietPlan).filter(DietPlan.source_template_id == diet.id).update({"is_active": diet.is_active})
    db.commit()
    return MessageResponse(message=f"Diet plan {'activated' if diet.is_active else 'deactivated'}")


@app.delete("/api/diet-plans/{diet_id}", response_model=MessageResponse)
def delete_diet_plan(diet_id: int, _: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> MessageResponse:
    diet = db.query(DietPlan).filter(DietPlan.id == diet_id, DietPlan.member_id.is_(None)).first()
    if not diet:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diet plan not found")

    db.query(DietPlan).filter(DietPlan.source_template_id == diet.id).delete()
    db.delete(diet)
    db.commit()
    return MessageResponse(message="Diet plan removed")


@app.get("/api/plan-assignments/history", response_model=List[AssignmentHistoryOut])
def get_plan_assignment_history(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> List[AssignmentHistoryOut]:
    return build_assignment_history(db)


@app.get("/api/reports/summary", response_model=ReportSummaryOut)
def reports_summary(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> ReportSummaryOut:
    total_members = db.query(User).filter(User.role == "member").count()
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).scalar() or 0.0

    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)
    if now.month == 1:
        next_month_start = datetime(now.year + 1, 1, 1)
        previous_month_start = datetime(now.year - 1, 12, 1)
    else:
        next_month_start = datetime(now.year, now.month + 1, 1)
        previous_month_start = datetime(now.year, now.month - 1, 1)

    monthly_current = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.date >= current_month_start, Payment.date < next_month_start)
        .scalar()
        or 0.0
    )

    monthly_previous = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.date >= previous_month_start, Payment.date < current_month_start)
        .scalar()
        or 0.0
    )

    recent_members = (
        db.query(User)
        .filter(User.role == "member", User.join_date >= current_month_start, User.join_date < next_month_start)
        .count()
    )
    growth_rate = round((recent_members / total_members) * 100, 2) if total_members > 0 else 0.0

    revenue_growth = 0.0
    if monthly_previous > 0:
        revenue_growth = round(((monthly_current - monthly_previous) / monthly_previous) * 100, 2)

    attendance_day_counts = [
        row[0]
        for row in db.query(func.count(Attendance.id))
        .group_by(func.date(Attendance.check_in))
        .all()
    ]
    average_attendance_per_day = round(
        sum(attendance_day_counts) / len(attendance_day_counts), 2
    ) if attendance_day_counts else 0.0

    return ReportSummaryOut(
        growth_rate=growth_rate,
        total_members=total_members,
        revenue_growth=revenue_growth,
        average_attendance_per_day=average_attendance_per_day,
    )


@app.get("/api/dashboard/stats", response_model=DashboardStatsOut)
def dashboard_stats(_: User = Depends(get_current_admin), db: Session = Depends(get_db)) -> DashboardStatsOut:
    total_members = db.query(User).filter(User.role == "member").count()
    active_members = db.query(User).filter(User.role == "member", User.status == "active").count()
    attendance_today = db.query(Attendance).filter(func.date(Attendance.check_in) == datetime.utcnow().date()).count()
    revenue = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).scalar() or 0.0

    return DashboardStatsOut(
        total_members=total_members,
        active_members=active_members,
        attendance_today=attendance_today,
        revenue=float(revenue),
    )


@app.post("/api/notifications/send", response_model=MessageResponse)
def send_notification(
    payload: NotificationCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    notification = Notification(
        title=payload.title,
        message=payload.message,
        platform=payload.platform,
        target=payload.target,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()

    return MessageResponse(message="Notification sent successfully")


@app.put("/api/settings/password", response_model=MessageResponse)
def update_password(
    payload: PasswordUpdateRequest,
    user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if not verify_user_password(user, payload.current_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    set_password(user, payload.new_password)
    db.commit()
    return MessageResponse(message="Password updated successfully")


@app.put("/api/member/change-password", response_model=MessageResponse)
def member_change_password(
    payload: PasswordUpdateRequest,
    user: User = Depends(get_current_member),
    db: Session = Depends(get_db),
) -> MessageResponse:
    if not verify_user_password(user, payload.current_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    set_password(user, payload.new_password)
    db.commit()
    return MessageResponse(message="Password updated successfully")


@app.get("/api/member/dashboard", response_model=MemberDashboardOut)
def member_dashboard(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> MemberDashboardOut:
    total_visits = db.query(Attendance).filter(Attendance.user_id == user.id).count()
    notification_count = len(get_notification_rows(db, user))

    return MemberDashboardOut(
        total_visits=total_visits,
        current_plan=user.plan,
        membership_status=user.status,
        notification_count=notification_count,
    )


@app.get("/api/member/profile", response_model=AuthUser)
def member_profile(user: User = Depends(get_current_member)) -> AuthUser:
    return AuthUser(
        id=user.id,
        member_id=user.membership_id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        age=user.age,
        membership_type=user.membership_type,
        plan=user.plan,
        status=user.status,
        created_at=dt_to_iso(user.created_at),
        join_date=dt_to_iso(user.join_date),
        membership_id=user.membership_id,
    )


@app.put("/api/member/profile", response_model=AuthUser)
def update_member_profile(
    payload: MemberProfileUpdateRequest,
    user: User = Depends(get_current_member),
    db: Session = Depends(get_db),
) -> AuthUser:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update payload")

    for key, value in updates.items():
        setattr(user, key, value)

    if payload.membership_type:
        user.plan = payload.membership_type

    db.commit()
    db.refresh(user)

    return AuthUser(
        id=user.id,
        member_id=user.membership_id,
        name=user.name,
        email=user.email,
        role=user.role,
        phone=user.phone,
        age=user.age,
        membership_type=user.membership_type,
        plan=user.plan,
        status=user.status,
        created_at=dt_to_iso(user.created_at),
        join_date=dt_to_iso(user.join_date),
        membership_id=user.membership_id,
    )


@app.get("/api/member/membership", response_model=MembershipDetailsOut)
@app.get("/api/member/membership-details", response_model=MembershipDetailsOut)
def member_membership_details(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> MembershipDetailsOut:
    membership = db.query(Membership).filter(Membership.member_id == user.id).first()

    return MembershipDetailsOut(
        membership_id=user.membership_id,
        member_id=user.membership_id,
        name=user.name,
        email=user.email,
        plan=user.plan,
        membership_type=user.membership_type,
        status=user.status,
        start_date=dt_to_iso(membership.start_date) if membership else None,
        end_date=dt_to_iso(membership.end_date) if membership else None,
        payment_status=membership.payment_status if membership else None,
        join_date=dt_to_iso(user.join_date),
    )


@app.get("/api/member/attendance", response_model=MemberAttendanceResponse)
def member_attendance(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> MemberAttendanceResponse:
    return build_member_attendance_response(user, db)


@app.post("/api/member/mark-attendance", response_model=MemberAttendanceResponse)
def mark_member_attendance(
    payload: MarkAttendanceRequest,
    user: User = Depends(get_current_member),
    db: Session = Depends(get_db),
) -> MemberAttendanceResponse:
    now = datetime.utcnow()
    today = now.date()

    already_marked_today = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id, Attendance.attendance_date == today)
        .first()
    )
    active_session = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id, Attendance.check_out.is_(None))
        .first()
    )
    if already_marked_today or active_session:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance Already Marked")

    image_bytes, extension = decode_data_url(payload.image_data)
    date_dir = get_uploads_root() / today.isoformat()
    date_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"member_{user.id}_{uuid4().hex}.{extension}"
    absolute_path = date_dir / file_name
    absolute_path.write_bytes(image_bytes)

    relative_path = absolute_path.relative_to(Path(__file__).resolve().parent).as_posix()
    face_result = run_face_verification_placeholder(user, relative_path, payload.enable_face_verification)

    attendance = Attendance(
        user_id=user.id,
        member_id=user.id,
        check_in=now,
        check_in_time=now,
        check_out=None,
        duration=None,
        status="present",
        captured_image=relative_path,
        attendance_date=today,
        face_verification_status=face_result.get("status"),
        face_verification_confidence=face_result.get("confidence"),
    )
    db.add(attendance)
    db.commit()

    return build_member_attendance_response(user, db)


@app.post("/api/member/attendance/qr-scan", response_model=MemberQrAttendanceResult)
def mark_member_qr_attendance(
    payload: MemberQrAttendanceRequest,
    user: User = Depends(get_current_member),
    db: Session = Depends(get_db),
) -> MemberQrAttendanceResult:
    config = get_or_create_attendance_qr_config(db)
    action = validate_attendance_qr_token(payload.qr_token, config)
    now = datetime.utcnow()

    active_session = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id, Attendance.check_out.is_(None))
        .order_by(Attendance.check_in.desc())
        .first()
    )

    device_info = (payload.device_info or "").strip()[:255] or None

    if action == "checkin":
        if active_session:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in. Please check out first")

        attendance = Attendance(
            user_id=user.id,
            member_id=user.id,
            check_in=now,
            check_in_time=now,
            check_out=None,
            duration=None,
            status="present",
            attendance_date=now.date(),
            check_in_device=device_info,
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)

        action_label = "check-in"
        status_label = "checked_in"
        message = "Check-in successful"
    else:
        if not active_session:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active check-in found")

        active_session.check_out = now
        active_session.duration = max(1, int((now - active_session.check_in).total_seconds() // 60))
        active_session.status = "completed"
        active_session.check_out_device = device_info
        db.commit()
        db.refresh(active_session)
        attendance = active_session

        action_label = "check-out"
        status_label = "checked_out"
        message = "Check-out successful"

    attendance_response = build_member_attendance_response(user, db)

    return MemberQrAttendanceResult(
        message=message,
        action=action_label,
        status=status_label,
        member_name=user.name,
        occurred_at=dt_to_iso(now) or "",
        attendance_id=attendance.id,
        attendance=attendance_response,
    )


@app.get("/api/member/workout", response_model=List[MemberWorkoutOut])
@app.get("/api/member/workouts", response_model=List[MemberWorkoutOut])
def member_workouts(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> List[MemberWorkoutOut]:
    rows = (
        db.query(Workout)
        .filter(Workout.member_id == user.id, Workout.is_active.is_(True))
        .order_by(Workout.id.desc())
        .all()
    )

    return [
        MemberWorkoutOut(
            id=row.id,
            member_id=row.member_id or user.id,
            workout_name=row.workout_name or row.title,
            trainer=row.trainer,
            schedule=row.schedule,
        )
        for row in rows
    ]


@app.get("/api/member/diet", response_model=List[MemberDietOut])
@app.get("/api/member/diet-plans", response_model=List[MemberDietOut])
def member_diet_plans(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> List[MemberDietOut]:
    rows = (
        db.query(DietPlan)
        .filter(DietPlan.member_id == user.id, DietPlan.is_active.is_(True))
        .order_by(DietPlan.id.desc())
        .all()
    )

    return [
        MemberDietOut(
            id=row.id,
            member_id=row.member_id or user.id,
            meal_plan=row.meal_plan or row.title,
            calories=row.calories,
            notes=row.notes,
        )
        for row in rows
    ]


@app.get("/api/member/notifications", response_model=List[NotificationOut])
def member_notifications(user: User = Depends(get_current_member), db: Session = Depends(get_db)) -> List[NotificationOut]:
    rows = get_notification_rows(db, user)
    return [
        NotificationOut(
            id=row.id,
            title=row.title,
            message=row.message,
            platform=row.platform,
            target=row.target,
            created_at=dt_to_iso(row.created_at) or "",
        )
        for row in rows
    ]


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8010"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
