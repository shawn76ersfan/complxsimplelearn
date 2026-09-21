"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, MessageSquareHeart } from "lucide-react";

type Pace = "too_slow" | "just_right" | "too_fast";
type Difficulty = "too_easy" | "ok" | "too_hard";
type Feeling = "struggling" | "ok" | "thriving";

export default function CheckInPage() {
  const now = useMemo(() => Date.now(), []);
  const pending = useQuery(api.surveys.pendingMine, { now });
  const submit = useMutation(api.surveys.submit);
  const [pace, setPace] = useState<Pace | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [support, setSupport] = useState(3);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!pending || !pace || !difficulty || !feeling || saving) return;
    setSaving(true);
    try {
      await submit({
        surveyId: pending._id as Id<"pulseSurveys">,
        pace,
        difficulty,
        support,
        feeling,
        comment: comment.trim() || undefined,
      });
      setDone(true);
      toast.success("Thanks — your instructor will get your answers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your check-in");
    } finally {
      setSaving(false);
    }
  }

  if (pending === undefined) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="card h-64 animate-pulse" style={{ background: "var(--surface-2)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm hover:opacity-70" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Back to your desk
      </Link>

      <div className="index-card p-6 sm:p-8 pt-0">
        <div className="index-card-title">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Two-week class survey
          </p>
        </div>
        <div className="flex items-start gap-3 mt-2 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#7C3AED22" }}>
            <MessageSquareHeart size={18} style={{ color: "#7C3AED" }} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>
              {pending && !done ? pending.title : done ? "You're all set" : "No check-in waiting"}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {done
                ? "Thanks for telling us how class feels. We'll use this to adjust the next two weeks."
                : pending
                  ? pending.prompt ?? "A few questions so your instructor can see how the last two weeks felt."
                  : "When your instructor sends the biweekly survey, it shows up here — fill it out and they'll get your answers."}
            </p>
          </div>
        </div>

        {done && (
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#10B981" }}>
            <CheckCircle2 size={16} /> Survey submitted
          </div>
        )}

        {pending && !done && (
          <div className="space-y-6">
            <Choice
              label="Pace of class"
              value={pace}
              onChange={setPace}
              options={[
                ["too_slow", "Too slow"],
                ["just_right", "Just right"],
                ["too_fast", "Too fast"],
              ]}
            />
            <Choice
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                ["too_easy", "Too easy"],
                ["ok", "About right"],
                ["too_hard", "Too hard"],
              ]}
            />
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
                How supported do you feel? {support}/5
              </p>
              <input
                type="range"
                min={1}
                max={5}
                value={support}
                onChange={(e) => setSupport(Number(e.target.value))}
                className="w-full accent-[#7C3AED]"
              />
            </div>
            <Choice
              label="How are you feeling in the program?"
              value={feeling}
              onChange={setFeeling}
              options={[
                ["struggling", "Struggling"],
                ["ok", "Okay"],
                ["thriving", "Thriving"],
              ]}
            />
            <div>
              <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--text)" }}>
                Anything we should know? (optional)
              </label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Labs, schedule, what you'd change next week…"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!pace || !difficulty || !feeling || saving}
              className="btn-ink w-full disabled:opacity-40"
            >
              {saving ? "Sending…" : "Submit survey"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | null;
  onChange: (next: T) => void;
  options: Array<[T, string]>;
}) {
  return (
    <div>
      <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="px-3 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: value === id ? "var(--ink)" : "var(--surface-2)",
              color: value === id ? "var(--paper)" : "var(--text)",
              border: `1px solid ${value === id ? "var(--ink)" : "var(--border)"}`,
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
