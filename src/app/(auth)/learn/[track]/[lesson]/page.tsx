"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { LessonRenderer } from "@/components/learn/LessonRenderer";
import { QuizQuestion } from "@/components/learn/QuizQuestion";
import { PcPartsGame } from "@/components/game/PcPartsGame";
import toast from "react-hot-toast";

export default function LessonPage({ params }: { params: Promise<{ track: string; lesson: string }> }) {
  const { track: slug, lesson: lessonId } = use(params);
  const lesson     = useQuery(api.lessons.getById, { lessonId: lessonId as Id<"lessons"> });
  const trackData  = useQuery(api.tracks.getBySlug, { slug });
  const questions  = useQuery(api.lessons.getQuestions, { lessonId: lessonId as Id<"lessons"> });
  const bestAttempt = useQuery(api.attempts.getBestForLesson, { lessonId: lessonId as Id<"lessons"> });
  const submitAttempt = useMutation(api.attempts.submit);

  const [result, setResult] = useState<{ score: number; max: number } | null>(null);

  async function handleComplete(score: number, max: number, answers?: number[]) {
    if (!trackData || !lesson) return;
    setResult({ score, max });
    await submitAttempt({ lessonId: lesson._id, trackId: trackData._id, score, maxScore: max, answers });
    const pct = max > 0 ? Math.round((score / max) * 100) : 100;
    const praise = pct >= 80 ? "🏆 Excellent!" : pct >= 60 ? "⭐ Good job!" : "📚 Keep going!";
    toast.success(`${praise} ${pct}%`, { duration: 3000 });
  }

  if (!lesson || !trackData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded-xl w-3/4" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 rounded-xl w-1/2" style={{ background: "var(--surface-2)" }} />
          <div className="card h-64" style={{ background: "var(--surface-2)" }} />
        </div>
      </div>
    );
  }

  const pct = result ? Math.round((result.score / result.max) * 100) : 0;
  const isLegacyQuiz = lesson.type === "quiz";
  const isLegacyGame = lesson.type === "game";
  const isContentBased = lesson.type === "content" || lesson.type === "mandatory";

  const alreadyCompleted = bestAttempt !== undefined && bestAttempt !== null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link href={`/learn/${slug}`} className="flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Back to {trackData.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${trackData.color}22`, color: trackData.color }}>
            {lesson.type === "mandatory" ? "Mandatory Work" : lesson.type.charAt(0).toUpperCase() + lesson.type.slice(1)}
          </span>
          {alreadyCompleted && (
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#0EA5E922", color: "#0EA5E9" }}>
              Best: {Math.round((bestAttempt!.score / bestAttempt!.maxScore) * 100)}%
            </span>
          )}
        </div>
        <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>{lesson.title}</h1>
      </div>

      {/* Results banner (shown right after completing this session) */}
      {result && (
        <div className="card p-6 mb-6 text-center">
          <div className="text-5xl mb-3">{pct >= 80 ? "🏆" : pct >= 60 ? "⭐" : "📚"}</div>
          <p className="text-4xl font-black gradient-text mb-1">{pct}%</p>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good job!" : "Keep practicing!"}
          </p>
          <Link
            href={`/learn/${slug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <BookOpen size={13} /> Back to Track
          </Link>
        </div>
      )}

      {/* Main lesson content */}
      {!result && (
        <div className="card p-8 mb-6">
          {/* Content + block-based lessons (crossword, quiz blocks, etc.) */}
          {isContentBased && (
            <LessonRenderer
              contentJson={lesson.content}
              onComplete={handleComplete}
            />
          )}

          {/* Legacy standalone quiz */}
          {isLegacyQuiz && questions && questions.length > 0 && (
            <QuizQuestion questions={questions} onComplete={handleComplete} />
          )}

          {/* Legacy PC parts game */}
          {isLegacyGame && (
            <PcPartsGame onComplete={(s, m) => handleComplete(s, m)} />
          )}
        </div>
      )}

      {/* Back link after result */}
      {result && (
        <Link href={`/learn/${slug}`} className="block text-center text-sm hover:opacity-70 transition-opacity mt-2" style={{ color: "var(--text-muted)" }}>
          ← All lessons in {trackData.name}
        </Link>
      )}
    </div>
  );
}
