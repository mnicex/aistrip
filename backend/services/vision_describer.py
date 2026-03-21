"""Vision-based character description from a reference image."""

from __future__ import annotations

import json

from config import Settings
from services.azure_client import get_azure_openai_client

SYSTEM_PROMPT = """\
You are a visual character analyst for cartoon strip creation.
Given a reference image of a character, describe their appearance in detail
suitable for an AI image generator to recreate consistently across comic panels.

Focus on: body type, hair/fur color and style, clothing, accessories,
distinguishing features, color palette.

Return ONLY valid JSON:
{
  "appearance": "string — detailed visual description for image generation prompts",
  "personality": "string — inferred personality/vibe from the image (e.g. cheerful, mysterious)"
}
"""


async def describe_character_from_image(
    image_b64: str,
    name: str,
    settings: Settings,
) -> dict:
    client = get_azure_openai_client(settings)

    user_content: list[dict] = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{image_b64}"},
        },
    ]
    if name:
        user_content.insert(0, {
            "type": "text",
            "text": f"This character's name is '{name}'. Describe their appearance for cartoon recreation.",
        })
    else:
        user_content.insert(0, {
            "type": "text",
            "text": "Describe this character's appearance for cartoon recreation.",
        })

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.5,
        max_completion_tokens=500,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    return json.loads(raw)  # type: ignore[arg-type]
