from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_timeout_seconds: int = 30
    
    # Worker
    poll_interval_seconds: int = 30
    job_claim_limit: int = 10
    
    # Minimax TTS
    minimax_api_key: str = ""
    minimax_voice_id: str = ""
    minimax_group_id: str = ""
    minimax_timeout_seconds: int = 60
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
