import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

class Config:
    # Database Individual Variables
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_HOST = os.getenv('DB_HOST')
    DB_PORT = os.getenv('DB_PORT', '6543')
    DB_NAME = os.getenv('DB_NAME', 'postgres')

    # Construct URI Manually to prevent stripping of project ref suffix
    # Format: postgresql://user.ref:password@host:port/dbname?sslmode=require
    if DB_USER and DB_PASSWORD and DB_HOST:
        SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
    else:
        # Fallback to single string if variables are missing
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

    # Debug Logs (Masking sensitive info)
    print(f"🛠️  DB Configuration Loaded:")
    print(f"👤  User: {DB_USER}")
    if SQLALCHEMY_DATABASE_URI:
        parts = SQLALCHEMY_DATABASE_URI.split('@')
        if len(parts) > 1:
            print(f"🔗  Host: {parts[-1]}")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Engine Options for Supabase Stability
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {
            "sslmode": "require"
        }
    }
    
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
