import os
from dotenv import load_dotenv

# Loads variables from a .env file (if present) into the environment.
# This means secrets like API keys never live in the source code.
load_dotenv()


class Settings:
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///../database/jeevan.db")
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"


settings = Settings()
