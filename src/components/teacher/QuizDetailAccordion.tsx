"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { useMutation } from "convex/react";
import toast from "react-hot-toast";

interface Props {
  studentId: Id<"users">;
  lessonId: Id<"lessons">;
  lessonTitle: string;
  trackColor: string;
}

function GradeForm({
  attemptId,
  suggestedPct,
  teacherGrade,
}: {
  attemptId: Id<"attempts">;
  suggestedPct: number;
  teacherGrade: number | null;
}) {
  const gradeAttempt = useMutation(api.attempts.gradeAttempt);
  const [grade, setGrade] = useState(String(teacherGrade ?? suggestedPct));
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = Number(grade);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Grade must be 0–100");
      return;
    }
    setSaving(true);
    try {
      await gradeAttempt({
        attemptId,
        grade: parsed,
        feedback: feedback.trim() || undefined,
      });
      toast.success("Test graded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-2)" }}>
      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
        {teacherGrade != null ? `Instructor grade: ${teacherGrade}%` : "Awaiting instructor grade"}
        <span className="font-normal" style={{ color: "var(--text-muted)" }}> · auto-score {suggestedPct}%</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="text-xs" style={{ color: "var(--text-muted)" }}>
          Grade %
          <input
            type="number"
            min={0}
            max={100}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-1 block w-24 rounded-lg px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </label>
        <label className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
          Note (optional)
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-1 block w-full rounded-lg px-2 py-1.5 text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </label>
        <button type="button" disabled={saving} onClick={() => void submit()} className="btn-ink btn-sm">
          Save grade
        </button>
      </div>
    </div>
  );
}

function QuizDetailBody({ studentId, lessonId }: { studentId: Id<"users">; lessonId: Id<"lessons"> }) {
  const detail = useQuery(api.attempts.getStudentQuizDetail, { studentId, lessonId });

  if (!detail) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />)}
      </div>
    );
  }

  if (!("questions" in detail) || (detail.questions.length === 0 && !detail.attemptId)) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>No quiz data available for this lesson.</p>;
  }

  return (
    <>
      {detail.attemptId && (
        <GradeForm
          attemptId={detail.attemptId}
          suggestedPct={detail.suggestedPct ?? 0}
          teacherGrade={detail.teacherGrade ?? null}
        />
      )}
      {detail.questions.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No multiple-choice questions — grade from the submission above.</p>
      ) : null}
      <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        {detail.completedAt && <span>Completed {formatDate(detail.completedAt)}</span>}
        {(detail.totalAttempts ?? 0) > 1 && <span>· {detail.totalAttempts} attempts (showing best)</span>}
        </div>
        {detail.questions.map((q, i) => {
        const hasDetail = "correct" in q;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enriched = hasDetail ? (q as any) : null;
        const correct: boolean = enriched?.correct ?? false;
        const studentAnswer: number | null = enriched?.studentAnswer ?? null;
        return (
        <div
          key={i}
          className="rounded-xl p-4 space-y-3"
          style={{
            background: correct ? "#0EA5E910" : "#EF444410",
            border: `1px solid ${correct ? "#0EA5E933" : "#EF444433"}`,
          }}
        >
          <div className="flex items-start gap-2">
            {correct
              ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#0EA5E9" }} />
              : <XCircle    size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            }
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Q{i + 1}. {q.question}
            </p>
          </div>

          <div className="pl-5 space-y-1.5">
            {q.options.map((opt, oi) => {
              const isCorrect = oi === q.correctIndex;
              const isStudentAnswer = oi === studentAnswer;
              let bg = "transparent";
              let color = "var(--text-muted)";
              let label: string | null = null;
              if (isCorrect && isStudentAnswer) { bg = "#0EA5E920"; color = "#0EA5E9"; label = "✓ Correct"; }
              else if (isCorrect)              { bg = "#0EA5E910"; color = "#0EA5E9"; label = "Correct answer"; }
              else if (isStudentAnswer)        { bg = "#EF444420"; color = "#EF4444"; label = "Student chose"; }
              return (
                <div key={oi} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: bg }}>
                  <span className="text-xs font-bold w-4 flex-shrink-0" style={{ color }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-xs flex-1" style={{ color: color !== "var(--text-muted)" ? color : "var(--text)" }}>{opt}</span>
                  {label && <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>{label}</span>}
                </div>
              );
            })}
          </div>

          {!correct && q.explanation && (
            <p className="pl-5 text-xs italic" style={{ color: "var(--text-muted)" }}>💡 {q.explanation}</p>
          )}
        </div>
      );
    })}
    </>
  );
}

export function QuizDetailAccordion({ studentId, lessonId, lessonTitle, trackColor }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-opacity hover:opacity-80"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={14} style={{ color: trackColor }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{lessonTitle}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
      </button>

      {open && (
        <div className="p-4 space-y-3" style={{ background: "var(--surface)" }}>
          <QuizDetailBody studentId={studentId} lessonId={lessonId} />
        </div>
      )}
    </div>
  );
}
