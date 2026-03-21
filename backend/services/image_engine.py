"""Image engine — generates panel images via Azure OpenAI DALL-E 3."""

from __future__ import annotations

import asyncio
import os
import uuid
from pathlib import Path

import aiofiles

from config import Settings
from models.schemas import CharacterDef, ComicScript, PanelScript
from services.azure_client import get_azure_openai_client
from services.character import build_all_characters_fragment


def _build_panel_prompt(
    panel: PanelScript,
    script: ComicScript,
    characters: list[CharacterDef],
) -> str:
    char_fragment = build_all_characters_fragment(characters)
    return (
        f"Art style: {script.art_style}\n\n"
        f"{char_fragment}\n\n"
        f"Scene (panel {panel.panel_number}): {panel.scene_description}\n"
        f"Expression notes: {panel.expression_notes}\n\n"
        "IMPORTANT: Do NOT include any text, speech bubbles, captions, or words "
        "in the image. Only draw the visual scene. Text will be added later."
    )


async def generate_panel_image(
    panel: PanelScript,
    script: ComicScript,
    characters: list[CharacterDef],
    strip_id: str,
    settings: Settings,
    custom_prompt: str | None = None,
) -> str:
    """Generate a single panel image. Returns the local file path."""
    client = get_azure_openai_client(settings)

    prompt = custom_prompt or _build_panel_prompt(panel, script, characters)

    response = await client.images.generate(
        model=settings.azure_openai_dalle_deployment,
        prompt=prompt,
        size="1024x1024",
        n=1,
    )

    # gpt-image models return b64_json by default; DALL-E returns url
    import base64

    image_item = response.data[0]
    if hasattr(image_item, "b64_json") and image_item.b64_json:
        image_data = base64.b64decode(image_item.b64_json)
    elif hasattr(image_item, "url") and image_item.url:
        import httpx
        async with httpx.AsyncClient() as http:
            r = await http.get(image_item.url)
            r.raise_for_status()
            image_data = r.content
    else:
        raise RuntimeError("No image data in response")
    out_dir = Path(settings.output_dir) / strip_id
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"panel_{panel.panel_number}.png"
    filepath = out_dir / filename

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(image_data)

    return str(filepath)


async def generate_all_panels(
    script: ComicScript,
    characters: list[CharacterDef],
    strip_id: str,
    settings: Settings,
) -> dict[int, str]:
    """Generate images for all panels in parallel. Returns {panel_number: path}."""
    panel_numbers = [p.panel_number for p in script.panels]
    coros = [
        generate_panel_image(panel, script, characters, strip_id, settings)
        for panel in script.panels
    ]

    outcomes = await asyncio.gather(*coros, return_exceptions=True)

    results: dict[int, str] = {}
    for panel_num, outcome in zip(panel_numbers, outcomes):
        if isinstance(outcome, Exception):
            results[panel_num] = f"ERROR: {outcome}"
        else:
            results[panel_num] = outcome

    return results
