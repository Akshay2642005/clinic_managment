from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Clinic Management API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql://<user>:<password>@<host>:<port>/clinic"
    SECRET_KEY: str = "change-this-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
