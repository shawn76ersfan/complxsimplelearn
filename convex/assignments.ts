import { mutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { Doc, Id } from "./_generated/dataModel";
import { activeStudentIds, formatDueDate, notifyUsers } from "./lib/notify";
import {
  assertContentAccess,
  assertStudentAccess,
  cohortIdsForUser,
  resolveCohortFilter,
  visibleStudents,
  visibleToStaff,
  visibleToStudent,
} from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";

type AssignmentStatus =
  | "complete"
  | "late"
  | "pending"
  | "empty"
  | "no-track"
  | "submitted"
  | "graded";

const assignmentDoc = v.object({
  _id: v.id("assignments"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  trackId: v.optional(v.id("tracks")),
  dueDate: v.number(),
  createdBy: v.id("users"),
  assignedToAll: v.boolean(),
  requiresSubmission: v.optional(v.boolean()),
  allowFileUpload: v.optional(v.boolean()),
  cohortId: v.optional(v.id("cohorts")),
});

async function getSubmission(
  ctx: QueryCtx,
  assignmentId: Id<"assignments">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("assignmentSubmissions")
    .withIndex("by_assignment_student", (q) =>
      q.eq("assignmentId", assignmentId).eq("studentId", userId),
    )
    .unique();
}

async function statusForAssignment(
  ctx: QueryCtx,
  userId: Id<"users">,
  assignment: Doc<"assignments">,
  now: number,
): Promise<AssignmentStatus> {
  // Submission-based homework
  if (assignment.requiresSubmission) {
    const sub = await getSubmission(ctx, assignment._id, userId);
    if (!sub) {
      return now > assignment.dueDate ? "empty" : "pending";
    }
    if (sub.status === "graded" || sub.status === "returned") {
      return sub.submittedAt <= assignment.dueDate ? "graded" : "late";
    }
    // submitted, awaiting grade
    return sub.submittedAt <= assignment.dueDate ? "submitted" : "late";
  }

  // Legacy: track attempt completion
  if (!assignment.trackId) return "no-track";

  const attempts = await ctx.db
    .query("attempts")
    .withIndex("by_user_track", (q) =>
      q.eq("userId", userId).eq("trackId", assignment.trackId!),
    )
    .collect();

  const completedBeforeDue = attempts.some(
    (att) => att.completedAt <= assignment.dueDate,
  );
  if (completedBeforeDue) return "complete";
  if (attempts.length === 0) return now > assignment.dueDate ? "empty" : "pending";
  return now > assignment.dueDate ? "late" : "pending";
}

function progressFromStatuses(statuses: AssignmentStatus[]): {
  completedCount: number;
  totalCount: number;
  level: number;
} {
  const gradable = statuses.filter((s) => s !== "no-track");
  const completedCount = gradable.filter((s) =>
    s === "complete" ||
    s === "late" ||
    s === "submitted" ||
    s === "graded"
  ).length;
  const totalCount = gradable.length;
  return {
    completedCount,
    totalCount,
    level: completedCount,
  };
}

const progressReturn = v.object({
  completedCount: v.number(),
  totalCount: v.number(),
  level: v.number(),
});

/** Assignments a given student should see: their cohorts' plus school-wide. */
async function assignmentsForStudent(
  ctx: QueryCtx,
  studentId: Id<"users">,
): Promise<Doc<"assignments">[]> {
  const all = await ctx.db.query("assignments").order("desc").collect();
  return visibleToStudent(all, await cohortIdsForUser(ctx, studentId));
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    dueDate: v.number(),
    assignedToAll: v.boolean(),
    requiresSubmission: v.optional(v.boolean()),
    allowFileUpload: v.optional(v.boolean()),
    cohortId: v.optional(v.id("cohorts")),
  },
  returns: v.id("assignments"),
  handler: async (ctx, args) => {
    const teacher = await requireStaff(ctx);
    await assertContentAccess(ctx, teacher, args.cohortId);
    const requiresSubmission = args.requiresSubmission ?? false;
    const title = args.title.trim();
    const id = await ctx.db.insert("assignments", {
      title,
      description: args.description?.trim() || undefined,
      trackId: args.trackId,
      dueDate: args.dueDate,
      createdBy: teacher._id,
      assignedToAll: args.assignedToAll,
      requiresSubmission,
      allowFileUpload: requiresSubmission
        ? (args.allowFileUpload ?? true)
        : false,
      cohortId: args.cohortId,
    });

    await notifyUsers(ctx, await activeStudentIds(ctx, args.cohortId), {
      type: "assignment_posted",
      title: `New assignment: ${title}`,
      body: `Due ${formatDueDate(args.dueDate)}.${args.description?.trim() ? ` ${args.description.trim()}` : ""}`,
      href: "/homework",
      actorId: teacher._id,
      dedupeKey: `assignment_posted:${id}`,
    });

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("assignments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const assignment = await ctx.db.get(args.id);
    if (!assignment) return null;
    await assertContentAccess(ctx, staff, assignment.cohortId);
    const subs = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment", (q) => q.eq("assignmentId", args.id))
      .collect();
    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

/** Staff view: assignments in scope, optionally narrowed to one cohort. */
export const listAll = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  returns: v.array(assignmentDoc),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return [];
    const { scope, cohortId } = await resolveCohortFilter(ctx, staff, args.cohortId);
    const all = await ctx.db.query("assignments").order("desc").collect();
    return visibleToStaff(all, scope, cohortId);
  },
});

export const listForStudent = query({
  args: {},
  returns: v.array(assignmentDoc),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];
    return await assignmentsForStudent(ctx, user._id);
  },
});

export const getStatusForStudent = query({
  args: { studentId: v.id("users") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return [];
    await assertStudentAccess(ctx, staff, args.studentId);

    const assignments = await assignmentsForStudent(ctx, args.studentId);
    const now = Date.now();

    return await Promise.all(
      assignments.map(async (a) => {
        const status = await statusForAssignment(ctx, args.studentId, a, now);
        const submission = a.requiresSubmission
          ? await getSubmission(ctx, a._id, args.studentId)
          : null;
        return {
          ...a,
          status,
          submission: submission
            ? {
                _id: submission._id,
                status: submission.status,
                grade: submission.grade,
                feedback: submission.feedback,
                submittedAt: submission.submittedAt,
              }
            : null,
        };
      }),
    );
  },
});

export const getProgressForStudent = query({
  args: { studentId: v.id("users") },
  returns: progressReturn,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    await assertStudentAccess(ctx, staff, args.studentId);
    const assignments = await assignmentsForStudent(ctx, args.studentId);
    const now = Date.now();
    const statuses = await Promise.all(
      assignments.map((a) => statusForAssignment(ctx, args.studentId, a, now)),
    );
    return progressFromStatuses(statuses);
  },
});

export const getMyStatus = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return [];

    const assignments = await assignmentsForStudent(ctx, user._id);
    const now = Date.now();
    const tracks = await ctx.db.query("tracks").collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const track = a.trackId
          ? tracks.find((t) => t._id === a.trackId) ?? null
          : null;
        const status = await statusForAssignment(ctx, user._id, a, now);
        const submission = a.requiresSubmission
          ? await getSubmission(ctx, a._id, user._id)
          : null;

        if (!a.trackId && !a.requiresSubmission) {
          return {
            ...a,
            track: null,
            status: "pending" as const,
            submission: null,
          };
        }

        return {
          ...a,
          track,
          status,
          submission: submission
            ? {
                _id: submission._id,
                status: submission.status,
                grade: submission.grade,
                feedback: submission.feedback,
                submittedAt: submission.submittedAt,
                textContent: submission.textContent,
                fileName: submission.fileName,
              }
            : null,
        };
      }),
    );
  },
});

export const getMyProgress = query({
  args: {},
  returns: progressReturn,
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return { completedCount: 0, totalCount: 0, level: 0 };

    const assignments = await assignmentsForStudent(ctx, user._id);
    const now = Date.now();
    const statuses = await Promise.all(
      assignments.map((a) => statusForAssignment(ctx, user._id, a, now)),
    );
    return progressFromStatuses(statuses);
  },
});

/**
 * Grading grid for the Teacher Hub. Each assignment lists only the students it
 * actually applies to (its cohort, or everyone visible when school-wide).
 */
export const getAllStudentStatuses = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return [];
    const { scope, cohortId } = await resolveCohortFilter(ctx, staff, args.cohortId);

    const all = await ctx.db.query("assignments").order("desc").collect();
    const assignments = visibleToStaff(all, scope, cohortId);
    const students = (await visibleStudents(ctx, staff, cohortId)).filter((s) => s.status !== "dropped");
    const membership = new Map<Id<"users">, Set<Id<"cohorts">>>();
    for (const s of students) {
      membership.set(s._id, new Set(await cohortIdsForUser(ctx, s._id)));
    }
    const tracks = await ctx.db.query("tracks").collect();
    const now = Date.now();

    return await Promise.all(
      assignments.map(async (a) => {
        const track = a.trackId
          ? tracks.find((t) => t._id === a.trackId) ?? null
          : null;
        const applicable = students.filter(
          (s) => a.cohortId === undefined || membership.get(s._id)?.has(a.cohortId),
        );
        const studentStatuses = await Promise.all(
          applicable.map(async (s) => {
            const status = await statusForAssignment(ctx, s._id, a, now);
            const submission = a.requiresSubmission
              ? await getSubmission(ctx, a._id, s._id)
              : null;
            return {
              student: s,
              status,
              submission: submission
                ? {
                    _id: submission._id,
                    status: submission.status,
                    grade: submission.grade,
                    feedback: submission.feedback,
                    submittedAt: submission.submittedAt,
                    textContent: submission.textContent,
                    fileName: submission.fileName,
                    fileKey: submission.fileKey,
                  }
                : null,
            };
          }),
        );
        return { assignment: { ...a, track }, studentStatuses };
      }),
    );
  },
});
