from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    spring_boot_url: str = "http://spring-boot:8080"

    # Model selection per task type
    sonnet_model: str = "claude-sonnet-4-5"
    haiku_model: str = "claude-haiku-4-5-20251001"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()