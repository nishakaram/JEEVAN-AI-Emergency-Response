from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# check_same_thread=False is needed because SQLite by default only allows
# one thread to talk to it; FastAPI can use multiple threads for requests.
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the class every ORM model (table) will inherit from.
Base = declarative_base()


def get_db():
    """FastAPI dependency: gives each request its own DB session and
    always closes it afterwards, even if an error occurs."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
