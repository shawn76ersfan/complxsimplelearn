"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, List, Trophy } from "lucide-react";
import { LessonRenderer } from "@/components/learn/LessonRenderer";
import { QuizQuestion } from "@/components/learn/QuizQuestion";
import { PcPartsGame } from "@/components/game/PcPartsGame";
import { TrackIcon } from "@/lib/trackIcons";
import { LESSON_TYPE_ICON, LESSON_TYPE_LABEL, estimateMinutes, isScoredType, pctOf } from "@/lib/lessonMeta";
import toast from "react-hot-toast";

export default function LessonPage({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track: slug, lesson: lessonIdParam } = use(params);
  const lessonId = lessonIdParam as Id<"lessons">;

  const lesson = useQuery(api.lessons.getById, { lessonId });
  const trackData = useQuery(api.tracks.getBySlug, { slug });
  const siblings = useQuery(api.lessons.listByTrack, trackData ? { trackId: trackData._id } : "skip");
  const questions = useQuery(api.lessons.getQuestions, { lessonId });
  const bestAttempt = useQuery(api.attempts.getBestForLesson, { lessonId });
  const myAttempts = useQuery(api.attempts.getMyAttempts);
  const submitAttempt = useMutation(api.attempts.submit);

  const [result, setResult] = useState<{ score: number; max: number } | null>(null);

  const ordered = useMemo(() => (siblings ? [...siblings].sort((a, b) => a.order - b.order) : []), [siblings]);
  const index = ordered.findIndex((l) => l._id === lessonId);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const doneIds = useMemo(() => new Set(myAttempts?.map((a) => a.lessonId) ?? []), [myAttempts]);

  async function handleComplete(payload: { answers?: number[]; blockAnswers?: Array<{
    blockIndex: number;
    selected?: number;
    texts?: string[];
    completed?: boolean;
  }> } = {}) {
    if (!lesson) return;
    try {
      const graded = await submitAttempt({
        lessonId: lesson._id,
        answers: payload.answers,
        blockAnswers: payload.blockAnswers,
      });
      setResult({ score: graded.score, max: graded.maxScore });
      const pct = pctOf(graded.score, graded.maxScore);
      const praise = pct >= 80 ? "Excellent" : pct >= 60 ? "Good job" : "Keep going";
      toast.success(`${praise} · ${pct}%`, { duration: 3000 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your score");
    }
  }

  if (!lesson || !trackData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-12 rounded-xl" style={{ background: "var(--surface-2)" }} />
          <div className="h-8 rounded-xl w-3/4" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 rounded-xl w-1/2" style={{ background: "var(--surface-2)" }} />
          <div className="card h-72" style={{ background: "var(--surface-2)" }} />
        </div>
      </div>
    );
  }

  const color = trackData.color;
  const TypeIcon = LESSON_TYPE_ICON[lesson.type];
  const minutes = estimateMinutes(lesson.type, lesson.content);
  const isLegacyQuiz = lesson.type === "quiz";
  const isLegacyGame = lesson.type === "game";
  const isContentBased = lesson.type === "content" || lesson.type === "mandatory";
  const bestPct = bestAttempt ? pctOf(bestAttempt.score, bestAttempt.maxScore) : null;
  const resultPct = result ? pctOf(result.score, result.max) : 0;
  const chapterLabel = index >= 0 ? `Chapter ${index + 1} of ${ordered.length}` : "Chapter";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Sticky reading bar */}
      <div className="card sticky top-3 z-20 px-3 sm:px-4 py-2.5 mb-8 flex items-center gap-3" style={{ backdropFilter: "blur(8px)" }}>
        <Link href={`/learn/${slug}`} className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: "var(--text)" }}>
          <ArrowLeft size={14} />
          <TrackIcon slug={trackData.slug} icon={trackData.icon} size={14} style={{ color }} />
          <span className="hidden sm:inline truncate max-w-[180px]">{trackData.name}</span>
        </Link>

        {/* Chapter dots */}
        <div className="flex-1 flex items-center gap-1 min-w-0" aria-label={chapterLabel} title={chapterLabel}>
          {ordered.map((l) => {
            const isCurrent = l._id === lessonId;
            const isDone = doneIds.has(l._id);
            return (
              <Link
                key={l._id}
                href={`/learn/${slug}/${l._id}`}
                title={l.title}
                className="flex-1 rounded-full transition-all hover:opacity-80"
                style={{
                  height: isCurrent ? 6 : 4,
                  background: isCurrent ? color : isDone ? `${color}99` : "var(--surface-2)",
                  minWidth: 6,
                }}
              />
            );
          })}
        </div>

        <span className="text-xs font-semibold flex-shrink-0 hidden sm:inline" style={{ color: "var(--text-muted)" }}>{chapterLabel}</span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <NavArrow href={prev ? `/learn/${slug}/${prev._id}` : null} label="Previous chapter"><ChevronLeft size={16} /></NavArrow>
          <NavArrow href={next ? `/learn/${slug}/${next._id}` : null} label="Next chapter"><ChevronRight size={16} /></NavArrow>
        </div>
      </div>

      {/* Title block */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: `${color}1a`, color }}>
            <TypeIcon size={12} /> {LESSON_TYPE_LABEL[lesson.type]}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <Clock size={12} /> {minutes} min
          </span>
          {isScoredType(lesson.type) && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>· counts toward your test average</span>
          )}
          {bestPct !== null && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#15803D1a", color: "#15803D" }}>
              <Trophy size={12} /> Best {bestPct}%
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color }}>{chapterLabel}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--text)" }}>{lesson.title}</h1>
      </header>

      {/* Result */}
      {result && (
        <div className="index-card plain relative px-6 sm:px-10 pb-8 pt-0 mb-6 text-center">
          <span className="washi-tape" />
          <div className="index-card-title justify-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Chapter complete</span>
          </div>
          <div className="mt-4 flex justify-center">
            <span className={`stamp ${resultPct >= 60 ? "green" : ""}`}>
              {resultPct >= 80 ? "Excellent" : resultPct >= 60 ? "Passed" : "Recorded"}
            </span>
          </div>
          <p className="font-serif text-6xl font-bold mt-5 mb-1 leading-none" style={{ color: "var(--text)" }}>{resultPct}%</p>
          <p className="text-sm mb-7" style={{ color: "var(--text-muted)" }}>
            {result.max > 1 ? `${result.score} of ${result.max} points. ` : ""}
            {resultPct >= 80 ? "You've got this material down." : resultPct >= 60 ? "Solid. A quick re-read would lock it in." : "Re-read the chapter and try again — your best score is what counts."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {next ? (
              <Link href={`/learn/${slug}/${next._id}`} className="btn-ink">
                Next: {next.title} <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href={`/learn/${slug}`} className="btn-ink">
                <Trophy size={14} /> You finished {trackData.name}
              </Link>
            )}
            <Link href={`/learn/${slug}`} className="btn-paper">
              <List size={14} /> Table of contents
            </Link>
          </div>
        </div>
      )}

      {/* Content */}
      {!result && (
        <article className="index-card plain relative px-6 sm:px-10 pb-10 pt-0" style={{ ["--track-color" as string]: color }}>
          <span className="folder-tab">{LESSON_TYPE_LABEL[lesson.type]}</span>
          <div className="index-card-title justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{trackData.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>{chapterLabel.replace(" of ", " / ")}</span>
          </div>
          <div className="mt-4">
            {isContentBased && <LessonRenderer lessonId={lesson._id} contentJson={lesson.content} onComplete={handleComplete} />}
            {isLegacyQuiz && questions && questions.length > 0 && (
              <QuizQuestion lessonId={lesson._id} questions={questions} onComplete={handleComplete} />
            )}
            {isLegacyQuiz && questions && questions.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>This quiz has no questions yet.</p>
            )}
            {isLegacyGame && <PcPartsGame onComplete={() => void handleComplete()} />}
          </div>
        </article>
      )}

      {/* Footer navigation */}
      <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
        {prev ? (
          <FooterNav href={`/learn/${slug}/${prev._id}`} side="prev" eyebrow={`Chapter ${index}`} title={prev.title} color={color} />
        ) : <span className="hidden sm:block" />}
        {next ? (
          <FooterNav href={`/learn/${slug}/${next._id}`} side="next" eyebrow={`Chapter ${index + 2}`} title={next.title} color={color} />
        ) : (
          <FooterNav href={`/learn/${slug}`} side="next" eyebrow="End of track" title="Back to the table of contents" color={color} />
        )}
      </nav>
    </div>
  );
}

function NavArrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors";
  if (!href) {
    return <span className={cls} style={{ color: "var(--text-muted)", opacity: 0.35 }} aria-disabled>{children}</span>;
  }
  return (
    <Link href={href} aria-label={label} title={label} className={`${cls} hover:bg-[var(--surface-2)]`} style={{ color: "var(--text)" }}>
      {children}
    </Link>
  );
}

function FooterNav({ href, side, eyebrow, title, color }: { href: string; side: "prev" | "next"; eyebrow: string; title: string; color: string }) {
  const isNext = side === "next";
  return (
    <Link
      href={href}
      className={`card group px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[var(--surface-2)] ${isNext ? "text-right sm:col-start-2" : ""}`}
    >
      {!isNext && <ChevronLeft size={18} className="flex-shrink-0 group-hover:-translate-x-1 transition-transform" style={{ color }} />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "var(--text-muted)" }}>{eyebrow}</p>
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{title}</p>
      </div>
      {isNext && <ChevronRight size={18} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color }} />}
    </Link>
  );
}
