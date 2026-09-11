import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser, getCurrentUserOrNull } from "./_lib/auth";
import { canAccessStudent, visibleStudents } from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";
import {
  bestScoredAttempts,
  bumpUserStreak,
  homeworkAverageFromSubmissions,
  testAverageForAttempts,
  type LessonMeta,
} from "./lib/scoring";
import { scoreLessonContent } from "./lib/lessonContent";

async function lessonsByIdMap(ctx: QueryCtx): Promise<Map<string, LessonMeta>> {
  const lessons = await ctx.db.query("lessons").collect();
  return new Map(lessons.map((lesson) => [lesson._id, lesson]));
}

async function homeworkAvgForStudent(
  ctx: QueryCtx,
  studentId: Id<"users">,
): Promise<number | null> {
  const rows = await ctx.db
    .query("assignmentSubmissions")
    .withIndex("by_student", (q) => q.eq("studentId", studentId))
    .collect();
  return homeworkAverageFromSubmissions(rows);
}

export const getStudentQuizDetail = query({
  args: { studentId: v.id("users"), lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const teacher = await getCurrentUserOrNull(ctx);
    if (!teacher || !isStaffRole(teacher.role)) return null;
    if (!(await canAccessStudent(ctx, teacher, args.studentId))) return null;

    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();

    const sortedQ = questions.sort((a, b) => a.order - b.order);

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_lesson", (q) => q.eq("userId", args.studentId).eq("lessonId", args.lessonId))
      .collect();

    if (!attempts.length || !sortedQ.length) return { questions: sortedQ, attempts: [] };

    const best = attempts.reduce((b, a) => (a.score > b.score ? a : b));

    const results = sortedQ.map((q, i) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      studentAnswer: best.answers?.[i] ?? null,
      correct: best.answers?.[i] === q.correctIndex,
    }));

    return {
      questions: results,
      score: best.score,
      maxScore: best.maxScore,
      completedAt: best.completedAt,
      totalAttempts: attempts.length,
    };
  },
});

export const submit = mutation({
  args: {
    lessonId: v.id("lessons"),
    answers: v.optional(v.array(v.number())),
    blockAnswers: v.optional(
      v.array(
        v.object({
          blockIndex: v.number(),
          selected: v.optional(v.number()),
          texts: v.optional(v.array(v.string())),
          completed: v.optional(v.boolean()),
        }),
      ),
    ),
  },
  returns: v.object({
    score: v.number(),
    maxScore: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || !lesson.published) throw new Error("Lesson not found");

    const questions = (
      await ctx.db
        .query("quizQuestions")
        .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
        .collect()
    ).sort((a, b) => a.order - b.order);

    let score = 0;
    let maxScore = 0;
    if (questions.length > 0) {
      const answers = args.answers ?? [];
      if (answers.length !== questions.length) {
        throw new Error("Answer every question");
      }
      maxScore = questions.length;
      score = questions.filter((question, i) => answers[i] === question.correctIndex).length;
    } else if (lesson.type === "game") {
      score = 1;
      maxScore = 1;
    } else {
      const graded = scoreLessonContent(lesson.content, args.blockAnswers ?? []);
      score = graded.score;
      maxScore = graded.maxScore;
    }

    await ctx.db.insert("attempts", {
      userId: user._id,
      lessonId: lesson._id,
      trackId: lesson.trackId,
      score,
      maxScore,
      answers: args.answers,
      completedAt: Date.now(),
    });

    await bumpUserStreak(ctx, user);
    return { score, maxScore };
  },
});

export const getMyAttempts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/** Best-attempt test average plus graded homework average for the signed-in student. */
export const getMyScoreSummary = query({
  args: {},
  returns: v.object({
    testAvg: v.union(v.number(), v.null()),
    scoredLessons: v.number(),
    completedLessons: v.number(),
    homeworkAvg: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return { testAvg: null, scoredLessons: 0, completedLessons: 0, homeworkAvg: null };
    }

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const lessonsById = await lessonsByIdMap(ctx);
    const best = bestScoredAttempts(attempts, lessonsById);

    return {
      testAvg: testAverageForAttempts(attempts, lessonsById),
      scoredLessons: best.length,
      completedLessons: new Set(attempts.map((attempt) => attempt.lessonId)).size,
      homeworkAvg: await homeworkAvgForStudent(ctx, user._id),
    };
  },
});

export const getBestForLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", user._id).eq("lessonId", args.lessonId)
      )
      .collect();
    if (!attempts.length) return null;
    return attempts.reduce((best, a) => (a.score > best.score ? a : best));
  },
});

export const getTrackProgress = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { completed: 0, total: 0, percentage: 0 };
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return { completed: 0, total: 0, percentage: 0 };

    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_track_published", (q) =>
        q.eq("trackId", args.trackId).eq("published", true)
      )
      .collect();

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_track", (q) =>
        q.eq("userId", user._id).eq("trackId", args.trackId)
      )
      .collect();

    const completedLessonIds = new Set(attempts.map((a) => a.lessonId));
    const completed = lessons.filter((l) => completedLessonIds.has(l._id)).length;
    const total = lessons.length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
});

/** First incomplete published lesson in curriculum order, for the dashboard CTA. */
export const getContinueLearning = query({
  args: {},
  returns: v.union(
    v.object({
      lessonId: v.id("lessons"),
      lessonTitle: v.string(),
      trackId: v.id("tracks"),
      trackName: v.string(),
      trackSlug: v.string(),
      trackColor: v.string(),
      completed: v.number(),
      total: v.number(),
      percentage: v.number(),
      allComplete: v.literal(false),
    }),
    v.object({
      allComplete: v.literal(true),
      completed: v.number(),
      total: v.number(),
      percentage: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const tracks = (
      await ctx.db
        .query("tracks")
        .withIndex("by_published", (q) => q.eq("published", true))
        .collect()
    ).sort((a, b) => a.order - b.order);

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const completedLessonIds = new Set(attempts.map((a) => a.lessonId));

    let totalLessons = 0;
    let completedLessons = 0;
    let next: {
      lessonId: Id<"lessons">;
      lessonTitle: string;
      trackId: Id<"tracks">;
      trackName: string;
      trackSlug: string;
      trackColor: string;
    } | null = null;

    for (const track of tracks) {
      const lessons = (
        await ctx.db
          .query("lessons")
          .withIndex("by_track_published", (q) =>
            q.eq("trackId", track._id).eq("published", true)
          )
          .collect()
      ).sort((a, b) => a.order - b.order);

      totalLessons += lessons.length;
      for (const lesson of lessons) {
        if (completedLessonIds.has(lesson._id)) {
          completedLessons += 1;
          continue;
        }
        if (!next) {
          next = {
            lessonId: lesson._id,
            lessonTitle: lesson.title,
            trackId: track._id,
            trackName: track.name,
            trackSlug: track.slug,
            trackColor: track.color,
          };
        }
      }
    }

    const percentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    if (!next) {
      if (totalLessons === 0) return null;
      return {
        allComplete: true as const,
        completed: completedLessons,
        total: totalLessons,
        percentage,
      };
    }

    return {
      ...next,
      completed: completedLessons,
      total: totalLessons,
      percentage,
      allComplete: false as const,
    };
  },
});

export const getStudentDetailForTeacher = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const teacher = await getCurrentUserOrNull(ctx);
    if (!teacher || !isStaffRole(teacher.role)) return null;
    if (!(await canAccessStudent(ctx, teacher, args.studentId))) return null;

    const student = await ctx.db.get(args.studentId);
    if (!student) return null;

    const tracks = await ctx.db.query("tracks").collect();
    const allAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();
    const lessonsById = await lessonsByIdMap(ctx);

    // Best attempt per lesson for the lesson list (any type).
    const bestPerLesson = new Map<string, { score: number; maxScore: number; completedAt: number }>();
    for (const attempt of allAttempts) {
      const key = attempt.lessonId;
      const existing = bestPerLesson.get(key);
      if (!existing || attempt.score > existing.score) {
        bestPerLesson.set(key, { score: attempt.score, maxScore: attempt.maxScore, completedAt: attempt.completedAt });
      }
    }

    const trackDetails = await Promise.all(
      tracks.map(async (track) => {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_track_published", (q) =>
            q.eq("trackId", track._id).eq("published", true)
          )
          .collect();

        const trackAttempts = allAttempts.filter((a) => a.trackId === track._id);
        const completedIds = new Set(trackAttempts.map((a) => a.lessonId));

        const lessonResults = lessons
          .sort((a, b) => a.order - b.order)
          .map((lesson) => {
            const best = bestPerLesson.get(lesson._id);
            return {
              lessonId: lesson._id,
              title: lesson.title,
              type: lesson.type,
              order: lesson.order,
              completed: completedIds.has(lesson._id),
              bestScore: best?.score ?? 0,
              bestMax: best?.maxScore ?? 1,
              completedAt: best?.completedAt ?? null,
            };
          });

        return {
          trackId: track._id,
          trackName: track.name,
          trackColor: track.color,
          trackSlug: track.slug,
          trackIcon: track.icon,
          percentage: testAverageForAttempts(allAttempts, lessonsById, track._id),
          completedLessons: completedIds.size,
          totalLessons: lessons.length,
          lessons: lessonResults,
        };
      })
    );

    return {
      student,
      trackDetails,
      overall: testAverageForAttempts(allAttempts, lessonsById),
      homeworkAvg: await homeworkAvgForStudent(ctx, args.studentId),
      totalAttempts: allAttempts.length,
    };
  },
});

export const getAllStudentScores = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const teacher = await getCurrentUserOrNull(ctx);
    if (!teacher || !isStaffRole(teacher.role)) return [];

    const students = await visibleStudents(ctx, teacher, args.cohortId);

    const tracks = await ctx.db.query("tracks").collect();
    const lessonsById = await lessonsByIdMap(ctx);

    const results = await Promise.all(
      students.map(async (student) => {
        const attempts = await ctx.db
          .query("attempts")
          .withIndex("by_user", (q) => q.eq("userId", student._id))
          .collect();

        const trackSummaries = tracks.map((track) => {
          const trackAttempts = attempts.filter((a) => a.trackId === track._id);
          return {
            trackId: track._id,
            trackName: track.name,
            trackColor: track.color,
            percentage: testAverageForAttempts(attempts, lessonsById, track._id),
            completedLessons: new Set(trackAttempts.map((a) => a.lessonId)).size,
          };
        });

        return {
          student,
          trackSummaries,
          overall: testAverageForAttempts(attempts, lessonsById),
          homeworkAvg: await homeworkAvgForStudent(ctx, student._id),
          totalAttempts: attempts.length,
        };
      })
    );

    return results;
  },
});
