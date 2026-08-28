import os
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

PROJECT_REF = os.getenv("SUPABASE_PROJECT_REF", "svogiyeeisqpacqlbzti")


def normalize_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def build_url(host: str, port: str, user: str, password: str, dbname: str) -> str:
    return (
        f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{dbname}"
    )


def resolve_database_urls() -> tuple[str, str, str]:
    use_local = os.getenv("USE_LOCAL_DB", "false").lower() == "true"

    if use_local:
        sqlite_url = "sqlite:///./gym_admin.db"
        return sqlite_url, sqlite_url, "sqlite"

    database_url = os.getenv("DATABASE_URL", "").strip()
    direct_url = os.getenv("DIRECT_URL", "").strip()

    password = os.getenv("DB_PASSWORD", "").strip()
    dbname = os.getenv("DB_NAME", "postgres")

    if not database_url and password:
        pool_user = os.getenv("DB_USER", f"postgres.{PROJECT_REF}")
        pool_host = os.getenv("DB_HOST", "aws-0-ap-northeast-2.pooler.supabase.com")
        pool_port = os.getenv("DB_PORT", "6543")
        database_url = build_url(pool_host, pool_port, pool_user, password, dbname)

    if not direct_url and password:
        direct_user = os.getenv("DIRECT_DB_USER", "postgres")
        direct_host = os.getenv("DIRECT_DB_HOST", f"db.{PROJECT_REF}.supabase.co")
        direct_port = os.getenv("DIRECT_PORT", "5432")
        direct_url = build_url(direct_host, direct_port, direct_user, password, dbname)

    if not database_url:
        raise RuntimeError(
            "Database is not configured. Set DB_PASSWORD in fastapi_server/.env "
            "(Supabase -> Project Settings -> Database), or set USE_LOCAL_DB=true."
        )

    if not direct_url:
        direct_url = database_url

    return normalize_url(database_url), normalize_url(direct_url), "postgres"


DATABASE_URL, DIRECT_URL, DB_BACKEND = resolve_database_urls()

if DB_BACKEND == "sqlite":
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    migration_engine = engine
else:
    connect_args = {"sslmode": "require"}
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
    )
    migration_engine = create_engine(
        DIRECT_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
