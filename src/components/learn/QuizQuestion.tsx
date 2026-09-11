"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  _id: string;
  question: string;
  options: string[];
  order: number;
}

interface Props {
  lessonId: Id<"lessons">;
  questions: Question[];
  onComplete: (payload: { answers: number[] }) => void;
}

export function QuizQuestion({ lessonId, questions, onComplete }: Props) {
  const checkQuestion = useMutation(api.lessons.checkQuestion);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    correctIndex: number;
    explanation?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const q = sorted[current];

  function handleSelect(idx: number) {
    if (submitted) return;
    setSelected(idx);
  }

  async function handleSubmit() {
    if (selected === null || !q) return;
    setChecking(true);
    try {
      const result = await checkQuestion({
        lessonId,
        questionId: q._id as Id<"quizQuestions">,
        selected,
      });
      setFeedback(result);
      setSubmitted(true);
    } finally {
      setChecking(false);
    }
  }

  function handleNext() {
    const newAnswers = [...answers, selected!];
    if (current === sorted.length - 1) {
      setDone(true);
      onComplete({ answers: newAnswers });
    } else {
      setAnswers(newAnswers);
      setCurrent(current + 1);
      setSelected(null);
      setSubmitted(false);
      setFeedback(null);
    }
  }

  if (done || !q) return null;

  const pct = Math.round((current / sorted.length) * 100);
  const isCorrect = feedback?.correct ?? false;
  const correctIndex = feedback?.correctIndex;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
          <span>Question {current + 1} of {sorted.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "var(--surface-2)" }}>
          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h3 className="text-xl font-bold leading-snug" style={{ color: "var(--text)" }}>{q.question}</h3>

      <div className="grid gap-3">
        {q.options.map((opt, idx) => {
          let borderColor = "var(--border)";
          let bg = "var(--surface)";
          let textColor = "var(--text)";

          if (submitted && correctIndex !== undefined) {
            if (idx === correctIndex) { borderColor = "#0EA5E9"; bg = "#0EA5E915"; textColor = "#0EA5E9"; }
            else if (idx === selected) { borderColor = "#EF4444"; bg = "#EF444415"; textColor = "#EF4444"; }
          } else if (idx === selected) {
            borderColor = "#2563EB";
            bg = "#2563EB15";
            textColor = "#2563EB";
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className={cn(
                "w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium text-sm",
                !submitted && "hover:scale-[1.01] active:scale-[0.99]",
                submitted && "cursor-default"
              )}
              style={{ borderColor, background: bg, color: textColor }}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ borderColor }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {opt}
                {submitted && idx === correctIndex && <CheckCircle size={16} className="ml-auto flex-shrink-0" />}
                {submitted && idx === selected && idx !== correctIndex && <XCircle size={16} className="ml-auto flex-shrink-0" />}
              </span>
            </button>
          );
        })}
      </div>

      {submitted && feedback?.explanation && (
        <div className="rounded-xl p-4 text-sm" style={{ background: isCorrect ? "#0EA5E915" : "#EF444415", color: isCorrect ? "#0EA5E9" : "#EF4444", border: `1px solid ${isCorrect ? "#0EA5E933" : "#EF444433"}` }}>
          <strong>{isCorrect ? "Correct!" : "Not quite."}</strong> {feedback.explanation}
        </div>
      )}

      {!submitted ? (
        <button
          onClick={() => void handleSubmit()}
          disabled={selected === null || checking}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-500 to-pink-500"
        >
          {checking ? "Checking…" : "Submit Answer"}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 transition-all"
        >
          {current === sorted.length - 1 ? "See Results" : "Next Question →"}
        </button>
      )}
    </div>
  );
}
