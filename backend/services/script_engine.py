"""Script engine — uses Azure OpenAI GPT-4o to generate comic scripts."""

from __future__ import annotations

import json

from config import Settings
from models.schemas import (
    CharacterDef,
    ComicScript,
    DialogueLine,
    PanelScript,
)
from services.azure_client import get_azure_openai_client

SYSTEM_PROMPT = """\
You are a comic strip writer. Given an idea and character descriptions, you create
short, punchy comic scripts with visual panel descriptions and dialogue.

Rules:
- Keep dialogue short (under 15 words per line).
- Each panel description must be a concrete visual scene (setting, character poses, expressions).
- Maintain a consistent art style across all panels.
- The strip should have a clear setup → development → punchline arc.
- Return ONLY valid JSON matching the schema below, no markdown fences.

JSON schema:
{
  "title": "string",
  "art_style": "string — a detailed, consistent art style description to use for every panel",
  "panels": [
    {
      "panel_number": 1,
      "scene_description": "string — detailed visual description of the scene",
      "dialogue": [{"character": "string", "text": "string"}],
      "expression_notes": "string — character expression/pose notes"
    }
  ]
}
"""


def _build_user_prompt(
    idea: str, characters: list[CharacterDef], num_panels: int
) -> str:
    char_block = "\n".join(
        f"- **{c.name}**: {c.appearance}. Personality: {c.personality or 'neutral'}"
        for c in characters
    )
    return (
        f"Idea: {idea}\n\n"
        f"Characters:\n{char_block}\n\n"
        f"Create a {num_panels}-panel comic strip script. "
        "The art_style field should describe a single, consistent cartoon style "
        "(e.g. 'flat vector illustration, bold black outlines, pastel colors, "
        "simple backgrounds, expressive faces, Tintin-inspired'). "
        "Make sure every panel's scene_description includes the full visual appearance "
        "of each character present so they look consistent across panels."
    )


async def generate_script(
    idea: str,
    characters: list[CharacterDef],
    num_panels: int,
    settings: Settings,
) -> ComicScript:
    client = get_azure_openai_client(settings)

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_prompt(idea, characters, num_panels),
            },
        ],
        temperature=0.9,
        max_completion_tokens=2000,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)  # type: ignore[arg-type]

    # Normalise into our Pydantic models
    panels = [
        PanelScript(
            panel_number=p["panel_number"],
            scene_description=p["scene_description"],
            dialogue=[DialogueLine(**d) for d in p.get("dialogue", [])],
            expression_notes=p.get("expression_notes", ""),
        )
        for p in data["panels"]
    ]

    return ComicScript(
        title=data["title"],
        art_style=data["art_style"],
        panels=panels,
    )
