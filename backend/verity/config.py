from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")
    database_url: str = "sqlite:///./data/verity.db"
    storage_dir: Path = Path("./data/documents")
    s3_bucket: str = ""
    s3_region: str = "us-east-1"
    s3_endpoint_url: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    external_ai_enabled: bool = False
    openai_api_key: str = Field(default="", repr=False)
    openai_model: str = "gpt-5.4"
    openai_reasoning_effort: str = "high"
    zai_api_key: str = Field(default="", repr=False)
    glm_ocr_bbox_format: Literal["normalized", "pixels"] = "pixels"
    jwt_issuer: str = ""
    jwt_audience: str = ""
    jwt_jwks_url: str = ""
    local_tokens_enabled: bool = True
    max_pdf_pages: int = Field(default=10, ge=1, le=100)
    max_upload_bytes: int = Field(default=20 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024)
    worker_poll_seconds: float = Field(default=2, ge=0.1, le=60)

    @model_validator(mode="after")
    def auth_config(self):
        configured = [bool(self.jwt_issuer), bool(self.jwt_audience), bool(self.jwt_jwks_url)]
        if any(configured) and not all(configured):
            raise ValueError("Configure JWT_ISSUER, JWT_AUDIENCE and JWT_JWKS_URL together")
        if self.jwt_jwks_url and not self.jwt_jwks_url.startswith("https://"):
            raise ValueError("JWT_JWKS_URL must use HTTPS")
        if not self.local_tokens_enabled and not all(configured):
            raise ValueError("Configure external auth before disabling local tokens")
        return self


@lru_cache
def settings():
    return Settings()
