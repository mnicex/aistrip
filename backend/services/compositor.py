"""Compositor — assembles panels into a strip with speech bubbles and text."""

from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from models.schemas import ComicScript, DialogueBubble, DialogueLine

# ---- Constants ----
PANEL_SIZE = (1024, 1024)
BORDER_WIDTH = 4
STRIP_PADDING = 20
BUBBLE_PADDING = 16
BUBBLE_RADIUS = 20
FONT_SIZE = 28
BUBBLE_MAX_WIDTH = 320
BACKGROUND_COLOR = (255, 255, 255)
BORDER_COLOR = (30, 30, 30)
TEXT_COLOR = (20, 20, 20)


def _get_font(size: int = FONT_SIZE, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Try to load a clean sans-serif font, fall back to default."""
    if bold:
        bold_candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        for path in bold_candidates:
            if Path(path).exists():
                return ImageFont.truetype(path, size)
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex colour to RGB tuple."""
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return (255, 255, 255)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except ValueError:
        return (255, 255, 255)


def _starburst_polygon(
    cx: float, cy: float, rx: float, ry: float, spikes: int = 10, depth: float = 0.25
) -> list[tuple[float, float]]:
    """Generate starburst polygon points for shout bubbles."""
    points: list[tuple[float, float]] = []
    for i in range(spikes * 2):
        angle = math.pi * i / spikes - math.pi / 2
        if i % 2 == 0:
            px = cx + rx * math.cos(angle)
            py = cy + ry * math.sin(angle)
        else:
            px = cx + rx * (1.0 - depth) * math.cos(angle)
            py = cy + ry * (1.0 - depth) * math.sin(angle)
        points.append((px, py))
    return points


def _draw_styled_bubble(
    overlay: Image.Image,
    text: str,
    x: int,
    y: int,
    font: ImageFont.FreeTypeFont,
    style: str = "speech",
    color: str = "#FFFFFF",
    opacity: float = 0.9,
    max_width: int = BUBBLE_MAX_WIDTH,
    tail_position: str = "center",
) -> None:
    """Draw a styled bubble with text onto an RGBA overlay."""
    draw = ImageDraw.Draw(overlay)
    rgb = _hex_to_rgb(color)
    alpha = max(0, min(255, int(opacity * 255)))
    fill = (*rgb, alpha)
    outline = (30, 30, 30, alpha)
    text_fill = (20, 20, 20, 255)

    # Wrap text
    chars_per_line = max(12, max_width // (FONT_SIZE * 6 // 10))
    wrapped = textwrap.fill(text, width=chars_per_line)
    bbox = draw.textbbox((0, 0), wrapped, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    pad = BUBBLE_PADDING
    rect = (x - pad, y - pad, x + tw + pad, y + th + pad)
    cx = (rect[0] + rect[2]) / 2
    cy = (rect[1] + rect[3]) / 2
    rx = (rect[2] - rect[0]) / 2
    ry = (rect[3] - rect[1]) / 2

    # Compute tail X based on position
    bw = rect[2] - rect[0]
    if tail_position == "left":
        tail_x = int(rect[0] + bw * 0.15)
    elif tail_position == "right":
        tail_x = int(rect[0] + bw * 0.80)
    else:
        tail_x = int(cx)

    if style == "narrator":
        draw.rectangle(rect, fill=fill, outline=outline, width=2)
    elif style == "shout":
        pts = _starburst_polygon(cx, cy, rx + 8, ry + 8, spikes=12, depth=0.22)
        draw.polygon(pts, fill=fill, outline=outline, width=3)
        # Tail
        tail_y = int(rect[3]) + 6
        draw.polygon(
            [(tail_x - 8, tail_y - 6), (tail_x + 8, tail_y - 6), (tail_x, tail_y + 10)],
            fill=fill, outline=outline,
        )
    elif style == "thought":
        draw.rounded_rectangle(rect, radius=max(rx, ry) * 0.6, fill=fill, outline=outline, width=2)
        dot_y = int(rect[3])
        draw.ellipse((tail_x - 6, dot_y + 3, tail_x + 6, dot_y + 13), fill=fill, outline=outline, width=1)
        draw.ellipse((tail_x - 8, dot_y + 15, tail_x - 1, dot_y + 22), fill=fill, outline=outline, width=1)
    elif style == "whisper":
        draw.rounded_rectangle(rect, radius=BUBBLE_RADIUS, fill=fill, outline=None)
        grey_outline = (140, 140, 140, alpha)
        draw.rounded_rectangle(rect, radius=BUBBLE_RADIUS, fill=None, outline=grey_outline, width=1)
    else:  # speech
        draw.rounded_rectangle(rect, radius=BUBBLE_RADIUS, fill=fill, outline=outline, width=2)
        tail_y = int(rect[3])
        draw.polygon(
            [(tail_x - 8, tail_y), (tail_x + 8, tail_y), (tail_x, tail_y + 16)],
            fill=fill, outline=outline,
        )

    draw.text((x, y), wrapped, fill=text_fill, font=font)


def add_dialogue_to_panel(
    panel_img: Image.Image,
    dialogue: list[DialogueLine],
) -> Image.Image:
    """Overlay default speech bubbles (legacy fallback)."""
    img = panel_img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    font = _get_font()

    num = len(dialogue)
    if num == 0:
        return img

    spacing = img.width // (num + 1)
    for i, line in enumerate(dialogue):
        x = spacing * (i + 1) - BUBBLE_MAX_WIDTH // 4
        x = max(BUBBLE_PADDING, min(x, img.width - BUBBLE_MAX_WIDTH - BUBBLE_PADDING))
        y = 20 + i * 10
        label = f"{line.character}: {line.text}"
        _draw_styled_bubble(overlay, label, x, y, font)

    return Image.alpha_composite(img, overlay).convert("RGB")


def add_styled_bubbles_to_panel(
    panel_img: Image.Image,
    bubbles: list[DialogueBubble],
) -> Image.Image:
    """Overlay positioned/styled speech bubbles from the editor."""
    img = panel_img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    font = _get_font()
    bold_font = _get_font(bold=True)

    for b in bubbles:
        # Convert percentage position to pixels
        px = int(b.x / 100 * img.width)
        py = int(b.y / 100 * img.height)
        px = max(BUBBLE_PADDING, min(px, img.width - BUBBLE_PADDING * 2))
        py = max(BUBBLE_PADDING, min(py, img.height - BUBBLE_PADDING * 2))

        label = f"{b.character}: {b.text}" if b.show_character else b.text
        use_font = bold_font if b.style == "shout" else font

        _draw_styled_bubble(
            overlay,
            label,
            px,
            py,
            use_font,
            style=b.style,
            color=b.color,
            opacity=b.opacity,
            tail_position=getattr(b, "tail_position", "center"),
        )

    return Image.alpha_composite(img, overlay).convert("RGB")


def assemble_strip(
    panel_paths: dict[int, str],
    script: ComicScript,
    panel_order: list[int] | None = None,
    output_path: str | None = None,
    fmt: str = "png",
    panel_bubbles: dict[str, list[DialogueBubble]] | None = None,
) -> str:
    """Combine panels into a horizontal strip image.

    If panel_bubbles is provided, uses positioned/styled bubbles.
    Otherwise falls back to default speech bubbles from the script.
    """
    order = panel_order or sorted(panel_paths.keys())
    panels: list[Image.Image] = []

    for pn in order:
        path = panel_paths.get(pn, "")
        if not path or path.startswith("ERROR"):
            img = Image.new("RGB", PANEL_SIZE, (200, 200, 200))
            draw = ImageDraw.Draw(img)
            draw.text((300, 480), f"Panel {pn}\n(generation failed)", fill=(100, 100, 100))
            panels.append(img)
            continue

        img = Image.open(path).resize(PANEL_SIZE)

        # Use styled bubbles if available, else fall back to default
        pn_key = str(pn)
        if panel_bubbles and pn_key in panel_bubbles and panel_bubbles[pn_key]:
            img = add_styled_bubbles_to_panel(img, panel_bubbles[pn_key])
        else:
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
