from __future__ import annotations

from pydantic import BaseModel, Field


class CharacterDef(BaseModel):
    name: str = Field(..., description="Character name")
    appearance: str = Field(..., description="Visual description (hair, clothes, features)")
    personality: str = Field("", description="Brief personality note for expressions")
    reference_image_b64: str | None = Field(None, description="Base64-encoded reference image")


class PanelScript(BaseModel):
    panel_number: int
    scene_description: str = Field(..., description="Visual description of the scene")
    dialogue: list[DialogueLine] = Field(default_factory=list)
    expression_notes: str = Field("", description="Character expression/pose guidance")


class DialogueLine(BaseModel):
    character: str
    text: str


class DialogueBubble(BaseModel):
    """Extended dialogue with bubble position and style for the editor/export."""
    character: str
    text: str
    x: float = Field(default=50, ge=0, le=100, description="X position as percentage")
    y: float = Field(default=10, ge=0, le=100, description="Y position as percentage")
    style: str = Field(default="speech", description="speech, thought, shout, whisper, narrator")
    color: str = Field(default="#FFFFFF", description="Bubble fill colour (hex)")
    opacity: float = Field(default=0.9, ge=0, le=1)
    show_character: bool = Field(default=True, description="Show character name in text")
    tail_position: str = Field(default="center", description="Tail direction: left, center, right")


# Rebuild PanelScript so the forward reference to DialogueLine resolves
PanelScript.model_rebuild()


class ComicScript(BaseModel):
    title: str
    art_style: str = Field(..., description="Consistent art style description")
    panels: list[PanelScript]


class StripCreateRequest(BaseModel):
    idea: str = Field(..., description="One-line idea for the comic strip")
    characters: list[CharacterDef] = Field(..., min_length=1)
    num_panels: int = Field(default=4, ge=1, le=5)


class StripCreateResponse(BaseModel):
    strip_id: str
    script: ComicScript


class PanelImageResponse(BaseModel):
    strip_id: str
    panel_number: int
    image_url: str


class StripGenerateRequest(BaseModel):
    strip_id: str
    script: ComicScript
    characters: list[CharacterDef]


class PanelRegenerateRequest(BaseModel):
    strip_id: str
    panel_number: int
    script: ComicScript
    characters: list[CharacterDef]
    custom_prompt: str | None = None


class DialogueUpdateRequest(BaseModel):
    strip_id: str
    panel_number: int
    dialogue: list[DialogueLine]


class StripExportRequest(BaseModel):
    strip_id: str
    panel_order: list[int] = Field(..., description="Ordered panel numbers to include")
    format: str = Field(default="png", pattern="^(png|jpg)$")
    script: ComicScript
    panel_bubbles: dict[str, list[DialogueBubble]] = Field(
        default_factory=dict,
        description="Optional per-panel bubble configs keyed by panel number",
    )


class IdeaRefineRequest(BaseModel):
    rough_idea: str = Field(..., description="User's rough/initial idea")
    feedback: str = Field("", description="User feedback on previous refinement")
    previous_refined: str = Field("", description="Previous AI-refined version to iterate on")


class IdeaRefineResponse(BaseModel):
    refined_idea: str
    suggestions: list[str] = Field(default_factory=list, description="Alternative directions")


class DescribeCharacterRequest(BaseModel):
    image_b64: str = Field(..., description="Base64-encoded reference image")
    name: str = Field("", description="Character name hint")


class DescribeCharacterResponse(BaseModel):
    appearance: str
    personality: str


class SuggestCharactersRequest(BaseModel):
    idea: str = Field(..., description="The comic strip idea")
    num_characters: int = Field(default=3, ge=1, le=5)


class SuggestCharactersResponse(BaseModel):
    characters: list[CharacterDef]


class RewritePanelRequest(BaseModel):
    panel: PanelScript
    instruction: str = Field(..., description="What to change (e.g. 'make the dialogue funnier')")
    art_style: str = Field("", description="Current art style for context")
    idea: str = Field("", description="Original comic idea for context")


class RewritePanelResponse(BaseModel):
    panel: PanelScript
