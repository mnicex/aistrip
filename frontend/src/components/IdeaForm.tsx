"use client";

import { useState, useRef, useCallback } from "react";
import { type CharacterDef, type StripProject, describeCharacterFromImage, suggestCharacters } from "@/lib/api";
import IdeaRefiner from "./IdeaRefiner";

interface Props {
  onSubmit: (idea: string, characters: CharacterDef[], numPanels: number) => void;
  onLoadProject: (project: StripProject) => void;
  loading: boolean;
}

interface CharacterUI extends CharacterDef {
  imagePreview?: string;
  describing?: boolean;
}

export default function IdeaForm({ onSubmit, onLoadProject, loading }: Props) {
  const [idea, setIdea] = useState("");
  const [numPanels, setNumPanels] = useState(4);
  const [characters, setCharacters] = useState<CharacterUI[]>([
    { name: "", appearance: "", personality: "" },
  ]);
  const [suggesting, setSuggesting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const projectInputRef = useRef<HTMLInputElement | null>(null);

  const handleProjectFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const project = JSON.parse(reader.result as string) as StripProject;
        if (project.script && project.characters) {
          onLoadProject(project);
        }
      } catch {
        console.error("Invalid project file");
      }
    };
    reader.readAsText(file);
  }, [onLoadProject]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".json")) {
      handleProjectFile(file);
    }
  }, [handleProjectFile]);

  const handleSuggestCharacters = async () => {
    if (!idea.trim()) return;
    setSuggesting(true);
    setAiError(null);
    try {
      const result = await suggestCharacters(idea);
      setCharacters(result.characters.map((c) => ({ ...c })));
    } catch (err: any) {
      setAiError(err.message || "Failed to suggest characters — please try again.");
    } finally {
      setSuggesting(false);
    }
  };

  const addCharacter = () => {
    if (characters.length < 5) {
      setCharacters([...characters, { name: "", appearance: "", personality: "" }]);
    }
  };

  const removeCharacter = (idx: number) => {
    setCharacters(characters.filter((_, i) => i !== idx));
  };

  const updateCharacter = (idx: number, field: keyof CharacterDef, value: string) => {
    const updated = [...characters];
    updated[idx] = { ...updated[idx], [field]: value };
    setCharacters(updated);
  };

  const handleImageUpload = async (idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(",")[1];

      // Show preview and set loading state
      const updated = [...characters];
      updated[idx] = {
        ...updated[idx],
        imagePreview: dataUrl,
        reference_image_b64: b64,
        describing: true,
      };
      setCharacters(updated);

      // Use AI vision to describe the character
      try {
        const result = await describeCharacterFromImage(b64, updated[idx].name);
        setCharacters((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            appearance: result.appearance,
            personality: result.personality || next[idx].personality,
            describing: false,
          };
          return next;
        });
      } catch (err: any) {
        const msg = err.message || "Failed to describe character from image.";
        setAiError(msg);
        setCharacters((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], describing: false };
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validChars = characters.filter((c) => c.name && c.appearance);
    if (!idea.trim() || validChars.length === 0) return;
    // Strip UI-only fields before sending
    const cleanChars: CharacterDef[] = validChars.map(({ imagePreview, describing, ...rest }) => rest);
    onSubmit(idea, cleanChars, numPanels);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 rounded-xl border-2 border-dashed border-violet-400 bg-violet-50/90 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-semibold text-violet-700">Drop .aistrip.json here</p>
            <p className="text-sm text-violet-500">Load a saved project</p>
          </div>
        </div>
      )}

      {/* Load project button */}
      <div className="mb-4 flex justify-end">

        {/* AI error banner */}
        {aiError && (
          <div className="flex-1 mr-3 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700 flex items-center justify-between">
            <span>{aiError}</span>
            <button onClick={() => setAiError(null)} className="ml-2 text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}
        <input
          ref={projectInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleProjectFile(file);
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => projectInputRef.current?.click()}
          className="text-sm text-stone-500 hover:text-violet-700 transition flex items-center gap-1"
        >
          📂 Load saved project
        </button>
      </div>

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Idea */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-700">
          Your comic idea
        </label>
        <input
          type="text"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="A cat tries to order pizza but keeps getting distracted..."
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition"
          required
        />
        <IdeaRefiner
          currentIdea={idea}
          onAccept={(refined) => setIdea(refined)}
        />
      </div>

      {/* Panel count */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Number of panels
        </label>
        <div className="flex gap-2">
          {[2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumPanels(n)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                numPanels === n
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-stone-700 border-stone-300 hover:border-violet-400 hover:text-violet-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Characters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-stone-700">Characters</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSuggestCharacters}
              disabled={suggesting || !idea.trim()}
              className="text-sm text-amber-600 hover:text-amber-800 disabled:text-stone-400 transition flex items-center gap-1"
            >
              {suggesting ? "✨ Suggesting..." : "✨ Suggest with AI"}
            </button>
            <button
              type="button"
              onClick={addCharacter}
              disabled={characters.length >= 5}
              className="text-sm text-violet-600 hover:text-violet-800 disabled:text-stone-400 transition"
            >
              + Add character
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {characters.map((char, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase">
                  Character {idx + 1}
                </span>
                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCharacter(idx)}
                    className="text-xs text-rose-500 hover:text-rose-700"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                value={char.name}
                onChange={(e) => updateCharacter(idx, "name", e.target.value)}
                placeholder="Name (e.g., Whiskers)"
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                required
              />

              {/* Reference image upload */}
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => { fileInputRefs.current[idx] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(idx, file);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[idx]?.click()}
                      disabled={char.describing}
                      className="text-xs rounded border border-stone-300 bg-white px-2.5 py-1.5 text-stone-600 hover:border-violet-400 hover:text-violet-700 disabled:text-stone-400 transition"
                    >
                      {char.describing ? "🔍 Analyzing..." : "📷 Upload reference"}
                    </button>
                    {char.imagePreview && !char.describing && (
                      <span className="text-xs text-emerald-600">✓ Image analyzed</span>
                    )}
                  </div>
                </div>
                {char.imagePreview && (
                  <div className="w-16 h-16 rounded border border-stone-200 overflow-hidden flex-shrink-0">
                    <img
                      src={char.imagePreview}
                      alt={`${char.name} reference`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <input
                type="text"
                value={char.appearance}
                onChange={(e) => updateCharacter(idx, "appearance", e.target.value)}
                placeholder={char.describing ? "Analyzing image..." : "Appearance (e.g., orange tabby cat wearing a tiny top hat)"}
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                required
              />
              <input
                type="text"
                value={char.personality}
                onChange={(e) => updateCharacter(idx, "personality", e.target.value)}
                placeholder="Personality (optional — e.g., sarcastic but lovable)"
                className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 px-6 py-3 text-white font-semibold hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-wait shadow-sm transition"
      >
        {loading ? "✨ Generating script..." : "Generate Comic Script"}
      </button>
    </form>
    </div>
  );
}
