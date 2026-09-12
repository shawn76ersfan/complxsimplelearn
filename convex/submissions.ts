import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser, requireStaff } from "./_lib/auth";
import { notifyUsers, teacherIds } from "./lib/notify";
import { assertStudentAccess, contentInScope, teachingScope, visibleToStudent, cohortIdsForUser } from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";
import { bumpUserStreak } from "./lib/scoring";
import { assertOwnedUpload, assertUploadAllowed, claimUpload } from "./lib/uploads";

export const r2 = new R2(components.r2);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Students (and teachers) may upload homework attachment files. */
export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await assertUploadAllowed(ctx);
  },
  onSyncMetadata: async (ctx, { key }) => {
    await claimUpload(ctx, r2, key, "homework", { maxBytes: MAX_FILE_BYTES });
  },
});

const submissionReturn = v.object({
  _id: v.id("assignmentSubmissions"),
  _creationTime: v.number(),
  assignmentId: v.id("assignments"),
  studentId: v.id("users"),
  textContent: v.optional(v.string()),
  fileKey: v.optional(v.string()),
  fileName: v.optional(v.string()),
  contentType: v.optional(v.string()),
  fileSize: v.optional(v.number()),
  submittedAt: v.number(),
  status: v.union(
    v.literal("submitted"),
    v.literal("graded"),
    v.literal("returned"),
  ),
  grade: v.optional(v.number()),
  feedback: v.optional(v.string()),
  gradedBy: v.optional(v.id("users")),
  gradedAt: v.optional(v.number()),
  fileUrl: v.union(v.string(), v.null()),
});

async function withFileUrl(
  key: string | undefined,
): Promise<string | null> {
  if (!key) return null;
  try {
    return await r2.getUrl(key, { expiresIn: 60 * 60 * 24 });
  } catch {
    return null;
  }
}

/** Student: submit or resubmit work for an assignment. */
export const submit = mutation({
  args: {
    assignmentId: v.id("assignments"),
    textContent: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  returns: v.id("assignmentSubmissions"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student" && !isStaffRole(user.role)) {
      throw new Error("Not authorized");
    }
    if (user.status === "dropped") throw new Error("Account is inactive");

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    if (!assignment.requiresSubmission) {
      throw new Error("This assignment does not accept submissions");
    }

    const text = args.textContent?.trim() || undefined;
    if (!text && !args.fileKey) {
      throw new Error("Add written work or attach a file");
    }
    if (args.fileKey && !assignment.allowFileUpload) {
      throw new Error("File uploads are not enabled for this assignment");
    }
    if (args.fileKey) {
      await assertOwnedUpload(ctx, user._id, args.fileKey, "homework");
      const meta = await r2.getMetadata(ctx, args.fileKey);
      if (meta?.size !== undefined && meta.size > MAX_FILE_BYTES) {
        throw new Error("File must be 25 MB or smaller");
      }
    }
    const studentCohorts = await cohortIdsForUser(ctx, user._id);
    if (!visibleToStudent([assignment], studentCohorts).length && !isStaffRole(user.role)) {
      throw new Error("This assignment is not available to you");
    }

    const existing = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .unique();

    const now = Date.now();

    // In-app only: the cohort's teachers (and admins) see it in the bell.
    await notifyUsers(ctx, await teacherIds(ctx, assignment.cohortId), {
      type: "submission_received",
      title: `${user.name} ${existing ? "resubmitted" : "submitted"} “${assignment.title}”`,
      body: now > assignment.dueDate ? "Turned in after the due date." : undefined,
      href: "/teacher/dashboard",
      actorId: user._id,
      skipEmail: true,
    });

    if (existing) {
      // Replace prior file if a new one was uploaded
      if (
        args.fileKey &&
        existing.fileKey &&
        args.fileKey !== existing.fileKey
      ) {
        try {
          await r2.deleteObject(ctx, existing.fileKey);
        } catch {
          // ignore orphan cleanup failures
        }
      }

      const nextFileKey =
        args.fileKey !== undefined ? args.fileKey : existing.fileKey;
      const nextFileName =
        args.fileName !== undefined ? args.fileName : existing.fileName;
      const nextContentType =
        args.contentType !== undefined
          ? args.contentType
          : existing.contentType;
      const nextFileSize =
        args.fileSize !== undefined ? args.fileSize : existing.fileSize;

      // Full replace clears prior grade/feedback on resubmit
      await ctx.db.replace(existing._id, {
        assignmentId: existing.assignmentId,
        studentId: existing.studentId,
        textContent: text,
        fileKey: nextFileKey,
        fileName: nextFileName,
        contentType: nextContentType,
        fileSize: nextFileSize,
        submittedAt: now,
        status: "submitted",
      });
      await bumpUserStreak(ctx, user);
      return existing._id;
    }

    const submissionId = await ctx.db.insert("assignmentSubmissions", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      textContent: text,
      fileKey: args.fileKey,
      fileName: args.fileName,
      contentType: args.contentType,
      fileSize: args.fileSize,
      submittedAt: now,
      status: "submitted",
    });
    await bumpUserStreak(ctx, user);
    return submissionId;
  },
});

/** Teacher: grade a submission. */
export const grade = mutation({
  args: {
    submissionId: v.id("assignmentSubmissions"),
    grade: v.number(),
    feedback: v.optional(v.string()),
    returnToStudent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const teacher = await requireStaff(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    await assertStudentAccess(ctx, teacher, submission.studentId);

    if (args.grade < 0 || args.grade > 100 || !Number.isFinite(args.grade)) {
      throw new Error("Grade must be between 0 and 100");
    }

    const grade = Math.round(args.grade);
    const feedback = args.feedback?.trim() || undefined;
    await ctx.db.patch(args.submissionId, {
      grade,
      feedback,
      gradedBy: teacher._id,
      gradedAt: Date.now(),
      status: args.returnToStudent ? "returned" : "graded",
    });

    const assignment = await ctx.db.get(submission.assignmentId);
    await notifyUsers(ctx, [submission.studentId], {
      type: "submission_graded",
      title: `Graded: ${assignment?.title ?? "your assignment"} — ${grade}%`,
      body: feedback ? `${teacher.name}: “${feedback}”` : `Graded by ${teacher.name}.`,
      href: "/homework",
      actorId: teacher._id,
    });
    return null;
  },
});

/** Student: own submission for an assignment (with file URL). */
export const getMine = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.union(submissionReturn, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const row = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .unique();
    if (!row) return null;
    return { ...row, fileUrl: await withFileUrl(row.fileKey) };
  },
});

/** Teacher: all submissions for one assignment. */
export const listForAssignment = query({
  args: { assignmentId: v.id("assignments") },
  returns: v.array(
    v.object({
      submission: submissionReturn,
      student: v.object({
        _id: v.id("users"),
        name: v.string(),
        email: v.string(),
        imageUrl: v.optional(v.string()),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) return [];
    const scope = await teachingScope(ctx, staff);
    if (!contentInScope(scope, assignment.cohortId)) return [];
    const rows = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", args.assignmentId),
      )
      .collect();

    const out: Array<{
      submission: {
        _id: typeof rows[0]["_id"];
        _creationTime: number;
        assignmentId: typeof rows[0]["assignmentId"];
        studentId: typeof rows[0]["studentId"];
        textContent?: string;
        fileKey?: string;
        fileName?: string;
        contentType?: string;
        fileSize?: number;
        submittedAt: number;
        status: typeof rows[0]["status"];
        grade?: number;
        feedback?: string;
        gradedBy?: typeof rows[0]["gradedBy"];
        gradedAt?: number;
        fileUrl: string | null;
      };
      student: {
        _id: typeof rows[0]["studentId"];
        name: string;
        email: string;
        imageUrl?: string;
      };
    }> = [];

    for (const row of rows) {
      const student = await ctx.db.get(row.studentId);
      if (!student) continue;
      out.push({
        submission: { ...row, fileUrl: await withFileUrl(row.fileKey) },
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
          imageUrl: student.imageUrl,
        },
      });
    }

    out.sort((a, b) => b.submission.submittedAt - a.submission.submittedAt);
    return out;
  },
});
