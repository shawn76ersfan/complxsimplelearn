import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireTeacher } from "./_lib/auth";

export const send = mutation({
  args: {
    studentId: v.id("users"),
    message: v.string(),
    trackId: v.optional(v.id("tracks")),
    lessonId: v.optional(v.id("lessons")),
    type: v.optional(v.union(
      v.literal("feedback"),
      v.literal("warning"),
      v.literal("notice"),
    )),
  },
  handler: async (ctx, args) => {
    const teacher = await requireTeacher(ctx);
    await ctx.db.insert("feedback", {
      studentId: args.studentId,
      teacherId: teacher._id,
      message: args.message,
      trackId: args.trackId,
      lessonId: args.lessonId,
      isRead: false,
      createdAt: Date.now(),
      type: args.type ?? "feedback",
    });
  },
});

export const getMyFeedback = query({
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
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .order("desc")
      .collect();
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return 0;
    const unread = await ctx.db
      .query("feedback")
      .withIndex("by_student_unread", (q) =>
        q.eq("studentId", user._id).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

export const acknowledgeWarning = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const item = await ctx.db.get(args.feedbackId);
    if (!item || item.studentId !== user._id) return;
    await ctx.db.patch(args.feedbackId, {
      isRead: true,
      acknowledgedAt: Date.now(),
    });
  },
});

export const markRead = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const item = await ctx.db.get(args.feedbackId);
    if (!item || item.studentId !== user._id) return;
    await ctx.db.patch(args.feedbackId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("feedback")
      .withIndex("by_student_unread", (q) =>
        q.eq("studentId", user._id).eq("isRead", false)
      )
      .collect();
    // Warnings stay unread until acknowledged (dashboard banner + inbox CTA).
    await Promise.all(
      unread
        .filter((f) => f.type !== "warning")
        .map((f) => ctx.db.patch(f._id, { isRead: true })),
    );
  },
});

export const getActiveWarnings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];
    // Stay on the dashboard until the student explicitly acknowledges —
    // reading in Messages alone does not dismiss the banner.
    const all = await ctx.db
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();
    return all
      .filter((f) => f.type === "warning" && f.acknowledgedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getForStudent = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") return [];
    return await ctx.db
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();
  },
});
