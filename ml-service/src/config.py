"""
Configuration management for ML Service using Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """ML Service Configuration"""

    # Service Configuration
    service_name: str = "SeeMe ML Service"
    service_version: str = "0.1.0"
    host: str = "0.0.0.0"
    port: int = 8000

    # AWS S3 Configuration
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    s3_bucket: str
    cloudfront_url: str

    # Redis Configuration
    redis_url: str = "redis://:seeme_redis_2026@localhost:6379/0"

    # RabbitMQ Configuration
    rabbitmq_url: str = "amqp://seeme:seeme_rabbit_2026@localhost:5672/seeme_vhost"

    # CORS Configuration
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:19006"]

    # Model Configuration
    models_dir: Path = Path("models")

    # Processing Configuration
    max_image_size: int = 10 * 1024 * 1024  # 10MB
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]

    # Celery Configuration
    celery_task_time_limit: int = 300  # 5 minutes
    celery_result_expires: int = 3600  # 1 hour

    # Logging
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env.ml",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# Global settings instance
settings = Settings()
