"""Character consistency helpers.

Builds detailed, deterministic character prompts that get embedded verbatim
into every DALL-E panel prompt so the same character looks consistent.
"""

from __future__ import annotations

from models.schemas import CharacterDef


def build_character_prompt_fragment(char: CharacterDef) -> str:
    """Return a rich text fragment describing one character for image prompts."""
    parts = [
        f"{char.name}:",
        f"  appearance — {char.appearance}",
    ]
    if char.personality:
        parts.append(f"  demeanour — {char.personality}")
    return "\n".join(parts)


def build_all_characters_fragment(characters: list[CharacterDef]) -> str:
    """Return a combined character block for embedding in image prompts."""
    fragments = [build_character_prompt_fragment(c) for c in characters]
    return "Characters present (keep their look exactly consistent):\n" + "\n".join(
        fragments
    )
