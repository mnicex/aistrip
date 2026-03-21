"use client";

import { useState } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  type ComicScript,
  type CharacterDef,
  type DialogueLine,
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
}

function SortablePanel({
  panel,
  onRegenerate,
  onDialogueEdit,
  regenerating,
}: {
  panel: PanelData;
  onRegenerate: (panelNumber: number) => void;
  onDialogueEdit: (panelNumber: number, dialogue: DialogueLine[]) => void;
  regenerating: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: panel.panelNumber.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editing, setEditing] = useState(false);
  const [editDialogue, setEditDialogue] = useState(panel.dialogue);

  const saveDialogue = () => {
    onDialogueEdit(panel.panelNumber, editDialogue);
    setEditing(false);
  };

  const isError = panel.imageUrl.startsWith("ERROR");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-72 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="bg-violet-50 px-3 py-1.5 cursor-grab active:cursor-grabbing flex items-center justify-between border-b border-violet-100"
      >
        <span className="text-xs font-bold text-violet-600">
          Panel {panel.panelNumber}
        </span>
        <span className="text-violet-300">⠿</span>
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

      {/* Dialogue */}
      <div className="p-3 space-y-2">
        {editing ? (
          <div className="space-y-2">
            {editDialogue.map((d, i) => (
              <div key={i} className="flex gap-1">
                <input
                  value={d.character}
                  onChange={(e) => {
                    const updated = [...editDialogue];
                    updated[i] = { ...updated[i], character: e.target.value };
                    setEditDialogue(updated);
                  }}
                  className="w-20 text-xs border border-stone-300 rounded px-1 py-0.5 text-stone-900 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                />
                <input
                  value={d.text}
                  onChange={(e) => {
                    const updated = [...editDialogue];
                    updated[i] = { ...updated[i], text: e.target.value };
                    setEditDialogue(updated);
                  }}
                  className="flex-1 text-xs border border-stone-300 rounded px-1 py-0.5 text-stone-900 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
                />
              </div>
            ))}
            <button
              onClick={saveDialogue}
              className="text-xs bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700 transition"
            >
              Save
            </button>
          </div>
        ) : (
          <>
            {panel.dialogue.map((d, i) => (
              <p key={i} className="text-xs text-stone-700">
                <strong>{d.character}:</strong> &ldquo;{d.text}&rdquo;
              </p>
            ))}
            <button
              onClick={() => {
                setEditDialogue(panel.dialogue);
                setEditing(true);
              }}
              className="text-xs text-violet-600 hover:text-violet-800 hover:underline transition"
            >
              Edit dialogue
            </button>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-stone-100 px-3 py-2">
        <button
          onClick={() => onRegenerate(panel.panelNumber)}
          disabled={regenerating}
          className="text-xs text-amber-600 hover:text-amber-800 disabled:text-stone-400 transition"
        >
          {regenerating ? "Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>
    </div>
  );
}

export default function StripEditor({ stripId, script, characters, panelPaths }: Props) {
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPanels((prev) => {
        const oldIdx = prev.findIndex((p) => p.panelNumber.toString() === active.id);
        const newIdx = prev.findIndex((p) => p.panelNumber.toString() === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleRegenerate = async (panelNumber: number) => {
    setRegeneratingPanel(panelNumber);
    try {
      const result = await regeneratePanel(stripId, panelNumber, script, characters);
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-900">{script.title}</h2>
        <p className="text-sm text-stone-500">
          Drag panels to reorder · Click to edit dialogue · Regenerate any panel
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={panels.map((p) => p.panelNumber.toString())}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 min-w-max px-4">
              {panels.map((panel) => (
                <SortablePanel
                  key={panel.panelNumber}
                  panel={panel}
                  onRegenerate={handleRegenerate}
                  onDialogueEdit={handleDialogueEdit}
                  regenerating={regeneratingPanel === panel.panelNumber}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg bg-violet-600 px-8 py-3 text-white font-semibold hover:bg-violet-700 disabled:bg-violet-400 shadow-sm transition"
        >
          {exporting ? "Exporting..." : "📥 Export Strip as PNG"}
        </button>
      </div>
    </div>
  );
}
