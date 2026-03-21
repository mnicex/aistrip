"use client";

import { useState } from "react";
import {
  type ComicScript,
  type PanelScript,
  type DialogueLine,
  rewritePanel,
} from "@/lib/api";

interface Props {
  script: ComicScript;
  idea: string;
  onEditPanel: (panelNumber: number, updated: PanelScript) => void;
  onConfirm: () => void;
  loading: boolean;
}

function EditablePanel({
  panel,
  artStyle,
  idea,
  onUpdate,
}: {
  panel: PanelScript;
  artStyle: string;
  idea: string;
  onUpdate: (updated: PanelScript) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [scene, setScene] = useState(panel.scene_description);
  const [expression, setExpression] = useState(panel.expression_notes);
  const [dialogue, setDialogue] = useState<DialogueLine[]>(panel.dialogue);
  const [aiInstruction, setAiInstruction] = useState("");
  const [rewriting, setRewriting] = useState(false);

  const save = () => {
    onUpdate({
      ...panel,
      scene_description: scene,
      expression_notes: expression,
      dialogue,
    });
    setEditing(false);
  };

  const cancel = () => {
    setScene(panel.scene_description);
    setExpression(panel.expression_notes);
    setDialogue(panel.dialogue);
    setAiInstruction("");
    setEditing(false);
  };

  const handleAiRewrite = async () => {
    if (!aiInstruction.trim()) return;
    setRewriting(true);
    try {
      const result = await rewritePanel(panel, aiInstruction, artStyle, idea);
      const p = result.panel;
      setScene(p.scene_description);
      setExpression(p.expression_notes);
      setDialogue(p.dialogue);
      onUpdate(p);
      setAiInstruction("");
    } catch (err) {
      console.error("Rewrite failed:", err);
    } finally {
      setRewriting(false);
    }
  };

  const addDialogueLine = () => {
    setDialogue([...dialogue, { character: "", text: "" }]);
  };

  const removeDialogueLine = (idx: number) => {
    setDialogue(dialogue.filter((_, i) => i !== idx));
  };

  if (!editing) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-violet-600 uppercase">
            Panel {panel.panel_number}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-stone-400 group-hover:text-violet-600 transition"
          >
            ✏️ Edit
          </button>
        </div>

        <p className="text-sm text-stone-700 mb-3">{panel.scene_description}</p>

        {panel.dialogue.length > 0 && (
          <div className="space-y-1 mb-2">
            {panel.dialogue.map((d, i) => (
              <div key={i} className="text-sm">
                <span className="font-semibold text-stone-900">{d.character}:</span>{" "}
                <span className="text-stone-600">&ldquo;{d.text}&rdquo;</span>
              </div>
            ))}
          </div>
        )}

        {panel.expression_notes && (
          <p className="text-xs text-stone-400 italic">{panel.expression_notes}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-violet-300 bg-white p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-violet-600 uppercase">
          Panel {panel.panel_number} — Editing
        </span>
        <div className="flex gap-2">
          <button type="button" onClick={cancel} className="text-xs text-stone-400 hover:text-stone-600">
            Cancel
          </button>
          <button type="button" onClick={save} className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded hover:bg-violet-700">
            Save
          </button>
        </div>
      </div>

      {/* Scene description */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1 block">Scene description</label>
        <textarea
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          rows={3}
          className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-y"
        />
      </div>

      {/* Dialogue */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-stone-500">Dialogue</label>
          <button type="button" onClick={addDialogueLine} className="text-xs text-violet-600 hover:text-violet-800">
            + Add line
          </button>
        </div>
        <div className="space-y-2">
          {dialogue.map((d, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                value={d.character}
                onChange={(e) => {
                  const updated = [...dialogue];
                  updated[i] = { ...updated[i], character: e.target.value };
                  setDialogue(updated);
                }}
                placeholder="Who"
                className="w-24 rounded border border-stone-300 px-2 py-1 text-xs text-stone-900 focus:border-violet-400"
              />
              <input
                value={d.text}
                onChange={(e) => {
                  const updated = [...dialogue];
                  updated[i] = { ...updated[i], text: e.target.value };
                  setDialogue(updated);
                }}
                placeholder="What they say..."
                className="flex-1 rounded border border-stone-300 px-2 py-1 text-xs text-stone-900 focus:border-violet-400"
              />
              <button type="button" onClick={() => removeDialogueLine(i)} className="text-xs text-rose-400 hover:text-rose-600">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Expression notes */}
      <div>
        <label className="text-xs font-medium text-stone-500 mb-1 block">Expression / pose notes</label>
        <input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
        />
      </div>

      {/* AI rewrite */}
      <div className="rounded-md bg-violet-50 border border-violet-200 p-3 space-y-2">
        <label className="text-xs font-medium text-violet-700 block">✨ AI Rewrite</label>
        <div className="flex gap-2">
          <input
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleAiRewrite(); }
            }}
            placeholder="Make the dialogue funnier... add more action... change the mood..."
            className="flex-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-violet-400"
          />
          <button
            type="button"
            onClick={handleAiRewrite}
            disabled={rewriting || !aiInstruction.trim()}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-700 disabled:bg-violet-400 transition"
          >
            {rewriting ? "..." : "Rewrite"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScriptPreview({ script, idea, onEditPanel, onConfirm, loading }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900">{script.title}</h2>
        <p className="text-sm text-stone-500 mt-1">
          Style: {script.art_style}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          Click any panel to edit · Use AI to rewrite scenes and dialogue
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {script.panels.map((panel) => (
          <EditablePanel
            key={panel.panel_number}
            panel={panel}
            artStyle={script.art_style}
            idea={idea}
            onUpdate={(updated) => onEditPanel(panel.panel_number, updated)}
          />
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full rounded-lg bg-amber-500 px-6 py-3 text-white font-semibold hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-wait shadow-sm transition"
      >
        {loading ? "🎨 Generating images..." : "🎨 Generate Images →"}
      </button>
    </div>
  );
}
