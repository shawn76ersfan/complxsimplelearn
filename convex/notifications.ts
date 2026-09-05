import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull } from "./_lib/auth";
import { formatDueDate, notifyUsers, activeStudentIds } from "./lib/notify";

const notificationDoc = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: v.union(
    v.literal("assignment_posted"),
    v.literal("assignment_due_soon"),
    v.literal("submission_graded"),
    v.literal("submission_received"),
    v.literal("video_posted"),
    v.literal("calendar_event"),
    v.literal("announcement"),
  ),
  title: v.string(),
  body: v.optional(v.string()),
  href: v.optional(v.string()),
  isRead: v.boolean(),
  createdAt: v.number(),
  dedupeKey: v.optional(v.string()),
  actorId: v.optional(v.id("users")),
  emailedAt: v.optional(v.number()),
});

/** Newest first. `limit` keeps the navbar dropdown light; the page asks for more. */
export const listMine = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(notificationDoc),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 200);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .take(100);
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db.get(args.notificationId);
    if (!row || row.userId !== user._id) return null;
    if (!row.isRead) await ctx.db.patch(row._id, { isRead: true });
    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();
    for (const row of unread) {
      await ctx.db.patch(row._id, { isRead: true });
    }
    return unread.length;
  },
});

export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db.get(args.notificationId);
    if (!row || row.userId !== user._id) return null;
    await ctx.db.delete(row._id);
    return null;
  },
});

/** Per-user email preference, surfaced on the profile page. */
export const getEmailPreference = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    return user?.notifyByEmail !== false;
  },
});

export const setEmailPreference = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, { notifyByEmail: args.enabled });
    return null;
  },
});

/**
 * Used by the email action: resolve recipients + content for a batch of
 * notification ids, skipping anything already emailed or opted out.
 */
export const getEmailBatch = internalQuery({
  args: { notificationIds: v.array(v.id("notifications")) },
  returns: v.array(
    v.object({
      notificationId: v.id("notifications"),
      email: v.string(),
      name: v.string(),
      title: v.string(),
      body: v.optional(v.string()),
      href: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const out: Array<{
      notificationId: (typeof args.notificationIds)[number];
      email: string;
      name: string;
      title: string;
      body?: string;
      href?: string;
    }> = [];
    for (const id of args.notificationIds) {
      const row = await ctx.db.get(id);
      if (!row || row.emailedAt !== undefined) continue;
      const user = await ctx.db.get(row.userId);
      if (!user || user.status === "dropped" || user.notifyByEmail === false) continue;
      out.push({
        notificationId: row._id,
        email: user.email,
        name: user.name,
        title: row.title,
        body: row.body,
        href: row.href,
      });
    }
    return out;
  },
});

export const markEmailed = internalMutation({
  args: { notificationIds: v.array(v.id("notifications")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const id of args.notificationIds) {
      const row = await ctx.db.get(id);
      if (row && row.emailedAt === undefined) {
        await ctx.db.patch(id, { emailedAt: now });
      }
    }
    return null;
  },
});

/**
 * Daily cron: remind students about submission assignments due in the next
 * 24 hours that they have not turned in yet. `dedupeKey` makes it idempotent.
 */
export const sendDueSoonReminders = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_due_date", (q) => q.gt("dueDate", now).lte("dueDate", horizon))
      .collect();
    if (assignments.length === 0) return 0;

    let sent = 0;

    for (const assignment of assignments) {
      // Only the cohort the assignment belongs to (everyone when school-wide).
      const students = await activeStudentIds(ctx, assignment.cohortId);
      const recipients: typeof students = [];
      for (const studentId of students) {
        if (assignment.requiresSubmission) {
          const submission = await ctx.db
            .query("assignmentSubmissions")
            .withIndex("by_assignment_student", (q) =>
              q.eq("assignmentId", assignment._id).eq("studentId", studentId),
            )
            .unique();
          if (submission) continue;
        }
        recipients.push(studentId);
      }
      const ids = await notifyUsers(ctx, recipients, {
        type: "assignment_due_soon",
        title: `Due soon: ${assignment.title}`,
        body: `Due ${formatDueDate(assignment.dueDate)}. Turn it in from your homework page.`,
        href: "/homework",
        dedupeKey: `due_soon:${assignment._id}`,
      });
      sent += ids.length;
    }
    return sent;
  },
});
