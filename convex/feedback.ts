import { mutation, query, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { assertStudentAccess, canAccessStudent } from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";

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
    const teacher = await requireStaff(ctx);
    await assertStudentAccess(ctx, teacher, args.studentId);
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

/** Attach the sending staff member's name so students see who wrote to them. */
async function withAuthorNames<T extends { teacherId: Id<"users"> }>(
  ctx: QueryCtx,
  rows: T[],
): Promise<Array<T & { authorName: string }>> {
  const cache = new Map<Id<"users">, string>();
  const out = [];
  for (const row of rows) {
    if (!cache.has(row.teacherId)) {
      const t = await ctx.db.get(row.teacherId);
      cache.set(row.teacherId, t?.name ?? "Your instructor");
    }
    out.push({ ...row, authorName: cache.get(row.teacherId)! });
  }
  return out;
}

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
    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .order("desc")
      .collect();
    return await withAuthorNames(ctx, rows);
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
    const warnings = all
      .filter((f) => f.type === "warning" && f.acknowledgedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
    return await withAuthorNames(ctx, warnings);
  },
});

export const getForStudent = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const teacher = await getCurrentUserOrNull(ctx);
    if (!teacher || !isStaffRole(teacher.role)) return [];
    if (!(await canAccessStudent(ctx, teacher, args.studentId))) return [];
    return await ctx.db
      .query("feedback")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();
  },
});
