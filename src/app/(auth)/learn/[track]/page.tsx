"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Play, RotateCcw, Trophy } from "lucide-react";
import { TrackIcon } from "@/lib/trackIcons";
import { LESSON_TYPE_ICON, LESSON_TYPE_LABEL, estimateMinutes, isScoredType, pctOf } from "@/lib/lessonMeta";

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-bold leading-none" style={{ color: "var(--text)" }}>{pct}%</span>
        <span className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: "var(--text-muted)" }}>done</span>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="index-card plain px-5 pb-4 pt-0">
      <div className="index-card-title">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <p className="font-serif text-3xl font-bold leading-none mt-1" style={{ color: "var(--text)" }}>{value}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track: slug } = use(params);
  const trackData = useQuery(api.tracks.getBySlug, { slug });
  const lessons = useQuery(api.lessons.listByTrack, trackData ? { trackId: trackData._id } : "skip");
  const myAttempts = useQuery(api.attempts.getMyAttempts);
  const allTracks = useQuery(api.tracks.list);

  const sorted = useMemo(() => (lessons ? [...lessons].sort((a, b) => a.order - b.order) : []), [lessons]);

  // Best attempt per lesson, scoped to this track.
  const bestByLesson = useMemo(() => {
    const map = new Map<string, { score: number; max: number }>();
    if (!myAttempts || !trackData) return map;
    for (const a of myAttempts) {
      if (a.trackId !== trackData._id) continue;
      const prev = map.get(a.lessonId);
      if (!prev || pctOf(a.score, a.maxScore) > pctOf(prev.score, prev.max)) {
        map.set(a.lessonId, { score: a.score, max: a.maxScore });
      }
    }
    return map;
  }, [myAttempts, trackData]);

  const completed = sorted.filter((l) => bestByLesson.has(l._id)).length;
  const total = sorted.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextLesson = sorted.find((l) => !bestByLesson.has(l._id)) ?? null;
  const volume = allTracks
    ? [...allTracks].sort((a, b) => a.order - b.order).findIndex((t) => t.slug === slug) + 1
    : 0;

  const scored = sorted.filter((l) => isScoredType(l.type) && bestByLesson.has(l._id));
  const trackTestAvg = scored.length
    ? Math.round(scored.reduce((s, l) => { const b = bestByLesson.get(l._id)!; return s + pctOf(b.score, b.max); }, 0) / scored.length)
    : null;
  const minutesLeft = sorted
    .filter((l) => !bestByLesson.has(l._id))
    .reduce((s, l) => s + estimateMinutes(l.type, l.content), 0);

  if (!trackData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-44 rounded-2xl" style={{ background: "var(--surface-2)" }} />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl" style={{ background: "var(--surface-2)" }} />)}
          </div>
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--surface-2)" }} />)}
        </div>
      </div>
    );
  }

  const color = trackData.color;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/learn" className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Back to the library
      </Link>

      {/* Cover */}
      <div className="book-cover mb-6" style={{ ["--book-color" as string]: color }}>
        <div className="relative z-10 flex-1 min-w-0 p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}1a`, border: `1px solid ${color}44` }}>
                <TrackIcon slug={trackData.slug} icon={trackData.icon} size={24} style={{ color }} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
                {volume > 0 ? `Volume ${String(volume).padStart(2, "0")}` : "Track"} · {total} {total === 1 ? "chapter" : "chapters"}
              </p>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-2" style={{ color: "var(--text)" }}>
              {trackData.name}
            </h1>
            <p className="text-sm leading-6 mb-5 max-w-xl" style={{ color: "var(--text-muted)" }}>{trackData.description}</p>

            <div className="flex flex-wrap items-center gap-3">
              {pct === 100 ? (
                <>
                  <span className="stamp green"><Trophy size={12} /> Completed</span>
                  {sorted[0] && (
                    <Link href={`/learn/${slug}/${sorted[0]._id}`} className="btn-paper btn-sm">
                      <RotateCcw size={13} /> Review from chapter 1
                    </Link>
                  )}
                </>
              ) : nextLesson ? (
                <Link href={`/learn/${slug}/${nextLesson._id}`} className="btn-ink btn-sm">
                  <Play size={13} />
                  {completed === 0 ? "Start chapter 1" : `Continue · chapter ${sorted.indexOf(nextLesson) + 1}`}
                </Link>
              ) : null}
              {minutesLeft > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Clock size={12} /> about {minutesLeft} min left
                </span>
              )}
            </div>
          </div>

          <ProgressRing pct={pct} color={color} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Stat label="Chapters done" value={`${completed}/${total}`} sub={nextLesson ? `Next: ${nextLesson.title}` : "All chapters finished"} />
        <Stat
          label="Test avg · this track"
          value={trackTestAvg === null ? "—" : `${trackTestAvg}%`}
          sub={trackTestAvg === null ? "Finish a quiz or game to get a score" : `Best attempt on ${scored.length} graded ${scored.length === 1 ? "chapter" : "chapters"}`}
        />
        <Stat
          label="Graded chapters"
          value={String(sorted.filter((l) => isScoredType(l.type)).length)}
          sub="Quizzes, games, and mandatory work"
        />
      </div>

      {/* Table of contents */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="eyebrow mb-2">Table of contents</p>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>Chapters</h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Work through them in order; you can revisit any time.</p>
      </div>

      <div className="card overflow-hidden">
        {!lessons ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }} />)
        ) : sorted.length === 0 ? (
          <p className="p-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>No chapters have been published for this track yet.</p>
        ) : (
          sorted.map((lesson, idx) => {
            const best = bestByLesson.get(lesson._id);
            const isDone = !!best;
            const isNext = nextLesson?._id === lesson._id;
            const TypeIcon = LESSON_TYPE_ICON[lesson.type];
            const minutes = estimateMinutes(lesson.type, lesson.content);
            return (
              <Link
                key={lesson._id}
                href={`/learn/${slug}/${lesson._id}`}
                className="group flex items-center gap-4 px-5 sm:px-6 py-4 transition-colors hover:bg-[var(--surface-2)]"
                style={{
                  borderBottom: idx < sorted.length - 1 ? "1px solid var(--border)" : undefined,
                  boxShadow: isNext ? `inset 4px 0 0 ${color}` : undefined,
                  background: isNext ? `${color}0d` : undefined,
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-serif font-bold text-base"
                  style={isDone
                    ? { background: "#15803D1a", color: "#15803D" }
                    : { background: `${color}18`, color }}
                >
                  {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="toc-row">
                    <p className="font-semibold text-[15px] truncate" style={{ color: "var(--text)" }}>{lesson.title}</p>
                    <span className="toc-leader hidden sm:block" />
                    <span className="text-sm font-semibold flex-shrink-0 hidden sm:inline" style={{ color: isDone ? "#15803D" : "var(--text-muted)" }}>
                      {isDone ? `${pctOf(best.score, best.max)}%` : isNext ? "Up next" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="inline-flex items-center gap-1.5">
                      <TypeIcon size={12} style={{ color }} /> {LESSON_TYPE_LABEL[lesson.type]}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {minutes} min</span>
                    {isDone && <span className="sm:hidden font-semibold" style={{ color: "#15803D" }}>· {pctOf(best.score, best.max)}%</span>}
                  </div>
                </div>

                <ArrowRight size={16} className="flex-shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color }} />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
