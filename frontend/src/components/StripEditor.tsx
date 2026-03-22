"use client";

import { useState } from "react";
import Image from "next/image";

import {
  type ComicScript,
  type CharacterDef,
  type DialogueLine,
  type StripProject,
  panelImageUrl,
  regeneratePanel,
  exportStrip,
} from "@/lib/api";

interface PanelData {
  panelNumber: number;
  imageUrl: string;
  dialogue: DialogueLine[];
}

interface Props {
  stripId: string;
  script: ComicScript;
  characters: CharacterDef[];
  panelPaths: Record<number, string>;
  idea: string;
}

function PanelCard({
  panel,
  characterNames,
  onRegenerate,
  onDialogueEdit,
  regenerating,
}: {
  panel: PanelData;
  characterNames: string[];
  onRegenerate: (panelNumber: number) => void;
  onDialogueEdit: (panelNumber: number, dialogue: DialogueLine[]) => void;
  regenerating: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editDialogue, setEditDialogue] = useState<DialogueLine[]>(panel.dialogue);

  const startEditing = () => {
    setEditDialogue(panel.dialogue);
    setEditing(true);
  };

  const save = () => {
    onDialogueEdit(panel.panelNumber, editDialogue);
    setEditing(false);
  };

  const cancel = () => {
    setEditDialogue(panel.dialogue);
    setEditing(false);
  };

  const addLine = () => {
    setEditDialogue([...editDialogue, { character: characterNames[0] || "", text: "" }]);
  };

  const removeLine = (idx: number) => {
    setEditDialogue(editDialogue.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof DialogueLine, value: string) => {
    const updated = [...editDialogue];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditDialogue(updated);
  };

  const isError = panel.imageUrl.startsWith("ERROR");

  return (
    <div className="flex-shrink-0 w-72 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
      {/* Header */}
      <div className="bg-violet-50 px-3 py-1.5 flex items-center justify-between border-b border-violet-100">
        <span className="text-xs font-bold text-violet-600">
          Panel {panel.panelNumber}
        </span>
        <button
          onClick={() => onRegenerate(panel.panelNumber)}
          disabled={regenerating}
          className="text-xs text-amber-600 hover:text-amber-800 disabled:text-stone-400 transition"
        >
          {regenerating ? "⏳ Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square bg-stone-100">
        {isError ? (
          <div className="flex items-center justify-center h-full text-rose-500 text-sm p-4 text-center">
            Generation failed. Click regenerate to retry.
          </div>
        ) : (
          <Image
            src={panel.imageUrl}
            alt={`Panel ${panel.panelNumber}`}
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      {/* Dialogue section */}
      <div className="p-3 space-y-2">
        {editing ? (
          <div className="space-y-2">
            {editDialogue.map((d, i) => (
              <div key={i} className="flex gap-1 items-start">
                {/* Character selector */}
                <select
                  value={d.character}
                  onChange={(e) => updateLine(i, "character", e.target.value)}
                  className="w-24 text-xs border border-stone-300 rounded px-1.5 py-1 text-stone-900 bg-white focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                >
                  {characterNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  {/* Allow custom if current value isn't in the list */}
                  {!characterNames.includes(d.character) && d.character && (
                    <option value={d.character}>{d.character}</option>
                  )}
                </select>
                {/* Text input */}
                <input
                  value={d.text}
                  onChange={(e) => updateLine(i, "text", e.target.value)}
                  placeholder="Dialogue text..."
                  className="flex-1 text-xs border border-stone-300 rounded px-1.5 py-1 text-stone-900 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                />
                {/* Delete line */}
                <button
                  onClick={() => removeLine(i)}
                  className="text-xs text-rose-400 hover:text-rose-600 px-1 py-1 transition"
                  title="Remove line"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Add line + actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={addLine}
                className="text-xs text-violet-600 hover:text-violet-800 transition"
              >
                + Add dialogue line
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={cancel}
                  className="text-xs text-stone-400 hover:text-stone-600 px-2 py-0.5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="text-xs bg-violet-600 text-white px-2.5 py-0.5 rounded hover:bg-violet-700 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {panel.dialogue.length > 0 ? (
              panel.dialogue.map((d, i) => (
                <p key={i} className="text-xs text-stone-700">
                  <span className="font-semibold text-stone-900">{d.character}:</span>{" "}
                  &ldquo;{d.text}&rdquo;
                </p>
              ))
            ) : (
              <p className="text-xs text-stone-400 italic">No dialogue</p>
            )}
            <button
              onClick={startEditing}
              className="text-xs text-violet-600 hover:text-violet-800 hover:underline transition mt-1"
            >
              ✏️ Edit dialogue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function StripEditor({ stripId, script, characters, panelPaths, idea }: Props) {
  const [panels, setPanels] = useState<PanelData[]>(() =>
    script.panels.map((p) => ({
      panelNumber: p.panel_number,
      imageUrl: panelPaths[p.panel_number]?.startsWith("ERROR")
        ? panelPaths[p.panel_number]
        : panelImageUrl(stripId, p.panel_number),
      dialogue: p.dialogue,
    }))
  );
  const [regeneratingPanel, setRegeneratingPanel] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const characterNames = characters.map((c) => c.name);

  const handleRegenerate = async (panelNumber: number) => {
    setRegeneratingPanel(panelNumber);
    try {
      await regeneratePanel(stripId, panelNumber, script, characters);
      setPanels((prev) =>
        prev.map((p) =>
          p.panelNumber === panelNumber
            ? { ...p, imageUrl: panelImageUrl(stripId, panelNumber) + `?t=${Date.now()}` }
            : p
        )
      );
    } catch (err) {
      console.error("Regen failed:", err);
    } finally {
      setRegeneratingPanel(null);
    }
  };

  const handleDialogueEdit = (panelNumber: number, dialogue: DialogueLine[]) => {
    setPanels((prev) =>
      prev.map((p) => (p.panelNumber === panelNumber ? { ...p, dialogue } : p))
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const panelOrder = panels.map((p) => p.panelNumber);
      const blob = await exportStrip(stripId, panelOrder, script);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${stripId}_strip.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveProject = () => {
    const project: StripProject = {
      version: 1,
      idea,
      characters,
      script,
      panel_order: panels.map((p) => p.panelNumber),
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title.replace(/[^a-zA-Z0-9]/g, "_")}.aistrip.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900">{script.title}</h2>
        <p className="text-sm text-stone-500">
          Edit dialogue · Regenerate any panel · Export your strip
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max px-4">
          {panels.map((panel) => (
            <PanelCard
              key={panel.panelNumber}
              panel={panel}
              characterNames={characterNames}
              onRegenerate={handleRegenerate}
              onDialogueEdit={handleDialogueEdit}
              regenerating={regeneratingPanel === panel.panelNumber}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={handleSaveProject}
          className="rounded-lg border border-stone-300 bg-white px-6 py-3 text-stone-700 font-medium hover:border-violet-400 hover:text-violet-700 shadow-sm transition"
        >
          💾 Save Project
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg bg-violet-600 px-8 py-3 text-white font-semibold hover:bg-violet-700 disabled:bg-violet-400 shadow-sm transition"
        >
          {exporting ? "Exporting..." : "📥 Export as PNG"}
        </button>
      </div>
    </div>
  );
}
