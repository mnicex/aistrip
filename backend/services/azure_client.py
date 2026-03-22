"""Shared Azure OpenAI client — Service Principal or fallback to az login."""

from __future__ import annotations

from azure.identity import ClientSecretCredential, DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from config import Settings

_TOKEN_SCOPE = "https://cognitiveservices.azure.com/.default"


def get_azure_openai_client(settings: Settings) -> AsyncAzureOpenAI:
    """Create an AsyncAzureOpenAI client authenticated via Entra ID.

    Preferred: set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
    for reliable Service Principal auth (no az login needed).

    Fallback: DefaultAzureCredential (az login, managed identity, etc.)
    """
    if settings.azure_tenant_id and settings.azure_client_id and settings.azure_client_secret:
        credential = ClientSecretCredential(
            tenant_id=settings.azure_tenant_id,
            client_id=settings.azure_client_id,
            client_secret=settings.azure_client_secret,
        )
    else:
        credential = DefaultAzureCredential()

    token_provider = get_bearer_token_provider(credential, _TOKEN_SCOPE)

    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        azure_ad_token_provider=token_provider,
        api_version=settings.azure_openai_api_version,
    )
