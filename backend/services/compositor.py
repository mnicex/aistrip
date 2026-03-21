"""Compositor — assembles panels into a strip with speech bubbles and text."""

from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from models.schemas import ComicScript, DialogueLine

# ---- Constants ----
PANEL_SIZE = (1024, 1024)
BORDER_WIDTH = 4
STRIP_PADDING = 20
BUBBLE_PADDING = 16
BUBBLE_RADIUS = 20
FONT_SIZE = 28
BUBBLE_MAX_WIDTH = 280
BACKGROUND_COLOR = (255, 255, 255)
BORDER_COLOR = (30, 30, 30)
BUBBLE_FILL = (255, 255, 255)
BUBBLE_OUTLINE = (30, 30, 30)
TEXT_COLOR = (20, 20, 20)


def _get_font(size: int = FONT_SIZE) -> ImageFont.FreeTypeFont:
    """Try to load a clean sans-serif font, fall back to default."""
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def _draw_speech_bubble(
    draw: ImageDraw.ImageDraw,
    text: str,
    position: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    max_width: int = BUBBLE_MAX_WIDTH,
) -> None:
    """Draw a rounded-rect speech bubble with wrapped text."""
    wrapped = textwrap.fill(text, width=max_width // (FONT_SIZE // 2))
    bbox = draw.textbbox((0, 0), wrapped, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    x, y = position
    rect = (
        x - BUBBLE_PADDING,
        y - BUBBLE_PADDING,
        x + tw + BUBBLE_PADDING,
        y + th + BUBBLE_PADDING,
    )

    draw.rounded_rectangle(rect, radius=BUBBLE_RADIUS, fill=BUBBLE_FILL, outline=BUBBLE_OUTLINE, width=2)

    # Small tail triangle pointing down
    tail_x = (rect[0] + rect[2]) // 2
    tail_y = rect[3]
    draw.polygon(
        [(tail_x - 8, tail_y), (tail_x + 8, tail_y), (tail_x, tail_y + 16)],
        fill=BUBBLE_FILL,
        outline=BUBBLE_OUTLINE,
    )

    draw.text((x, y), wrapped, fill=TEXT_COLOR, font=font)


def add_dialogue_to_panel(
    panel_img: Image.Image,
    dialogue: list[DialogueLine],
) -> Image.Image:
    """Overlay speech bubbles on a panel image."""
    img = panel_img.copy()
    draw = ImageDraw.Draw(img)
    font = _get_font()

    # Position bubbles at top of panel, spaced horizontally
    num = len(dialogue)
    if num == 0:
        return img

    spacing = img.width // (num + 1)
    for i, line in enumerate(dialogue):
        x = spacing * (i + 1) - BUBBLE_MAX_WIDTH // 4
        x = max(BUBBLE_PADDING, min(x, img.width - BUBBLE_MAX_WIDTH - BUBBLE_PADDING))
        y = 20 + i * 10  # slight vertical stagger
        label = f"{line.character}: {line.text}"
        _draw_speech_bubble(draw, label, (x, y), font)

    return img


def assemble_strip(
    panel_paths: dict[int, str],
    script: ComicScript,
    panel_order: list[int] | None = None,
    output_path: str | None = None,
    fmt: str = "png",
) -> str:
    """Combine panels into a horizontal strip image.

    Returns the path to the saved strip image.
    """
    order = panel_order or sorted(panel_paths.keys())
    panels: list[Image.Image] = []

    for pn in order:
        path = panel_paths.get(pn, "")
        if not path or path.startswith("ERROR"):
            # Create a placeholder panel
            img = Image.new("RGB", PANEL_SIZE, (200, 200, 200))
            draw = ImageDraw.Draw(img)
            draw.text((300, 480), f"Panel {pn}\n(generation failed)", fill=(100, 100, 100))
            panels.append(img)
            continue

        img = Image.open(path).resize(PANEL_SIZE)

        # Find matching panel script for dialogue
        matching = [p for p in script.panels if p.panel_number == pn]
        if matching and matching[0].dialogue:
            img = add_dialogue_to_panel(img, matching[0].dialogue)

        panels.append(img)

    # Assemble horizontally
    total_w = len(panels) * PANEL_SIZE[0] + (len(panels) + 1) * STRIP_PADDING + (len(panels) - 1) * BORDER_WIDTH
    total_h = PANEL_SIZE[1] + 2 * STRIP_PADDING

    strip = Image.new("RGB", (total_w, total_h), BACKGROUND_COLOR)
    draw = ImageDraw.Draw(strip)

    x = STRIP_PADDING
    for img in panels:
        # Border
        draw.rectangle(
            (x - BORDER_WIDTH, STRIP_PADDING - BORDER_WIDTH,
             x + PANEL_SIZE[0] + BORDER_WIDTH, STRIP_PADDING + PANEL_SIZE[1] + BORDER_WIDTH),
            outline=BORDER_COLOR,
            width=BORDER_WIDTH,
        )
        strip.paste(img, (x, STRIP_PADDING))
        x += PANEL_SIZE[0] + STRIP_PADDING + BORDER_WIDTH

    if output_path is None:
        output_path = "strip_output." + fmt

    strip.save(output_path, fmt.upper())
    return output_path
