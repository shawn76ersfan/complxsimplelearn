import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "./_lib/auth";
import { isStaffEmail } from "./lib/teacherEmails";
import { isStaffRole } from "./lib/roles";
import { gradeContentBlock, redactLessonContent } from "./lib/lessonContent";

const lessonType = v.union(
  v.literal("content"),
  v.literal("quiz"),
  v.literal("game"),
  v.literal("mandatory"),
);

const lessonReturn = v.object({
  _id: v.id("lessons"),
  _creationTime: v.number(),
  trackId: v.id("tracks"),
  title: v.string(),
  content: v.string(),
  type: lessonType,
  order: v.number(),
  published: v.boolean(),
});

export const listByTrack = query({
  args: { trackId: v.id("tracks") },
  returns: v.array(lessonReturn),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const staff = isStaffRole(user.role) || isStaffEmail(user.email);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_track_published", (q) =>
        q.eq("trackId", args.trackId).eq("published", true),
      )
      .collect();
    if (staff) return lessons;
    return lessons.map((lesson) => ({
      ...lesson,
      content: redactLessonContent(lesson.content),
    }));
  },
});

export const getById = query({
  args: { lessonId: v.id("lessons") },
  returns: v.union(lessonReturn, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) return null;
    const staff = isStaffRole(user.role) || isStaffEmail(user.email);
    if (!lesson.published && !staff) return null;
    if (staff) return lesson;
    return { ...lesson, content: redactLessonContent(lesson.content) };
  },
});

export const getQuestions = query({
  args: { lessonId: v.id("lessons") },
  returns: v.array(
    v.object({
      _id: v.id("quizQuestions"),
      lessonId: v.id("lessons"),
      question: v.string(),
      options: v.array(v.string()),
      order: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || !lesson.published) return [];
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_lesson", (q) => q.eq("lessonId", args.lessonId))
      .collect();
    return questions
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        _id: q._id,
        lessonId: q.lessonId,
        question: q.question,
        options: q.options,
        order: q.order,
      }));
  },
});

export const checkQuestion = mutation({
  args: {
    lessonId: v.id("lessons"),
    questionId: v.id("quizQuestions"),
    selected: v.number(),
  },
  returns: v.object({
    correct: v.boolean(),
    correctIndex: v.number(),
    explanation: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const question = await ctx.db.get(args.questionId);
    if (!question || question.lessonId !== args.lessonId) {
      throw new Error("Question not found");
    }
    return {
      correct: args.selected === question.correctIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    };
  },
});

export const checkBlock = mutation({
  args: {
    lessonId: v.id("lessons"),
    blockIndex: v.number(),
    selected: v.optional(v.number()),
    texts: v.optional(v.array(v.string())),
  },
  returns: v.object({
    correct: v.boolean(),
    score: v.number(),
    maxScore: v.number(),
    correctIndex: v.optional(v.number()),
    explanation: v.optional(v.string()),
    accepted: v.optional(v.array(v.array(v.string()))),
    results: v.optional(v.array(v.boolean())),
  }),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson || !lesson.published) throw new Error("Lesson not found");
    return gradeContentBlock(lesson.content, args.blockIndex, {
      selected: args.selected,
      texts: args.texts,
    });
  },
});
