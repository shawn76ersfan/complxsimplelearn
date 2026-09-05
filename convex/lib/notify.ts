import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export type NotificationType = Doc<"notifications">["type"];

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body?: string;
  /** In-app route the notification links to, e.g. "/homework". */
  href?: string;
  /** Stable key per (user, event) so repeated runs don't insert twice. */
  dedupeKey?: string;
  actorId?: Id<"users">;
  /** Skip the email copy even if the user has email on (e.g. low-value pings). */
  skipEmail?: boolean;
}

/**
 * Insert one notification per recipient and, in one scheduled action, email
 * everyone who has not opted out. Recipients are de-duplicated and the actor
 * (the teacher who triggered it) never notifies themselves.
 */
export async function notifyUsers(
  ctx: MutationCtx,
  recipientIds: Iterable<Id<"users">>,
  payload: NotificationPayload,
): Promise<Id<"notifications">[]> {
  const now = Date.now();
  const unique = new Set<Id<"users">>();
  for (const id of recipientIds) {
    if (payload.actorId && id === payload.actorId) continue;
    unique.add(id);
  }

  const inserted: Id<"notifications">[] = [];
  const emailTargets: Id<"notifications">[] = [];

  for (const userId of unique) {
    if (payload.dedupeKey) {
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_user_dedupe", (q) =>
          q.eq("userId", userId).eq("dedupeKey", payload.dedupeKey),
        )
        .first();
      if (existing) continue;
    }

    const user = await ctx.db.get(userId);
    if (!user || user.status === "dropped") continue;

    const id = await ctx.db.insert("notifications", {
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      href: payload.href,
      isRead: false,
      createdAt: now,
      dedupeKey: payload.dedupeKey,
      actorId: payload.actorId,
    });
    inserted.push(id);

    if (!payload.skipEmail && user.notifyByEmail !== false) {
      emailTargets.push(id);
    }
  }

  if (emailTargets.length > 0) {
    await ctx.scheduler.runAfter(0, internal.email.sendNotificationEmails, {
      notificationIds: emailTargets,
    });
  }

  return inserted;
}

/** Every non-dropped student, for school-wide notifications. */
export async function activeStudentIds(ctx: MutationCtx): Promise<Id<"users">[]> {
  const students = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "student"))
    .collect();
  return students.filter((s) => s.status !== "dropped").map((s) => s._id);
}

/** Every teacher account, for "a student did something" notifications. */
export async function teacherIds(ctx: MutationCtx): Promise<Id<"users">[]> {
  const teachers = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "teacher"))
    .collect();
  return teachers.map((t) => t._id);
}

export function formatDueDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ts);
}
