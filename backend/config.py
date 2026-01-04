from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"  # Model name (can use gemini-2.0-flash, gemini-1.5-flash, etc.)
    
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    
    # Google Fit (optional - for future integration)
    google_fit_client_id: Optional[str] = ""
    google_fit_client_secret: Optional[str] = ""
    
    # Web Push (optional)
    vapid_public_key: Optional[str] = ""
    vapid_private_key: Optional[str] = ""
    vapid_subject: Optional[str] = ""
    
    # App Settings
    environment: str = "development"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8081"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
