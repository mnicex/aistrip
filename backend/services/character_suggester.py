"""Suggest characters based on a comic strip idea."""

from __future__ import annotations

import json

from config import Settings
from models.schemas import CharacterDef
from services.azure_client import get_azure_openai_client

SYSTEM_PROMPT = """\
You are a character designer for cartoon strips. Given a comic idea,
suggest characters that would make the strip funny and engaging.

For each character provide:
- name: a catchy, memorable name
- appearance: detailed visual description for an AI image generator
  (body type, colors, clothing, distinguishing features)
- personality: a brief personality note (1 sentence)

Return ONLY valid JSON:
{
  "characters": [
    {"name": "string", "appearance": "string", "personality": "string"}
  ]
}
"""


async def suggest_characters(
    idea: str,
    num_characters: int,
    settings: Settings,
) -> list[CharacterDef]:
    client = get_azure_openai_client(settings)

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Comic idea: {idea}\n\n"
                    f"Suggest the right number of characters for this strip (at least {num_characters}, "
                    "but add more if the idea clearly involves them). "
                    "Include every character mentioned or implied in the idea. "
                    "Make them visually distinct and fun."
                ),
            },
        ],
        temperature=0.9,
        max_completion_tokens=800,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)  # type: ignore[arg-type]

    return [
        CharacterDef(
            name=c["name"],
            appearance=c["appearance"],
            personality=c.get("personality", ""),
        )
        for c in data["characters"]
    ]
