import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./_lib/auth";
import { isTeacherEmail } from "./lib/teacherEmails";

export const listByTrack = query({
  args: { trackId: v.id("tracks") },
  returns: v.array(
    v.object({
      _id: v.id("lessons"),
      _creationTime: v.number(),
      trackId: v.id("tracks"),
      title: v.string(),
      content: v.string(),
      type: v.union(
        v.literal("content"),
        v.literal("quiz"),
        v.literal("game"),
        v.literal("mandatory"),
      ),
      order: v.number(),
      published: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_track_published", (q) =>
        q.eq("trackId", args.trackId).eq("published", true),
      )
      .collect();
  },
});

export const getById = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(
    v.object({
      _id: v.id("lessons"),
      _creationTime: v.number(),
      trackId: v.id("tracks"),
      title: v.string(),
      content: v.string(),
      type: v.union(
        v.literal("content"),
        v.literal("quiz"),
        v.literal("game"),
        v.literal("mandatory"),
      ),
      order: v.number(),
      published: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;
    if (lesson.published) return lesson;

    // Draft lessons: teachers only
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    if (user.role === "teacher" || isTeacherEmail(user.email)) return lesson;
    return null;
  },
});

export const getQuestions = query({
  args: { lessonId: v.id("lessons") },
  returns: v.array(
    v.object({
      _id: v.id("quizQuestions"),
      _creationTime: v.number(),
      lessonId: v.id("lessons"),
      question: v.string(),
      options: v.array(v.string()),
      correctIndex: v.number(),
      explanation: v.optional(v.string()),
      order: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizQuestions")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();
  },
});
