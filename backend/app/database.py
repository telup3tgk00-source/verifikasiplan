from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL tidak ditemukan di .env!")

engine = create_engine(
    DATABASE_URL,
    pool_size=15,         # 15 standby per worker × 3 workers = 45 total koneksi normal
    max_overflow=5,       # Max 5 overflow per worker = 15 extra (total max ~60, aman dari batas 100)
    pool_timeout=20,      # Tunggu 20 detik sebelum raise error (jangan terlalu lama)
    pool_recycle=1800,    # Reset koneksi setiap 30 menit
    pool_pre_ping=True    # Cek koneksi sebelum dipakai (cegah zombie connection yang diam)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()