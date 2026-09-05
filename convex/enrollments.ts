import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { isStaffEmail, normalizeEmail } from "./lib/teacherEmails";
import { resolveCohortFilter, visibleToStaff } from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";

const enrollmentDoc = v.object({
  _id: v.id("enrollments"),
  _creationTime: v.number(),
  email: v.string(),
  role: v.union(v.literal("student"), v.literal("teacher")),
  status: v.union(
    v.literal("invited"),
    v.literal("accepted"),
    v.literal("revoked"),
  ),
  invitedBy: v.id("users"),
  invitedAt: v.number(),
  acceptedAt: v.optional(v.number()),
  clerkInvitationId: v.optional(v.string()),
  displayName: v.optional(v.string()),
  cohortId: v.optional(v.id("cohorts")),
});

/**
 * Pending invites the staff member can see. Teachers only see invites into
 * cohorts they teach; admins see everything (including un-cohorted invites).
 */
export const listPendingInvites = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  returns: v.array(enrollmentDoc),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    const { scope, cohortId } = await resolveCohortFilter(ctx, me, args.cohortId);
    const invited = await ctx.db
      .query("enrollments")
      .withIndex("by_status", (q) => q.eq("status", "invited"))
      .collect();
    const visible =
      scope === "all"
        ? visibleToStaff(invited, scope, cohortId)
        : invited.filter((i) => i.cohortId !== undefined && (cohortId ? i.cohortId === cohortId : scope.has(i.cohortId)));
    return visible.sort((a, b) => b.invitedAt - a.invitedAt);
  },
});

export const getById = query({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.union(enrollmentDoc, v.null()),
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    return await ctx.db.get(args.enrollmentId);
  },
});

export const upsertInviteRecord = internalMutation({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
    invitedBy: v.id("users"),
    clerkInvitationId: v.optional(v.string()),
    cohortId: v.optional(v.id("cohorts")),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"))),
  },
  returns: v.id("enrollments"),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const role = args.role ?? "student";
    if (isStaffEmail(email)) {
      throw new Error("This email is already configured as staff via ADMIN_EMAILS / TEACHER_EMAILS.");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existingUser && existingUser.status !== "dropped") {
      throw new Error("This email already has an active account.");
    }

    const existingEnrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const now = Date.now();
    if (existingEnrollment) {
      await ctx.db.patch(existingEnrollment._id, {
        status: "invited",
        invitedBy: args.invitedBy,
        invitedAt: now,
        acceptedAt: undefined,
        clerkInvitationId: args.clerkInvitationId,
        displayName: args.displayName,
        role,
        cohortId: args.cohortId,
      });
      return existingEnrollment._id;
    }

    return await ctx.db.insert("enrollments", {
      email,
      role,
      status: "invited",
      invitedBy: args.invitedBy,
      invitedAt: now,
      clerkInvitationId: args.clerkInvitationId,
      displayName: args.displayName,
      cohortId: args.cohortId,
    });
  },
});

export const markEnrollmentAccepted = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db
      .query("enrollments")
      .withIndex("by_email", (q) => q.eq("email", normalizeEmail(args.email)))
      .unique();
    if (!enrollment) return null;
    if (enrollment.status === "accepted") return null;
    await ctx.db.patch(enrollment._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });
    return null;
  },
});

export const markEnrollmentRevoked = internalMutation({
  args: { enrollmentId: v.id("enrollments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enrollment = await ctx.db.get(args.enrollmentId);
    if (!enrollment) throw new Error("Invitation not found");
    await ctx.db.patch(args.enrollmentId, { status: "revoked" });
    return null;
  },
});
