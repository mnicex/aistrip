const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CharacterDef {
  name: string;
  appearance: string;
  personality: string;
  reference_image_b64?: string;
}

export interface DialogueLine {
  character: string;
  text: string;
}

export interface PanelScript {
  panel_number: number;
  scene_description: string;
  dialogue: DialogueLine[];
  expression_notes: string;
}

export interface ComicScript {
  title: string;
  art_style: string;
  panels: PanelScript[];
}

export interface StripCreateResponse {
  strip_id: string;
  script: ComicScript;
}

export async function generateScript(
  idea: string,
  characters: CharacterDef[],
  numPanels: number
): Promise<StripCreateResponse> {
  const res = await fetch(`${API_BASE}/api/scripts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idea,
      characters,
      num_panels: numPanels,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function generateImages(
  stripId: string,
  script: ComicScript,
  characters: CharacterDef[]
): Promise<{ strip_id: string; panels: Record<number, string> }> {
  const res = await fetch(`${API_BASE}/api/images/generate-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strip_id: stripId, script, characters }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function regeneratePanel(
  stripId: string,
  panelNumber: number,
  script: ComicScript,
  characters: CharacterDef[],
  customPrompt?: string
): Promise<{ strip_id: string; panel_number: number; image_url: string }> {
  const res = await fetch(`${API_BASE}/api/images/regenerate-panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strip_id: stripId,
      panel_number: panelNumber,
      script,
      characters,
      custom_prompt: customPrompt,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function exportStrip(
  stripId: string,
  panelOrder: number[],
  script: ComicScript,
  format: "png" | "jpg" = "png"
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/strips/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strip_id: stripId,
      panel_order: panelOrder,
      format,
      script,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}

export function panelImageUrl(stripId: string, panelNumber: number): string {
  return `${API_BASE}/output/${stripId}/panel_${panelNumber}.png`;
}

// --- Idea Refinement ---

export interface IdeaRefineResponse {
  refined_idea: string;
  suggestions: string[];
}

export async function refineIdea(
  roughIdea: string,
  feedback: string = "",
  previousRefined: string = ""
): Promise<IdeaRefineResponse> {
  const res = await fetch(`${API_BASE}/api/scripts/refine-idea`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rough_idea: roughIdea,
      feedback,
      previous_refined: previousRefined,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Character Image Description ---

export interface DescribeCharacterResponse {
  appearance: string;
  personality: string;
}

export async function describeCharacterFromImage(
  imageB64: string,
  name: string = ""
): Promise<DescribeCharacterResponse> {
  const res = await fetch(`${API_BASE}/api/scripts/describe-character`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_b64: imageB64, name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
