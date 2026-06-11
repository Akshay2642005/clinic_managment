from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Clinic Management API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/clinic_db"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
