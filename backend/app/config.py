
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Project root: the folder containing backend/ and database/
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = PROJECT_ROOT / "database" / "jeevan.db"


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
    )
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"


settings = Settings()
