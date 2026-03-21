"use client";

import { type ComicScript, type PanelScript } from "@/lib/api";

interface Props {
  script: ComicScript;
  onEditPanel: (panelNumber: number, updated: PanelScript) => void;
  onConfirm: () => void;
  loading: boolean;
}

export default function ScriptPreview({ script, onEditPanel, onConfirm, loading }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900">{script.title}</h2>
        <p className="text-sm text-stone-500 mt-1">
          Style: {script.art_style}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {script.panels.map((panel) => (
          <div
            key={panel.panel_number}
            className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-violet-600 uppercase">
                Panel {panel.panel_number}
              </span>
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
              <p className="text-xs text-stone-400 italic">
                {panel.expression_notes}
              </p>
            )}
          </div>
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
