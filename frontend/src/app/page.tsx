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
      <header className="comic-header comic-dots relative">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="action-burst">
              <span className="relative text-2xl z-10">⚡</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="comic-logo text-2xl tracking-tight">AI Strip</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-0.5">Comic Generator</span>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 text-sm">
            {(["input", "script", "editor"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                {i > 0 && (
                  <svg className="w-4 h-4 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    step === s
                      ? "bg-stone-900 text-white shadow-sm step-active"
                      : "text-stone-400 hover:text-stone-600"
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
              className="text-sm font-medium text-stone-500 hover:text-stone-900 border border-stone-300 rounded-full px-3 py-1 hover:border-stone-500 transition"
            >
              ↺ New strip
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
              <h2 className="comic-logo text-4xl mb-3">
                Turn any idea into a comic strip
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

