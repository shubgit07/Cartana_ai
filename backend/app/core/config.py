from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VoiceTask AI"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://user:password@localhost/voicetask"
    LLM_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    EXTRACTION_MODEL: str = "llama-3.3-70b-versatile"
    STT_MODEL: str = "whisper-large-v3"
    CORS_ALLOW_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
    CORS_ALLOW_CREDENTIALS: bool = True
    MAX_REQUEST_SIZE_MB: int = 25
    PROCESS_INPUT_RATE_LIMIT: int = 20
    PROCESS_INPUT_RATE_WINDOW_SECONDS: int = 60

    @property
    def cors_allow_origins_list(self) -> list[str]:
        value = self.CORS_ALLOW_ORIGINS.strip()
        if not value:
            return []
        if value == "*":
            return ["*"]
        return [origin.strip() for origin in value.split(",") if origin.strip()]
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
