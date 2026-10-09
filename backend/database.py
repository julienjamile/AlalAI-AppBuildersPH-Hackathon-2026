import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

DB_DIR = Path(__file__).resolve().parent
DB_PATH = DB_DIR / "silong.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Connect args needed for SQLite in multithreaded FastAPI
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
