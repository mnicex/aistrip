"""AI-assisted panel rewriter."""

from __future__ import annotations

import json

from config import Settings
from models.schemas import DialogueLine, PanelScript
from services.azure_client import get_azure_openai_client

SYSTEM_PROMPT = """\
You are a comic strip script editor. Given a panel's current script and an
editing instruction, rewrite the panel. Preserve the panel_number.

Return ONLY valid JSON matching this schema:
{
  "panel_number": int,
  "scene_description": "string",
  "dialogue": [{"character": "string", "text": "string"}],
  "expression_notes": "string"
}
"""


async def rewrite_panel(
    panel: PanelScript,
    instruction: str,
    art_style: str,
    idea: str,
    settings: Settings,
) -> PanelScript:
    client = get_azure_openai_client(settings)

    current = panel.model_dump_json()
    user_msg = (
        f"Comic idea: {idea}\n"
        f"Art style: {art_style}\n\n"
        f"Current panel script:\n{current}\n\n"
        f"Instruction: {instruction}"
    )

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.8,
        max_completion_tokens=500,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)  # type: ignore[arg-type]

    return PanelScript(
        panel_number=data.get("panel_number", panel.panel_number),
        scene_description=data["scene_description"],
        dialogue=[DialogueLine(**d) for d in data.get("dialogue", [])],
        expression_notes=data.get("expression_notes", ""),
    )
