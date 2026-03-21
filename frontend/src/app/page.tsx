"use client";

import { useState } from "react";
import IdeaForm from "@/components/IdeaForm";
import ScriptPreview from "@/components/ScriptPreview";
import StripEditor from "@/components/StripEditor";
import {
  type CharacterDef,
  type ComicScript,
  type PanelScript,
  type StripProject,
  generateScript,
  generateImages,
} from "@/lib/api";

type Step = "input" | "script" | "editor";

export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State carried across steps
  const [stripId, setStripId] = useState("");
  const [script, setScript] = useState<ComicScript | null>(null);
  const [characters, setCharacters] = useState<CharacterDef[]>([]);
  const [panelPaths, setPanelPaths] = useState<Record<number, string>>({});
  const [currentIdea, setCurrentIdea] = useState("");

  const handleIdeaSubmit = async (
    idea: string,
    chars: CharacterDef[],
    numPanels: number
  ) => {
    setLoading(true);
    setError(null);
    setCharacters(chars);
    setCurrentIdea(idea);
    try {
      const result = await generateScript(idea, chars, numPanels);
      setStripId(result.strip_id);
      setScript(result.script);
      setStep("script");
    } catch (err: any) {
      setError(err.message || "Script generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPanel = (panelNumber: number, updated: PanelScript) => {
    if (!script) return;
    setScript({
      ...script,
      panels: script.panels.map((p) =>
        p.panel_number === panelNumber ? updated : p
      ),
    });
  };

  const handleGenerateImages = async () => {
    if (!script) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateImages(stripId, script, characters);
      setPanelPaths(result.panels);
      setStep("editor");
    } catch (err: any) {
      setError(err.message || "Image generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep("input");
    setScript(null);
    setStripId("");
    setPanelPaths({});
    setError(null);
    setCurrentIdea("");
  };

  const handleLoadProject = (project: StripProject) => {
    setCurrentIdea(project.idea);
    setCharacters(project.characters);
    setScript(project.script);
    setStripId(`loaded_${Date.now().toString(36)}`);
    setPanelPaths({});
    setError(null);
    setStep("script");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-orange-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💥</span>
            <h1 className="text-xl font-bold text-stone-900">AI Strip</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {(["input", "script", "editor"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="text-stone-300">→</span>}
                <span
                  className={`px-3 py-1 rounded-full transition ${
                    step === s
                      ? "bg-violet-100 text-violet-700 font-medium"
                      : "text-stone-400"
                  }`}
                >
                  {s === "input" ? "💡 Idea" : s === "script" ? "📝 Script" : "✂️ Editor"}
                </span>
              </div>
            ))}
          </div>

          {step !== "input" && (
            <button
              onClick={handleStartOver}
              className="text-sm text-stone-500 hover:text-stone-800 transition"
            >
              ← Start over
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {step === "input" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-stone-900 mb-2">
                Turn any idea into a cartoon strip
              </h2>
              <p className="text-stone-500">
                Describe your idea and characters — AI does the rest.
              </p>
            </div>
            <IdeaForm onSubmit={handleIdeaSubmit} onLoadProject={handleLoadProject} loading={loading} />
          </div>
        )}

        {step === "script" && script && (
          <ScriptPreview
            script={script}
            idea={currentIdea}
            onEditPanel={handleEditPanel}
            onConfirm={handleGenerateImages}
            loading={loading}
          />
        )}

        {step === "editor" && script && (
          <StripEditor
            stripId={stripId}
            script={script}
            characters={characters}
            panelPaths={panelPaths}
            idea={currentIdea}
          />
        )}
      </main>
    </div>
  );
}

