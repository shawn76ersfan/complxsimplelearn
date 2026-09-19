"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { useCohortScope } from "./CohortContext";

function GradeForm({
  attemptId,
  suggestedPct,
}: {
  attemptId: Id<"attempts">;
  suggestedPct: number;
}) {
  const gradeAttempt = useMutation(api.attempts.gradeAttempt);
  const [grade, setGrade] = useState(String(suggestedPct));
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
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </label>
      <label className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
        Note (optional)
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback for the student"
          className="mt-1 block w-full rounded-lg px-2 py-1.5 text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </label>
      <button type="button" disabled={saving} onClick={() => void submit()} className="btn-ink btn-sm">
        Save grade
      </button>
    </div>
  );
}

export function GradeTestsPanel() {
  const { cohortId } = useCohortScope();
  const pending = useQuery(api.attempts.listPendingTests, { cohortId });

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Quizzes and mandatory work do not count toward a student&apos;s test average until you grade them. Auto-score is only a suggestion.
      </p>

      {!pending ? (
        <div className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
      ) : pending.length === 0 ? (
        <div className="card p-8 text-center">
          <ClipboardCheck size={22} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tests waiting for a grade.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <div key={row.attemptId} className="card p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{row.studentName}</p>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {row.trackName} · {row.lessonTitle}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Submitted {formatDate(row.completedAt)} · auto-score {row.suggestedPct}%
                  </p>
                </div>
                <Link
                  href={`/teacher/students/${row.studentId}`}
                  className="text-xs font-semibold hover:opacity-70"
                  style={{ color: "var(--primary)" }}
                >
                  Student page
                </Link>
              </div>
              <GradeForm attemptId={row.attemptId} suggestedPct={row.suggestedPct} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
