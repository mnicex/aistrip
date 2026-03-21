"""Strip management router — export, dialogue update."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from config import Settings, get_settings
from models.schemas import (
    DialogueUpdateRequest,
    StripExportRequest,
)
from services.compositor import assemble_strip

router = APIRouter(prefix="/api/strips", tags=["strips"])


@router.post("/export")
async def export_strip(
    req: StripExportRequest,
    settings: Settings = Depends(get_settings),
) -> FileResponse:
    strip_dir = Path(settings.output_dir) / req.strip_id
    if not strip_dir.exists():
        raise HTTPException(404, "Strip not found — generate images first")

    panel_paths: dict[int, str] = {}
    for pn in req.panel_order:
        p = strip_dir / f"panel_{pn}.png"
        if p.exists():
            panel_paths[pn] = str(p)

    out_path = str(strip_dir / f"strip.{req.format}")
    assemble_strip(
        panel_paths=panel_paths,
        script=req.script,
        panel_order=req.panel_order,
        output_path=out_path,
        fmt=req.format,
    )

    return FileResponse(
        out_path,
        media_type=f"image/{req.format}",
        filename=f"{req.strip_id}_strip.{req.format}",
    )
