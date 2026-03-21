"""Idea refiner — helps users iterate on comic ideas with AI."""

from __future__ import annotations

import json

from config import Settings
from services.azure_client import get_azure_openai_client

SYSTEM_PROMPT = """\
You are a creative assistant helping someone develop a cartoon strip idea.
Given a rough idea, you refine it into a clear, punchy one-liner suitable for
a 2–5 panel comic strip. Keep the humor and heart of the original.

Also suggest 2–3 alternative directions they could take the idea.

Return ONLY valid JSON:
{
  "refined_idea": "string — the polished one-liner idea",
  "suggestions": ["string — alt direction 1", "string — alt direction 2"]
}
"""

ITERATE_PROMPT = """\
The user previously refined their idea to:
"{previous}"

They want to adjust it. Their feedback: "{feedback}"

Refine again based on the feedback, keeping the core concept.
Return the same JSON format.
"""


async def refine_idea(
    rough_idea: str,
    feedback: str,
    previous_refined: str,
    settings: Settings,
) -> dict:
    client = get_azure_openai_client(settings)

    if previous_refined and feedback:
        user_msg = ITERATE_PROMPT.format(previous=previous_refined, feedback=feedback)
    else:
        user_msg = f"Rough idea: {rough_idea}"

    response = await client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.9,
        max_completion_tokens=500,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    return json.loads(raw)  # type: ignore[arg-type]
