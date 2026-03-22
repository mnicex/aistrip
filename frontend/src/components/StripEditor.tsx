"use client";

import { useState, useRef } from "react";
import Image from "next/image";

import {
  type ComicScript,
  type CharacterDef,
  type DialogueLine,
  type DialogueBubble,
  type BubbleStyle,
  type BubbleConfig,
  type StripProject,
  panelImageUrl,
  regeneratePanel,
  exportStrip,
} from "@/lib/api";

/* ============ Constants ============ */

const BUBBLE_STYLES: { value: BubbleStyle; label: string; icon: string }[] = [
  { value: "speech", label: "Speech", icon: "💬" },
  { value: "thought", label: "Thought", icon: "💭" },
  { value: "shout", label: "Shout", icon: "💥" },
  { value: "whisper", label: "Whisper", icon: "🤫" },
  { value: "narrator", label: "Narrator", icon: "📝" },
];

const COLOR_PRESETS = [
  "#FFFFFF", "#FFF9C4", "#E3F2FD", "#FCE4EC",
  "#E8F5E9", "#FFF3E0", "#F3E5F5", "#E0E0E0",
];

/* ============ Helpers ============ */

function makeBubbleConfig(index: number, total: number): BubbleConfig {
  const spacing = 60 / Math.max(total, 1);
  return {
    x: 8 + spacing * index,
    y: 4 + (index % 2) * 14,
    style: "speech",
    color: "#FFFFFF",
    opacity: 0.92,
    showCharacter: true,
  };
}

function dialogueToBubbles(dialogue: DialogueLine[]): DialogueBubble[] {
  return dialogue.map((d, i) => ({
    character: d.character,
    text: d.text,
    bubble: makeBubbleConfig(i, dialogue.length),
  }));
}

/* ============ BubbleOverlay ============ */

function BubbleOverlay({
  bubble,
  selected,
  onSelect,
  onUpdate,
}: {
  bubble: DialogueBubble;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (b: DialogueBubble) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startRef = useRef({ mx: 0, my: 0, bx: 0, by: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    draggingRef.current = true;
    startRef.current = {
      mx: e.clientX,
      my: e.clientY,
      bx: bubble.bubble.x,
      by: bubble.bubble.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const parent = elRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dx = ((e.clientX - startRef.current.mx) / rect.width) * 100;
    const dy = ((e.clientY - startRef.current.my) / rect.height) * 100;
    const nx = Math.max(0, Math.min(85, startRef.current.bx + dx));
    const ny = Math.max(0, Math.min(80, startRef.current.by + dy));
    onUpdate({ ...bubble, bubble: { ...bubble.bubble, x: nx, y: ny } });
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const { style, color, opacity, showCharacter } = bubble.bubble;
  const displayText = showCharacter && bubble.character
    ? `${bubble.character}: ${bubble.text}`
    : bubble.text;

  // Style-specific CSS
  let shapeClass = "rounded-xl border-2 border-stone-800";
  let textClass = "text-[11px] leading-tight text-stone-900 font-medium";
  let tailEl: React.ReactNode = null;

  switch (style) {
    case "thought":
      shapeClass = "rounded-[22px] border-2 border-stone-600";
      tailEl = (
        <>
          <div
            className="absolute -bottom-2 left-5 w-3 h-3 rounded-full border-2 border-stone-600"
            style={{ backgroundColor: color }}
          />
          <div
            className="absolute -bottom-4 left-3 w-2 h-2 rounded-full border border-stone-600"
            style={{ backgroundColor: color }}
          />
        </>
      );
      break;
    case "shout":
      shapeClass = "rounded-lg border-[3px] border-stone-900";
      textClass = "text-[12px] leading-tight text-stone-900 font-extrabold uppercase";
      tailEl = (
        <div
          className="absolute -bottom-2.5 left-5"
          style={{
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: `12px solid ${color}`,
          }}
        />
      );
      break;
    case "whisper":
      shapeClass = "rounded-xl border-2 border-dashed border-stone-400";
      textClass = "text-[11px] leading-tight text-stone-500 italic";
      break;
    case "narrator":
      shapeClass = "rounded-sm border-2 border-stone-700";
      textClass = "text-[11px] leading-tight text-stone-800 italic";
      break;
    default: // speech
      tailEl = (
        <div
          className="absolute -bottom-2 left-5"
          style={{
            width: 0,
            height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: `10px solid ${color}`,
          }}
        />
      );
      break;
  }

  return (
    <div
      ref={elRef}
      className={`absolute cursor-grab active:cursor-grabbing select-none z-10
        ${selected ? "ring-2 ring-violet-500 ring-offset-1 z-20" : "hover:ring-1 hover:ring-violet-300"}
      `}
      style={{
        left: `${bubble.bubble.x}%`,
        top: `${bubble.bubble.y}%`,
        maxWidth: "52%",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`${shapeClass} px-2.5 py-1.5 relative shadow-sm`}
        style={{ backgroundColor: color, opacity }}
      >
        <p className={textClass} style={{ maxWidth: "190px", wordBreak: "break-word" }}>
          {displayText || "\u00A0"}
        </p>
        {tailEl}
      </div>
    </div>
  );
}

/* ============ BubbleToolbar ============ */

function BubbleToolbar({
  bubble,
  characterNames,
  onUpdate,
  onDelete,
  onClose,
}: {
  bubble: DialogueBubble;
  characterNames: string[];
  onUpdate: (b: DialogueBubble) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const upd = (partial: Partial<DialogueBubble>) =>
    onUpdate({ ...bubble, ...partial });
  const updCfg = (partial: Partial<BubbleConfig>) =>
    onUpdate({ ...bubble, bubble: { ...bubble.bubble, ...partial } });

  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-lg p-3 space-y-2.5 text-xs">
      {/* Character & Text */}
      <div className="flex gap-1.5">
        <select
          value={bubble.character}
          onChange={(e) => upd({ character: e.target.value })}
          className="w-28 border border-stone-300 rounded px-1.5 py-1 text-stone-900 bg-white focus:border-violet-400"
        >
          {characterNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
          {!characterNames.includes(bubble.character) && bubble.character && (
            <option value={bubble.character}>{bubble.character}</option>
          )}
        </select>
        <input
          value={bubble.text}
          onChange={(e) => upd({ text: e.target.value })}
          placeholder="Dialogue text..."
          className="flex-1 border border-stone-300 rounded px-2 py-1 text-stone-900 focus:border-violet-400"
        />
      </div>

      {/* Style */}
      <div className="flex items-center gap-1">
        <span className="text-stone-500 w-14 shrink-0">Style</span>
        <div className="flex gap-0.5">
          {BUBBLE_STYLES.map((s) => (
            <button
              key={s.value}
              onClick={() => updCfg({ style: s.value })}
              className={`px-2 py-1 rounded text-sm transition ${
                bubble.bubble.style === s.value
                  ? "bg-violet-100 border border-violet-400"
                  : "border border-stone-200 hover:bg-stone-50"
              }`}
              title={s.label}
            >
              {s.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div className="flex items-center gap-1">
        <span className="text-stone-500 w-14 shrink-0">Color</span>
        <div className="flex gap-1 flex-wrap">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => updCfg({ color: c })}
              className={`w-5 h-5 rounded-full border-2 transition ${
                bubble.bubble.color === c
                  ? "border-violet-500 scale-110"
                  : "border-stone-300 hover:border-stone-400"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={bubble.bubble.color}
            onChange={(e) => updCfg({ color: e.target.value })}
            className="w-5 h-5 cursor-pointer border-0 p-0 rounded"
            title="Custom color"
          />
        </div>
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-stone-500 w-14 shrink-0">Opacity</span>
        <input
          type="range"
          min={30}
          max={100}
          value={Math.round(bubble.bubble.opacity * 100)}
          onChange={(e) => updCfg({ opacity: parseInt(e.target.value) / 100 })}
          className="flex-1 accent-violet-600"
        />
        <span className="text-stone-400 w-8 text-right">
          {Math.round(bubble.bubble.opacity * 100)}%
        </span>
      </div>

      {/* Options row */}
      <div className="flex items-center justify-between pt-1 border-t border-stone-100">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={bubble.bubble.showCharacter}
            onChange={(e) => updCfg({ showCharacter: e.target.checked })}
            className="accent-violet-600"
          />
          <span className="text-stone-600">Show name</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="text-rose-500 hover:text-rose-700 transition"
          >
            🗑 Delete
          </button>
          <button
            onClick={onClose}
            className="text-violet-600 hover:text-violet-800 font-medium transition"
          >
            ✓ Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ PanelEditor ============ */

interface PanelData {
  panelNumber: number;
  imageUrl: string;
  bubbles: DialogueBubble[];
}

function PanelEditor({
  panel,
  characterNames,
  onUpdate,
  onRegenerate,
  regenerating,
}: {
  panel: PanelData;
  characterNames: string[];
  onUpdate: (p: PanelData) => void;
  onRegenerate: (panelNumber: number) => void;
  regenerating: boolean;
}) {
  const [selectedBubble, setSelectedBubble] = useState<number | null>(null);

  const updateBubble = (index: number, b: DialogueBubble) => {
    const updated = [...panel.bubbles];
    updated[index] = b;
    onUpdate({ ...panel, bubbles: updated });
  };

  const deleteBubble = (index: number) => {
    setSelectedBubble(null);
    onUpdate({ ...panel, bubbles: panel.bubbles.filter((_, i) => i !== index) });
  };

  const addBubble = () => {
    const newBubble: DialogueBubble = {
      character: characterNames[0] || "",
      text: "...",
      bubble: makeBubbleConfig(panel.bubbles.length, panel.bubbles.length + 1),
    };
    onUpdate({ ...panel, bubbles: [...panel.bubbles, newBubble] });
    setSelectedBubble(panel.bubbles.length);
  };

  const isError = panel.imageUrl.startsWith("ERROR");
  const sel = selectedBubble !== null ? panel.bubbles[selectedBubble] : null;

  return (
    <div className="flex-shrink-0 w-[420px] space-y-2">
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
        {/* Header */}
        <div className="bg-violet-50 px-3 py-1.5 flex items-center justify-between border-b border-violet-100">
          <span className="text-xs font-bold text-violet-600">
            Panel {panel.panelNumber}
          </span>
          <div className="flex gap-3 items-center">
            <button
              onClick={addBubble}
              className="text-xs text-violet-600 hover:text-violet-800 font-medium transition"
            >
              💬 Add bubble
            </button>
            <button
              onClick={() => onRegenerate(panel.panelNumber)}
              disabled={regenerating}
              className="text-xs text-amber-600 hover:text-amber-800 disabled:text-stone-400 transition"
            >
              {regenerating ? "⏳ Regen..." : "🔄 Regen"}
            </button>
          </div>
        </div>

        {/* Image + bubble overlays */}
        <div
          className="relative w-full aspect-square bg-stone-100 overflow-hidden"
          onClick={() => setSelectedBubble(null)}
        >
          {isError ? (
            <div className="flex items-center justify-center h-full text-rose-500 text-sm p-4 text-center">
              Generation failed. Click regenerate.
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

          {/* Bubbles */}
          {panel.bubbles.map((b, i) => (
            <BubbleOverlay
              key={i}
              bubble={b}
              selected={selectedBubble === i}
              onSelect={() => setSelectedBubble(i)}
              onUpdate={(updated) => updateBubble(i, updated)}
            />
          ))}

          {/* Hint when no bubbles */}
          {panel.bubbles.length === 0 && !isError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-white/60 text-xs bg-black/30 rounded-full px-3 py-1">
                Click &ldquo;Add bubble&rdquo; to add dialogue
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar for selected bubble */}
      {sel && selectedBubble !== null && (
        <BubbleToolbar
          bubble={sel}
          characterNames={characterNames}
          onUpdate={(b) => updateBubble(selectedBubble, b)}
          onDelete={() => deleteBubble(selectedBubble)}
          onClose={() => setSelectedBubble(null)}
        />
      )}
    </div>
  );
}

/* ============ Main Component ============ */

interface Props {
  stripId: string;
  script: ComicScript;
  characters: CharacterDef[];
  panelPaths: Record<number, string>;
  idea: string;
  savedBubbles?: Record<number, DialogueBubble[]>;
}

export default function StripEditor({
  stripId,
  script,
  characters,
  panelPaths,
  idea,
  savedBubbles,
}: Props) {
  const [panels, setPanels] = useState<PanelData[]>(() =>
    script.panels.map((p) => {
      const saved = savedBubbles?.[p.panel_number];
      return {
        panelNumber: p.panel_number,
        imageUrl: panelPaths[p.panel_number]?.startsWith("ERROR")
          ? panelPaths[p.panel_number]
          : panelImageUrl(stripId, p.panel_number),
        bubbles: saved ?? dialogueToBubbles(p.dialogue),
      };
    })
  );
  const [regeneratingPanel, setRegeneratingPanel] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const characterNames = characters.map((c) => c.name);

  const updatePanel = (panelNumber: number, data: PanelData) => {
    setPanels((prev) =>
      prev.map((p) => (p.panelNumber === panelNumber ? data : p))
    );
  };

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

  // Build script with current dialogue for export
  const currentScript = (): ComicScript => ({
    ...script,
    panels: script.panels.map((p) => {
      const edited = panels.find((ep) => ep.panelNumber === p.panel_number);
      if (!edited) return p;
      return {
        ...p,
        dialogue: edited.bubbles.map((b) => ({ character: b.character, text: b.text })),
      };
    }),
  });

  // Build bubble map for export
  const bubbleMap = (): Record<number, DialogueBubble[]> => {
    const m: Record<number, DialogueBubble[]> = {};
    for (const p of panels) m[p.panelNumber] = p.bubbles;
    return m;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const panelOrder = panels.map((p) => p.panelNumber);
      const blob = await exportStrip(stripId, panelOrder, currentScript(), bubbleMap());
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
      script: currentScript(),
      panel_order: panels.map((p) => p.panelNumber),
      panel_bubbles: bubbleMap(),
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
          Drag bubbles to position · Click to edit style & text · Regenerate panels
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-5 min-w-max px-4 items-start">
          {panels.map((panel) => (
            <PanelEditor
              key={panel.panelNumber}
              panel={panel}
              characterNames={characterNames}
              onUpdate={(p) => updatePanel(panel.panelNumber, p)}
              onRegenerate={handleRegenerate}
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
