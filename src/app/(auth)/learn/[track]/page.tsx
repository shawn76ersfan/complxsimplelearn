"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Gamepad2, HelpCircle, CheckCircle, PenLine } from "lucide-react";

const LESSON_TYPE_ICONS = {
  content:   BookOpen,
  quiz:      HelpCircle,
  game:      Gamepad2,
  mandatory: PenLine,
};

const LESSON_TYPE_LABELS = {
  content:   "Lesson",
  quiz:      "Quiz",
  game:      "Game",
  mandatory: "Mandatory Work",
};

export default function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: slug } = use(params);
  const trackData = useQuery(api.tracks.getBySlug, { slug });
  const lessons = useQuery(
    api.lessons.listByTrack,
    trackData ? { trackId: trackData._id } : "skip"
  );
  const progress = useQuery(
    api.attempts.getTrackProgress,
    trackData ? { trackId: trackData._id } : "skip"
  );
  const myAttempts = useQuery(api.attempts.getMyAttempts);

  const completedLessonIds = new Set(myAttempts?.map((a) => a.lessonId.toString()) ?? []);
  const pct = progress?.percentage ?? 0;

  if (!trackData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 rounded-xl w-1/2" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 rounded-xl w-3/4" style={{ background: "var(--surface-2)" }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link href="/learn" className="flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> All Tracks
      </Link>

      {/* Header card — elevation only, no hard colored border */}
      <div className="card p-8 mb-8">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: `${trackData.color}18` }}
          >
            {trackData.icon === "cpu" ? "🖥️" : trackData.icon === "brain" ? "🧠" : trackData.icon === "shield" ? "🛡️" : trackData.icon === "terminal" ? "🐧" : "💻"}
          </div>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
              {trackData.name}
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>{trackData.description}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>{progress?.completed ?? 0} of {progress?.total ?? 0} lessons completed</span>
            <span className="font-semibold" style={{ color: "var(--primary)" }}>{pct}%</span>
          </div>
          <div className="w-full" style={{ height: "6px", background: "var(--surface-2)", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(135deg, var(--primary), var(--accent))", borderRadius: "999px", transition: "width 0.7s ease" }}
            />
          </div>
        </div>
      </div>

      {/* Lessons list */}
      <div className="flex flex-col gap-2">
        {!lessons
          ? [1, 2, 3].map((i) => (
              <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />
            ))
          : lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson, idx) => {
                const isCompleted = completedLessonIds.has(lesson._id);
                const Icon = LESSON_TYPE_ICONS[lesson.type];
                return (
                  <Link
                    key={lesson._id}
                    href={`/learn/${slug}/${lesson._id}`}
                    className="card px-6 py-4 flex items-center gap-5 group transition-all"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--surface-2)";
                      e.currentTarget.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--surface)";
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {/* Step number / completed indicator */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-sm"
                      style={
                        isCompleted
                          ? { background: "#0EA5E922", color: "#0EA5E9" }
                          : { background: `${trackData.color}20`, color: trackData.color, fontWeight: 700, borderRadius: "8px" }
                      }
                    >
                      {isCompleted ? <CheckCircle size={17} /> : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Type + completed labels */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: trackData.color,
                            background: `${trackData.color}18`,
                            padding: "2px 8px",
                            borderRadius: "99px",
                          }}
                        >
                          {LESSON_TYPE_LABELS[lesson.type]}
                        </span>
                        {isCompleted && (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              color: "#0369A1",
                              background: "#0EA5E914",
                              padding: "2px 8px",
                              borderRadius: "99px",
                            }}
                          >
                            Completed
                          </span>
                        )}
                      </div>
                      <p className="font-bold" style={{ color: "var(--text)", fontSize: "15px", letterSpacing: "-0.01em" }}>{lesson.title}</p>
                    </div>

                    <Icon size={16} className="flex-shrink-0 group-hover:translate-x-1 transition-all" style={{ color: trackData.color, opacity: 0.5 }} />
                  </Link>
                );
              })}
      </div>
    </div>
  );
}
