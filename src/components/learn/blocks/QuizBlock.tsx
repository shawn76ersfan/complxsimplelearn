"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckCircle, XCircle } from "lucide-react";
import { useSoundFeedback } from "@/lib/useSoundFeedback";
import { cn } from "@/lib/utils";

interface Props {
  lessonId: Id<"lessons">;
  blockIndex: number;
  question: string;
  options: string[];
  onComplete: (detail: { score: number; max: number; selected: number }) => void;
}

export function QuizBlock({ lessonId, blockIndex, question, options, onComplete }: Props) {
  const checkBlock = useMutation(api.lessons.checkBlock);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctIndex?: number;
    explanation?: string;
  } | null>(null);
  const { playCorrect, playWrong } = useSoundFeedback();

  async function handleSubmit() {
    if (selected === null) return;
    setChecking(true);
    try {
      const result = await checkBlock({ lessonId, blockIndex, selected });
      setFeedback(result);
      setSubmitted(true);
      if (result.correct) playCorrect(); else playWrong();
      onComplete({ score: result.score, max: result.maxScore, selected });
    } finally {
      setChecking(false);
    }
  }

  const isCorrect = feedback?.correct ?? false;
  const correctIndex = feedback?.correctIndex;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white mt-0.5" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>?</span>
        <p className="font-semibold leading-snug" style={{ color: "var(--text)" }}>{question}</p>
      </div>

      <div className="grid gap-2 pl-9">
        {options.map((opt, idx) => {
          let borderColor = "var(--border)";
          let bg = "var(--surface-2)";
          let color = "var(--text)";
          if (submitted && correctIndex !== undefined) {
            if (idx === correctIndex) { borderColor = "#0EA5E9"; bg = "#0EA5E912"; color = "#0EA5E9"; }
            else if (idx === selected) { borderColor = "#EF4444"; bg = "#EF444412"; color = "#EF4444"; }
          } else if (idx === selected) {
            borderColor = "#2563EB"; bg = "#2563EB12"; color = "#2563EB";
          }
          return (
            <button
              key={idx}
              disabled={submitted}
              onClick={() => setSelected(idx)}
              className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all", !submitted && "hover:scale-[1.01]")}
              style={{ borderColor, background: bg, color }}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 font-bold" style={{ borderColor, color }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
                {submitted && idx === correctIndex && <CheckCircle size={14} className="ml-auto" />}
                {submitted && idx === selected && idx !== correctIndex && <XCircle size={14} className="ml-auto" />}
              </span>
            </button>
          );
        })}
      </div>

      {submitted && feedback?.explanation && (
        <div className="ml-9 rounded-xl p-3 text-sm" style={{ background: isCorrect ? "#0EA5E912" : "#EF444412", color: isCorrect ? "#0EA5E9" : "#EF4444", border: `1px solid ${isCorrect ? "#0EA5E933" : "#EF444433"}` }}>
          <strong>{isCorrect ? "Correct!" : "Not quite."}</strong> {feedback.explanation}
        </div>
      )}

      {!submitted && (
        <button
          onClick={() => void handleSubmit()}
          disabled={selected === null || checking}
          className="ml-9 px-5 py-2 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          {checking ? "Checking…" : "Submit"}
        </button>
      )}
    </div>
  );
}
