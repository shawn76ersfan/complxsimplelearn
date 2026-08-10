import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./_lib/auth";
import { isTeacherEmail } from "./lib/teacherEmails";
import {
  emailHasActiveEnrollment,
  getEnrollmentByEmail,
  isPlaceholderName,
} from "./lib/enrollmentAccess";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args): Promise<Id<"users">> => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const enrollment = await getEnrollmentByEmail(ctx, args.email);
    const role: "teacher" | "student" = isTeacherEmail(args.email)
      ? "teacher"
      : "student";
    const name = resolveDisplayName(
      args.name,
      enrollment?.displayName,
      existing?.name,
    );

    if (existing) {
      const patch: { name?: string; imageUrl?: string } = {
        imageUrl: args.imageUrl,
      };
      // Never overwrite a real name with the placeholder "Student"
      if (!isPlaceholderName(name) || isPlaceholderName(existing.name)) {
        patch.name = name;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    if (role === "teacher") {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name,
        imageUrl: args.imageUrl,
        role,
        createdAt: Date.now(),
      });
    }

    const allowed = await emailHasActiveEnrollment(ctx, args.email);
    if (!allowed) {
      throw new Error("NOT_ENROLLED");
    }

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name,
      imageUrl: args.imageUrl,
      role: "student",
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.enrollments.markEnrollmentAccepted, {
      email: args.email,
    });

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

export const listStudents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me || me.role !== "teacher") return [];
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, { name: args.name });
  },
});

export const dropStudent = mutation({
  args: {
    studentId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") throw new Error("Teacher access required");
    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") throw new Error("Student not found");
    await ctx.db.patch(args.studentId, {
      status: "dropped",
      droppedReason: args.reason,
      droppedAt: Date.now(),
      droppedBy: teacher._id,
    });
  },
});

export const reactivateStudent = mutation({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") throw new Error("Teacher access required");
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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") return [];
    const all = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
    return all.filter((u) => u.status === "dropped");
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const teacher = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!teacher || teacher.role !== "teacher") return [];
    const all = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
    return all.filter((u) => u.status !== "dropped");
  },
});
