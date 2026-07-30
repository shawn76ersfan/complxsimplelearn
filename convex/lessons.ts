import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByTrack = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_track_published", (q) =>
        q.eq("trackId", args.trackId).eq("published", true)
      )
      .collect();
  },
});

export const getById = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lessonId);
  },
});

export const getQuestions = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizQuestions")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();
  },
});
