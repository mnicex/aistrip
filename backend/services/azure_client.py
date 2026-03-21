"""Shared Azure OpenAI client using DefaultAzureCredential (no API keys)."""

from __future__ import annotations

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from config import Settings

# Cognitive Services scope for Azure OpenAI token auth
_TOKEN_SCOPE = "https://cognitiveservices.azure.com/.default"


def get_azure_openai_client(settings: Settings) -> AsyncAzureOpenAI:
    """Create an AsyncAzureOpenAI client authenticated via Entra ID.

    Locally this uses your `az login` session.
    In production it uses managed identity automatically.
    """
    credential = DefaultAzureCredential()
    token_provider = get_bearer_token_provider(credential, _TOKEN_SCOPE)

    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=token_provider,
        api_version=settings.azure_openai_api_version,
    )
