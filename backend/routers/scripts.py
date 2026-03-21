"""Script generation and idea refinement router."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from config import Settings, get_settings
from models.schemas import (
    ComicScript,
    DescribeCharacterRequest,
    DescribeCharacterResponse,
    IdeaRefineRequest,
    IdeaRefineResponse,
    StripCreateRequest,
    StripCreateResponse,
)
from services.idea_refiner import refine_idea
from services.script_engine import generate_script
from services.vision_describer import describe_character_from_image

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


@router.post("/generate", response_model=StripCreateResponse)
async def create_script(
    req: StripCreateRequest,
    settings: Settings = Depends(get_settings),
) -> StripCreateResponse:
    strip_id = uuid.uuid4().hex[:12]
    script = await generate_script(
        idea=req.idea,
        characters=req.characters,
        num_panels=req.num_panels,
        settings=settings,
    )
    return StripCreateResponse(strip_id=strip_id, script=script)


@router.post("/refine-idea", response_model=IdeaRefineResponse)
async def refine_idea_endpoint(
    req: IdeaRefineRequest,
    settings: Settings = Depends(get_settings),
) -> IdeaRefineResponse:
    result = await refine_idea(
        rough_idea=req.rough_idea,
        feedback=req.feedback,
        previous_refined=req.previous_refined,
        settings=settings,
    )
    return IdeaRefineResponse(
        refined_idea=result.get("refined_idea", req.rough_idea),
        suggestions=result.get("suggestions", []),
    )


@router.post("/describe-character", response_model=DescribeCharacterResponse)
async def describe_character_endpoint(
    req: DescribeCharacterRequest,
    settings: Settings = Depends(get_settings),
) -> DescribeCharacterResponse:
    result = await describe_character_from_image(
        image_b64=req.image_b64,
        name=req.name,
        settings=settings,
    )
    return DescribeCharacterResponse(
        appearance=result.get("appearance", ""),
        personality=result.get("personality", ""),
    )
