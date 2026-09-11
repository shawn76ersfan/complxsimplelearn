import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, getCurrentUserOrNull, requireAdmin } from "./_lib/auth";
import { envRoleForEmail, normalizeEmail } from "./lib/teacherEmails";
import { isStaffRole } from "./lib/roles";
import {
  emailHasActiveEnrollment,
  getEnrollmentByEmail,
  isPlaceholderName,
} from "./lib/enrollmentAccess";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { addMember, addStudentToCohort, visibleStudents } from "./lib/cohortAccess";
import { splitDisplayName } from "./lib/names";
import { isUsState } from "./lib/usStates";

const roleValidator = v.union(v.literal("admin"), v.literal("teacher"), v.literal("student"));

function resolveDisplayName(
  clerkName: string,
  fallback?: string | null,
  existingName?: string | null,
): string {
  if (!isPlaceholderName(clerkName)) return clerkName.trim();
  if (!isPlaceholderName(existingName)) return existingName!.trim();
  if (!isPlaceholderName(fallback)) return fallback!.trim();
  return "Student";
}

export const store = mutation({
  args: {
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkId = identity.subject;
    const email = identity.email ? normalizeEmail(identity.email) : "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!email) {
      if (existing) return existing._id;
      throw new Error("Your account has no email address");
    }

    const enrollment = await getEnrollmentByEmail(ctx, email);
    // ADMIN_EMAILS / TEACHER_EMAILS win; otherwise an invited teacher becomes
    // a teacher; everyone else is a student. Role is taken from the JWT email
    // only — never from client-supplied fields.
    const envRole = envRoleForEmail(email);
    const role: "admin" | "teacher" | "student" =
      envRole ?? (enrollment?.role === "teacher" && enrollment.status !== "revoked" ? "teacher" : "student");
    const name = resolveDisplayName(
      args.name,
      enrollment?.displayName,
      existing?.name,
    );

    if (existing) {
      const patch: {
        email?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        imageUrl?: string;
        role?: "admin" | "teacher";
      } = {
        imageUrl: args.imageUrl,
      };
      if (existing.email !== email) patch.email = email;
      // Never overwrite a real name with the placeholder "Student"
      if (!isPlaceholderName(name) || isPlaceholderName(existing.name)) {
        patch.name = name;
        if (!existing.firstName || !existing.lastName) {
          const parts = splitDisplayName(name);
          if (parts.firstName && !existing.firstName) patch.firstName = parts.firstName;
          if (parts.lastName && !existing.lastName) patch.lastName = parts.lastName;
        }
      }
      // Promote when the env config outranks the stored role (teacher -> admin,
      // student -> staff). Never demote automatically.
      if (envRole === "admin" && existing.role !== "admin") patch.role = "admin";
      else if (envRole === "teacher" && existing.role === "student") patch.role = "teacher";
      await ctx.db.patch(existing._id, patch);

      // Existing accounts who were later invited into a cohort join on next sign-in.
      if (
        existing.status !== "dropped" &&
        enrollment?.status === "invited" &&
        enrollment.cohortId
      ) {
        if (!envRole && existing.role === "student") {
          await addStudentToCohort(ctx, enrollment.cohortId, existing._id, enrollment.invitedBy);
          await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, { email });
        } else if (isStaffRole(existing.role) || envRole) {
          await addMember(ctx, enrollment.cohortId, existing._id, "teacher", enrollment.invitedBy);
          await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, { email });
        }
      }

      return existing._id;
    }

    if (isStaffRole(role)) {
      const staffParts = splitDisplayName(name);
      const userId = await ctx.db.insert("users", {
        clerkId,
        email,
        name,
        firstName: staffParts.firstName || undefined,
        lastName: staffParts.lastName || undefined,
        imageUrl: args.imageUrl,
        role,
        createdAt: Date.now(),
      });
      if (enrollment) {
        await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, { email });
        if (enrollment.cohortId) {
          await addMember(ctx, enrollment.cohortId, userId, "teacher", enrollment.invitedBy);
        }
      }
      return userId;
    }

    const allowed = await emailHasActiveEnrollment(ctx, email);
    if (!allowed) {
      throw new Error("NOT_ENROLLED");
    }

    const studentParts = splitDisplayName(name);
    const userId = await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      firstName: studentParts.firstName || undefined,
      lastName: studentParts.lastName || undefined,
      imageUrl: args.imageUrl,
      role: "student",
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, {
      email,
    });

    // Drop them straight into the cohort they were invited to.
    if (enrollment?.cohortId) {
      await addStudentToCohort(ctx, enrollment.cohortId, userId, enrollment.invitedBy);
    }

    return userId;
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/**
 * Students visible to the signed-in staff member. Admins see everyone;
 * teachers see students in the cohorts they teach. Pass `cohortId` to
 * narrow to one cohort (the Teacher Hub switcher).
 */
export const listStudents = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    return await visibleStudents(ctx, me, args.cohortId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const first = args.firstName?.trim();
    const last = args.lastName?.trim();
    const state = args.state?.trim();
    let display = args.name?.trim();
    if (first && last) display = `${first} ${last}`;
    else if (first) display = first;

    if (display !== undefined) {
      if (display.length < 2 || display.toLowerCase() === "student") {
        throw new Error("Please enter your real first and last name");
      }
    }
    if (state !== undefined && !isUsState(state)) {
      throw new Error("Pick a valid state");
    }

    const patch: {
      name?: string;
      firstName?: string;
      lastName?: string;
      state?: string;
    } = {};
    if (display) patch.name = display;
    if (first !== undefined) {
      if (!first) throw new Error("First name is required");
      patch.firstName = first;
    }
    if (last !== undefined) {
      if (!last) throw new Error("Last name is required");
      patch.lastName = last;
    }
    if (state !== undefined) patch.state = state;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }
    return null;
  },
});

export const dropStudent = mutation({
  args: {
    studentId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") throw new Error("Student not found");
    await ctx.db.patch(args.studentId, {
      status: "dropped",
      droppedReason: args.reason,
      droppedAt: Date.now(),
      droppedBy: admin._id,
    });
  },
});

export const reactivateStudent = mutation({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.studentId, {
      status: "active",
      droppedReason: undefined,
      droppedAt: undefined,
      droppedBy: undefined,
    });

    const student = await ctx.db.get(args.studentId);
    if (student) {
      await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, {
        email: student.email,
      });
    }
  },
});

export const listDropped = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    const all = await visibleStudents(ctx, me, args.cohortId);
    return all.filter((u) => u.status === "dropped");
  },
});

export const listActive = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    const all = await visibleStudents(ctx, me, args.cohortId);
    return all.filter((u) => u.status !== "dropped");
  },
});

/** Every admin + teacher account. Admin only (used to assign instructors). */
export const listStaff = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      email: v.string(),
      imageUrl: v.optional(v.string()),
      role: roleValidator,
      createdAt: v.number(),
      cohortCount: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || me.role !== "admin") return [];
    const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
    const teachers = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "teacher")).collect();
    const out = [];
    for (const u of [...admins, ...teachers]) {
      const memberships = await ctx.db
        .query("cohortMembers")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();
      out.push({
        _id: u._id,
        name: u.name,
        email: u.email,
        imageUrl: u.imageUrl,
        role: u.role,
        createdAt: u.createdAt,
        cohortCount: memberships.filter((m) => m.role === "teacher").length,
      });
    }
    return out.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1));
  },
});

/**
 * Admin only: change someone's role. Promoting a student to teacher keeps
 * their account; demoting a teacher to student removes them from the
 * cohorts they were teaching. Admins cannot demote themselves.
 */
export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.userId === admin._id && args.role !== "admin") {
      throw new Error("You can't remove your own admin access");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found");
    if (target.role === args.role) return null;

    const envRole = envRoleForEmail(target.email);
    if (envRole === "admin" && args.role !== "admin") {
      throw new Error("This account is pinned as admin by ADMIN_EMAILS");
    }

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", target._id))
      .collect();
    if (args.role === "student") {
      // Leaving staff: drop teaching memberships.
      for (const m of memberships) if (m.role === "teacher") await ctx.db.delete(m._id);
    } else if (target.role === "student") {
      // Becoming staff: drop student memberships.
      for (const m of memberships) if (m.role === "student") await ctx.db.delete(m._id);
    }

    await ctx.db.patch(target._id, { role: args.role });
    return null;
  },
});

/**
 * Instructors to show a student. Their cohort teachers when they belong to a
 * cohort, otherwise every admin (the school's default instructors).
 */
export const myInstructors = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("users"), name: v.string(), imageUrl: v.optional(v.string()), role: roleValidator })),
  handler: async (ctx) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();
    const ids = new Set<Id<"users">>();
    for (const m of memberships) {
      if (m.role !== "student") continue;
      const teachers = await ctx.db
        .query("cohortMembers")
        .withIndex("by_cohort_role", (q) => q.eq("cohortId", m.cohortId).eq("role", "teacher"))
        .collect();
      for (const t of teachers) ids.add(t.userId);
    }
    if (ids.size === 0) {
      const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
      for (const a of admins) ids.add(a._id);
    }
    const out = [];
    for (const id of ids) {
      const u = await ctx.db.get(id);
      if (u && u._id !== me._id) out.push({ _id: u._id, name: u.name, imageUrl: u.imageUrl, role: u.role });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});
