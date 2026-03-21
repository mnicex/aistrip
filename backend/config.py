from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Azure OpenAI — authenticated via DefaultAzureCredential (no API key needed)
    azure_openai_endpoint: str = ""
    azure_openai_chat_deployment: str = "gpt-5.4"
    azure_openai_dalle_deployment: str = "gpt-image-1.5"
    azure_openai_api_version: str = "2024-10-21"

    output_dir: str = "output"
    max_panels: int = 5

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
