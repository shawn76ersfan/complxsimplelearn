import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export type ScoredLessonType = "quiz" | "game" | "mandatory";

export function isScoredLessonType(type: string): type is ScoredLessonType {
  return type === "quiz" || type === "game" || type === "mandatory";
}

export type AttemptRow = {
  lessonId: Id<"lessons">;
  trackId: Id<"tracks">;
  score: number;
  maxScore: number;
};

export type LessonMeta = {
  _id: Id<"lessons">;
  type: string;
  published?: boolean;
};

export type BestAttempt = {
  lessonId: Id<"lessons">;
  trackId: Id<"tracks">;
  score: number;
  maxScore: number;
};

export function bestScoredAttempts(
  attempts: AttemptRow[],
  lessonsById: Map<string, LessonMeta>,
): BestAttempt[] {
  const best = new Map<string, BestAttempt>();
  for (const attempt of attempts) {
    const lesson = lessonsById.get(attempt.lessonId);
    if (!lesson || !isScoredLessonType(lesson.type)) continue;
    if (lesson.published === false) continue;
    const existing = best.get(attempt.lessonId);
    if (!existing || attempt.score > existing.score) {
      best.set(attempt.lessonId, {
        lessonId: attempt.lessonId,
        trackId: attempt.trackId,
        score: attempt.score,
        maxScore: attempt.maxScore,
      });
    }
  }
  return [...best.values()];
}

export function pointsAverage(
  rows: Array<{ score: number; maxScore: number }>,
): number | null {
  let totalScore = 0;
  let totalMax = 0;
  for (const row of rows) {
    if (row.maxScore <= 0) continue;
    totalScore += row.score;
    totalMax += row.maxScore;
  }
  if (totalMax <= 0) return null;
  return Math.round((totalScore / totalMax) * 100);
}

export function testAverageForAttempts(
  attempts: AttemptRow[],
  lessonsById: Map<string, LessonMeta>,
  trackId?: Id<"tracks">,
): number | null {
  const best = bestScoredAttempts(attempts, lessonsById);
  const scoped = trackId ? best.filter((row) => row.trackId === trackId) : best;
  return pointsAverage(scoped);
}

export function homeworkAverageFromSubmissions(
  rows: Array<{ grade?: number }>,
): number | null {
  const grades = rows
    .map((row) => row.grade)
    .filter((grade): grade is number => typeof grade === "number" && Number.isFinite(grade));
  if (grades.length === 0) return null;
  return Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length);
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayUTC(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

/** Count a day if the student completed a lesson or turned in homework. */
export async function bumpUserStreak(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<void> {
  const today = todayUTC();
  const yesterday = yesterdayUTC();
  const prevStreak = user.streak ?? 0;
  const prevDate = user.lastActivityDate ?? "";

  let newStreak: number;
  if (prevDate === today) newStreak = prevStreak;
  else if (prevDate === yesterday) newStreak = prevStreak + 1;
  else newStreak = 1;

  await ctx.db.patch(user._id, {
    streak: newStreak,
    lastActivityDate: today,
  });
}
