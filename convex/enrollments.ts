import { internalMutation, MutationCtx, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { isStaffEmail, normalizeEmail } from "./lib/teacherEmails";
import { addMember, assertCohortAccess, resolveCohortFilter, visibleToStaff } from "./lib/cohortAccess";
import { getUserByEmail } from "./lib/enrollmentAccess";
import { notifyUsers } from "./lib/notify";
import { isAdminRole, isStaffRole } from "./lib/roles";
import { Id } from "./_generated/dataModel";

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

/**
 * If this email already has a student account, add them to the cohort
 * immediately. Clerk cannot send a sign-up invite to an address that already
 * exists. Returns null when no matching account is found.
 */
export const addExistingStudentByEmail = internalMutation({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
    invitedBy: v.id("users"),
    cohortId: v.optional(v.id("cohorts")),
    clerkUser: v.optional(
      v.object({
        clerkId: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
      }),
    ),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"))),
  },
  returns: v.union(
    v.null(),
    v.object({
      enrollmentId: v.id("enrollments"),
      alreadyInCohort: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const role = args.role ?? "student";
    const staff = await ctx.db.get(args.invitedBy);
    if (!staff) throw new Error("Not authenticated");
    if (args.cohortId) await assertCohortAccess(ctx, staff, args.cohortId);

    let user = await getUserByEmail(ctx, email);
    const clerkUser = args.clerkUser;
    if (!user && clerkUser) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUser.clerkId))
        .unique();
    }
    if (!user && clerkUser) {
      const userId = await ctx.db.insert("users", {
        clerkId: clerkUser.clerkId,
        email,
        name: clerkUser.name.trim() || args.displayName?.trim() || (role === "teacher" ? "Instructor" : "Student"),
        imageUrl: clerkUser.imageUrl,
        role: role === "teacher" ? "teacher" : "student",
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }
    if (!user) return null;
    const userId = user._id;
    const userName = user.name;
    const userStatus = user.status;
    const userRole = user.role;

    if (role === "teacher") {
      if (!isAdminRole(staff.role)) {
        throw new Error("Only admins can invite instructors.");
      }
      if (userRole === "student") {
        // Admin is explicitly inviting them as staff — promote in place
        // (covers "I demoted them by accident" and first-time promotions).
        const memberships = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const m of memberships) {
          if (m.role === "student") await ctx.db.delete(m._id);
        }
        await ctx.db.patch(userId, { role: "teacher" });
      } else if (!isStaffRole(userRole)) {
        throw new Error("This email belongs to a student. Change their role to instructor first.");
      }
    } else if (userRole !== "student") {
      throw new Error("This email belongs to an instructor.");
    }
    if (userStatus === "dropped") {
      throw new Error("This account was dropped. Reactivate them before adding them to a cohort.");
    }

    let alreadyInCohort = false;
    if (args.cohortId) {
      const memberRole = role === "teacher" ? "teacher" : "student";
      const created = await addMember(ctx, args.cohortId, userId, memberRole, staff._id);
      alreadyInCohort = !created;
      if (created) {
        const cohort = await ctx.db.get(args.cohortId);
        if (cohort) {
          await notifyUsers(ctx, [userId], {
            type: "announcement",
            title: memberRole === "teacher" ? `You're now teaching ${cohort.name}` : `You've been added to ${cohort.name}`,
            body:
              memberRole === "teacher"
                ? "The cohort appears in your Teacher Hub switcher."
                : cohort.schedule
                  ? `Class meets ${cohort.schedule}. Your dashboard now shows this cohort's schedule and assignments.`
                  : "Your dashboard now shows this cohort's schedule and assignments.",
            href: memberRole === "teacher" ? "/teacher/dashboard" : "/cohort",
            actorId: staff._id,
            dedupeKey: `cohort_welcome:${cohort._id}`,
          });
        }
      }
    }

    const enrollmentId = await upsertAcceptedEnrollmentRecord(ctx, {
      email,
      displayName: args.displayName?.trim() || userName,
      invitedBy: staff._id,
      cohortId: args.cohortId,
      role,
    });

    return { enrollmentId, alreadyInCohort };
  },
});

async function upsertAcceptedEnrollmentRecord(
  ctx: MutationCtx,
  args: {
    email: string;
    displayName?: string;
    invitedBy: Id<"users">;
    cohortId?: Id<"cohorts">;
    role?: "student" | "teacher";
  },
): Promise<Id<"enrollments">> {
  const now = Date.now();
  const role = args.role ?? "student";
  const existing = await ctx.db
    .query("enrollments")
    .withIndex("by_email", (q) => q.eq("email", args.email))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, {
      status: "accepted",
      invitedBy: args.invitedBy,
      acceptedAt: existing.acceptedAt ?? now,
      displayName: args.displayName,
      role,
      cohortId: args.cohortId ?? existing.cohortId,
    });
    return existing._id;
  }
  return await ctx.db.insert("enrollments", {
    email: args.email,
    role,
    status: "accepted",
    invitedBy: args.invitedBy,
    invitedAt: now,
    acceptedAt: now,
    displayName: args.displayName,
    cohortId: args.cohortId,
  });
}

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
