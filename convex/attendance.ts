import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { assertCohortAccess, visibleStudents } from "./lib/cohortAccess";
import { rosterName } from "./lib/names";
import { isStaffRole } from "./lib/roles";

const statusValidator = v.union(
  v.literal("present"),
  v.literal("late"),
  v.literal("absent"),
  v.literal("excused"),
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string) {
  if (!DATE_RE.test(date)) throw new Error("Date must be YYYY-MM-DD");
}

export const mark = mutation({
  args: {
    cohortId: v.id("cohorts"),
    studentId: v.id("users"),
    date: v.string(),
    status: statusValidator,
    note: v.optional(v.string()),
  },
  returns: v.id("attendance"),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    await assertCohortAccess(ctx, staff, args.cohortId);
    assertDate(args.date);

    const student = await ctx.db.get(args.studentId);
    if (!student || student.role !== "student") throw new Error("Student not found");

    const membership = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_user", (q) =>
        q.eq("cohortId", args.cohortId).eq("userId", args.studentId),
      )
      .unique();
    if (!membership || membership.role !== "student") {
      throw new Error("That student is not on this cohort roster");
    }

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_cohort_student_date", (q) =>
        q.eq("cohortId", args.cohortId).eq("studentId", args.studentId).eq("date", args.date),
      )
      .unique();

    const note = args.note?.trim() || undefined;
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        note,
        markedBy: staff._id,
        markedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("attendance", {
      cohortId: args.cohortId,
      studentId: args.studentId,
      date: args.date,
      status: args.status,
      note,
      markedBy: staff._id,
      markedAt: Date.now(),
    });
  },
});

export const clear = mutation({
  args: {
    cohortId: v.id("cohorts"),
    studentId: v.id("users"),
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    await assertCohortAccess(ctx, staff, args.cohortId);
    assertDate(args.date);
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_cohort_student_date", (q) =>
        q.eq("cohortId", args.cohortId).eq("studentId", args.studentId).eq("date", args.date),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

export const rosterForDate = query({
  args: { cohortId: v.id("cohorts"), date: v.string() },
  returns: v.array(
    v.object({
      studentId: v.id("users"),
      name: v.string(),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      state: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      status: v.union(statusValidator, v.null()),
      note: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    try {
      await assertCohortAccess(ctx, me, args.cohortId);
    } catch {
      return [];
    }
    if (!DATE_RE.test(args.date)) return [];

    const students = (await visibleStudents(ctx, me, args.cohortId))
      .filter((s) => s.status !== "dropped")
      .sort((a, b) => rosterName(a).localeCompare(rosterName(b)));

    const marks = await ctx.db
      .query("attendance")
      .withIndex("by_cohort_date", (q) => q.eq("cohortId", args.cohortId).eq("date", args.date))
      .collect();
    const byStudent = new Map(marks.map((m) => [m.studentId, m]));

    return students.map((s) => {
      const mark = byStudent.get(s._id);
      return {
        studentId: s._id,
        name: rosterName(s),
        firstName: s.firstName,
        lastName: s.lastName,
        state: s.state,
        imageUrl: s.imageUrl,
        status: mark?.status ?? null,
        note: mark?.note,
      };
    });
  },
});

/** Staff: dates already marked for this cohort, newest first (for the sheet's date picker). */
export const markedDates = query({
  args: { cohortId: v.id("cohorts") },
  returns: v.array(v.object({ date: v.string(), present: v.number(), total: v.number() })),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me || !isStaffRole(me.role)) return [];
    try {
      await assertCohortAccess(ctx, me, args.cohortId);
    } catch {
      return [];
    }
    const rows = await ctx.db
      .query("attendance")
      .withIndex("by_cohort_date", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const byDate = new Map<string, { present: number; total: number }>();
    for (const row of rows) {
      const entry = byDate.get(row.date) ?? { present: 0, total: 0 };
      entry.total += 1;
      if (row.status === "present" || row.status === "late") entry.present += 1;
      byDate.set(row.date, entry);
    }
    return [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 30)
      .map(([date, counts]) => ({ date, ...counts }));
  },
});
