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
    pool_size=30,         # Simpan 30 koneksi standby (cukup untuk puluhan user aktif)
    max_overflow=70,      # Jika penuh, boleh buka s.d 70 koneksi tambahan (total 100 concurrent)
    pool_timeout=30,      # Tunggu 30 detik sebelum error (mencegah timeout saat penuh)
    pool_recycle=1800     # Reset koneksi setiap 30 menit mencegah memory leak
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()