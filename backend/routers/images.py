"""Image generation router."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from config import Settings, get_settings
from models.schemas import (
    PanelImageResponse,
    PanelRegenerateRequest,
    StripGenerateRequest,
)
from services.image_engine import generate_all_panels, generate_panel_image

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("/generate-all")
async def generate_strip_images(
    req: StripGenerateRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    panel_paths = await generate_all_panels(
        script=req.script,
        characters=req.characters,
        strip_id=req.strip_id,
        settings=settings,
    )
    return {"strip_id": req.strip_id, "panels": panel_paths}


@router.post("/regenerate-panel", response_model=PanelImageResponse)
async def regenerate_panel(
    req: PanelRegenerateRequest,
    settings: Settings = Depends(get_settings),
) -> PanelImageResponse:
    matching = [p for p in req.script.panels if p.panel_number == req.panel_number]
    if not matching:
        from fastapi import HTTPException
        raise HTTPException(404, f"Panel {req.panel_number} not found in script")

    path = await generate_panel_image(
        panel=matching[0],
        script=req.script,
        characters=req.characters,
        strip_id=req.strip_id,
        settings=settings,
        custom_prompt=req.custom_prompt,
    )
    return PanelImageResponse(
        strip_id=req.strip_id,
        panel_number=req.panel_number,
        image_url=path,
    )
