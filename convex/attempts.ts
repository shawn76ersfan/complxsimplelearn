import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./_lib/auth";

export const getStudentQuizDetail = query({
  args: { studentId: v.id("users"), lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const teacher = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
    if (!teacher || teacher.role !== "teacher") return null;

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

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export const submit = mutation({
  args: {
    lessonId: v.id("lessons"),
    trackId: v.id("tracks"),
    score: v.number(),
    maxScore: v.number(),
    answers: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    await ctx.db.insert("attempts", {
      userId: user._id,
      lessonId: args.lessonId,
      trackId: args.trackId,
      score: args.score,
      maxScore: args.maxScore,
      answers: args.answers,
      completedAt: Date.now(),
    });

    // Daily streak only — levels come from completed homework assignments
    const today = todayUTC();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") return null;

    const student = await ctx.db.get(args.studentId);
    if (!student) return null;

    const tracks = await ctx.db.query("tracks").collect();
    const allAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();

    // Build per-lesson best attempts map
    const bestPerLesson = new Map<string, { score: number; maxScore: number; completedAt: number }>();
    for (const attempt of allAttempts) {
      const key = attempt.lessonId as string;
      const existing = bestPerLesson.get(key);
      if (!existing || attempt.score > existing.score) {
        bestPerLesson.set(key, { score: attempt.score, maxScore: attempt.maxScore, completedAt: attempt.completedAt });
      }
    }

    const trackDetails = await Promise.all(
      tracks.map(async (track) => {
        const lessons = await ctx.db
          .query("lessons")
          .withIndex("by_track", (q) => q.eq("trackId", track._id))
          .filter((q) => q.eq(q.field("published"), true))
          .collect();

        const trackAttempts = allAttempts.filter((a) => a.trackId === track._id);
        const totalScore = trackAttempts.reduce((s, a) => s + a.score, 0);
        const totalMax   = trackAttempts.reduce((s, a) => s + a.maxScore, 0);
        const completedIds = new Set(trackAttempts.map((a) => a.lessonId as string));

        const lessonResults = lessons
          .sort((a, b) => a.order - b.order)
          .map((lesson) => {
            const best = bestPerLesson.get(lesson._id as string);
            return {
              lessonId: lesson._id,
              title: lesson.title,
              type: lesson.type,
              order: lesson.order,
              completed: completedIds.has(lesson._id as string),
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
          percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
          completedLessons: completedIds.size,
          totalLessons: lessons.length,
          lessons: lessonResults,
        };
      })
    );

    const overall = trackDetails.length > 0
      ? Math.round(trackDetails.reduce((s, t) => s + t.percentage, 0) / trackDetails.length)
      : 0;

    return { student, trackDetails, overall, totalAttempts: allAttempts.length };
  },
});

export const getAllStudentScores = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") return [];

    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();

    const tracks = await ctx.db.query("tracks").collect();

    const results = await Promise.all(
      students.map(async (student) => {
        const attempts = await ctx.db
          .query("attempts")
          .withIndex("by_user", (q) => q.eq("userId", student._id))
          .collect();

        const trackSummaries = tracks.map((track) => {
          const trackAttempts = attempts.filter(
            (a) => a.trackId === track._id
          );
          const totalScore = trackAttempts.reduce((s, a) => s + a.score, 0);
          const totalMax = trackAttempts.reduce((s, a) => s + a.maxScore, 0);
          return {
            trackId: track._id,
            trackName: track.name,
            trackColor: track.color,
            percentage: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
            completedLessons: new Set(trackAttempts.map((a) => a.lessonId)).size,
          };
        });

        const overall =
          trackSummaries.length > 0
            ? Math.round(
                trackSummaries.reduce((s, t) => s + t.percentage, 0) /
                  trackSummaries.length
              )
            : 0;

        return {
          student,
          trackSummaries,
          overall,
          totalAttempts: attempts.length,
        };
      })
    );

    return results;
  },
});
