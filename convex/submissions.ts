import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser, requireTeacher } from "./_lib/auth";

export const r2 = new R2(components.r2);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

/** Students (and teachers) may upload homework attachment files. */
export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await getCurrentUser(ctx);
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
    if (user.role !== "student" && user.role !== "teacher") {
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
    if (args.fileSize !== undefined && args.fileSize > MAX_FILE_BYTES) {
      throw new Error("File must be 25 MB or smaller");
    }

    const existing = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .unique();

    const now = Date.now();

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
      return existing._id;
    }

    return await ctx.db.insert("assignmentSubmissions", {
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
    const teacher = await requireTeacher(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");

    if (args.grade < 0 || args.grade > 100 || !Number.isFinite(args.grade)) {
      throw new Error("Grade must be between 0 and 100");
    }

    await ctx.db.patch(args.submissionId, {
      grade: Math.round(args.grade),
      feedback: args.feedback?.trim() || undefined,
      gradedBy: teacher._id,
      gradedAt: Date.now(),
      status: args.returnToStudent ? "returned" : "graded",
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
    await requireTeacher(ctx);
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
