"use client";

import { useState } from "react";
import { refineIdea } from "@/lib/api";

interface Props {
  currentIdea: string;
  onAccept: (refinedIdea: string) => void;
}

export default function IdeaRefiner({ currentIdea, onAccept }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refined, setRefined] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRefine = async (feedbackText = "") => {
    if (!currentIdea.trim() && !refined) return;
    setLoading(true);
    setError(null);
    try {
      const result = await refineIdea(
        currentIdea,
        feedbackText,
        refined
      );
      setRefined(result.refined_idea);
      setSuggestions(result.suggestions);
      setHistory((prev) => [...prev, result.refined_idea]);
      setFeedback("");
    } catch (err: any) {
      setError(err.message || "AI refinement failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (currentIdea.trim() && !refined) handleRefine();
        }}
        disabled={!currentIdea.trim()}
        className="text-sm text-violet-600 hover:text-violet-800 disabled:text-stone-400 transition flex items-center gap-1"
      >
        ✨ Refine with AI
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-violet-700">AI Idea Refiner</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Close
        </button>
      </div>

      {loading && !refined && (
        <p className="text-sm text-stone-500 animate-pulse">✨ Thinking...</p>
      )}

      {error && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {refined && (
        <div className="space-y-3">
          {/* Refined result */}
          <div className="rounded-md bg-white border border-violet-200 p-3">
            <p className="text-xs text-stone-400 mb-1">Refined idea:</p>
            <p className="text-sm text-stone-800 font-medium">{refined}</p>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs text-stone-400 mb-1.5">Alternative directions:</p>
              <div className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onAccept(s);
                      setRefined(s);
                    }}
                    className="block w-full text-left text-xs text-stone-600 bg-white border border-stone-200 rounded-md px-3 py-2 hover:border-violet-300 hover:text-violet-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback for iteration */}
          <div className="flex gap-2">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRefine(feedback);
                }
              }}
              placeholder="Make it funnier... add a twist... make it about food..."
              className="flex-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder-stone-400 focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
            />
            <button
              type="button"
              onClick={() => handleRefine(feedback)}
              disabled={loading}
              className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:bg-violet-400 transition"
            >
              {loading ? "..." : "Refine"}
            </button>
          </div>

          {/* Accept / Discard */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onAccept(refined);
                setOpen(false);
              }}
              className="rounded bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition"
            >
              ✓ Use this idea
            </button>
            <button
              type="button"
              onClick={() => {
                setRefined("");
                setSuggestions([]);
                setHistory([]);
                setFeedback("");
                setError(null);
              }}
              className="rounded border border-stone-300 px-4 py-1.5 text-sm text-stone-500 hover:text-stone-700 hover:border-stone-400 transition"
            >
              ✕ Discard &amp; retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
