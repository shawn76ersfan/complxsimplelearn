import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./_lib/auth";

const resetReturn = v.object({
  students: v.number(),
  attempts: v.number(),
  submissions: v.number(),
});

async function resetAllStudentStatsHandler(ctx: MutationCtx) {
  const students = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "student"))
    .collect();

  let attempts = 0;
  let submissions = 0;

  for (const student of students) {
    const studentAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", student._id))
      .collect();
    for (const attempt of studentAttempts) {
      await ctx.db.delete(attempt._id);
      attempts += 1;
    }

    const studentSubs = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_student", (q) => q.eq("studentId", student._id))
      .collect();
    for (const submission of studentSubs) {
      await ctx.db.delete(submission._id);
      submissions += 1;
    }

    await ctx.db.patch(student._id, {
      streak: 0,
      xp: 0,
      lastActivityDate: "",
    });
  }

  return { students: students.length, attempts, submissions };
}

/** Admin: wipe lesson attempts, homework submissions, and streaks for every student. */
export const resetAllStudentStats = mutation({
  args: {},
  returns: resetReturn,
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await resetAllStudentStatsHandler(ctx);
  },
});

/** Same wipe, callable from the Convex dashboard / MCP without a user session. */
export const resetAllStudentStatsInternal = internalMutation({
  args: {},
  returns: resetReturn,
  handler: async (ctx) => resetAllStudentStatsHandler(ctx),
});
