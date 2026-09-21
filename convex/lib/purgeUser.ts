import type { MutationCtx } from "../_generated/server";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import { R2 } from "@convex-dev/r2";
import { components } from "../_generated/api";
import { normalizeEmail } from "./teacherEmails";

const r2 = new R2(components.r2);

async function deleteObjectQuietly(ctx: MutationCtx, key: string | undefined) {
  if (!key) return;
  try {
    await r2.deleteObject(ctx, key);
  } catch (err) {
    console.warn("Could not delete R2 object during account purge", key, err);
  }
}

async function deleteAll(ctx: MutationCtx, rows: { _id: Id<TableNames> }[]) {
  for (const row of rows) await ctx.db.delete(row._id);
}

/**
 * Erase a user and everything that points back at them. Used when a person
 * deletes their own account. After this runs, staff cannot see the account
 * anywhere in the Teacher Hub: no roster row, no dropped list, no grades,
 * no Board posts, no Stark history, no departure record.
 *
 * Content authored by staff (assignments, videos, announcements) is left in
 * place; readers already handle a missing author.
 */
export async function purgeUser(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  const userId = user._id;

  // Cohort rosters and the release history for that person.
  await deleteAll(
    ctx,
    await ctx.db.query("cohortMembers").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db.query("cohortDepartures").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db.query("attendance").withIndex("by_student_date", (q) => q.eq("studentId", userId)).collect(),
  );

  // Grades and homework.
  await deleteAll(
    ctx,
    await ctx.db.query("attempts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  );
  const submissions = await ctx.db
    .query("assignmentSubmissions")
    .withIndex("by_student", (q) => q.eq("studentId", userId))
    .collect();
  for (const s of submissions) {
    await deleteObjectQuietly(ctx, s.fileKey);
    await ctx.db.delete(s._id);
  }

  // Messages to and about them.
  await deleteAll(
    ctx,
    await ctx.db.query("feedback").withIndex("by_student", (q) => q.eq("studentId", userId)).collect(),
  );
  await deleteAll(
    ctx,
    await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  );
  const emailLogs = await ctx.db.query("emailLogs").collect();
  for (const log of emailLogs) {
    if (!log.recipientIds.includes(userId)) continue;
    await ctx.db.patch(log._id, {
      recipientIds: log.recipientIds.filter((id) => id !== userId),
    });
  }

  // Board activity.
  const posts = await ctx.db
    .query("boardMessages")
    .withIndex("by_author_created", (q) => q.eq("authorId", userId))
    .collect();
  for (const post of posts) {
    await deleteObjectQuietly(ctx, post.imageKey);
    await deleteAll(
      ctx,
      await ctx.db.query("boardReactions").withIndex("by_message", (q) => q.eq("messageId", post._id)).collect(),
    );
    await ctx.db.delete(post._id);
  }
  const allReactions = await ctx.db.query("boardReactions").collect();
  await deleteAll(ctx, allReactions.filter((r) => r.userId === userId));
  const typing = await ctx.db.query("boardTyping").collect();
  await deleteAll(ctx, typing.filter((t) => t.userId === userId));

  await deleteAll(
    ctx,
    await ctx.db.query("pulseSurveyResponses").withIndex("by_student", (q) => q.eq("studentId", userId)).collect(),
  );

  // Stark: conversations, messages, Coach Mode resumes and reviews, usage topics.
  const conversations = await ctx.db
    .query("starkConversations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const convo of conversations) {
    await deleteAll(
      ctx,
      await ctx.db.query("starkMessages").withIndex("by_conversation", (q) => q.eq("conversationId", convo._id)).collect(),
    );
    await deleteAll(
      ctx,
      await ctx.db.query("coachPlans").withIndex("by_conversation", (q) => q.eq("conversationId", convo._id)).collect(),
    );
    await ctx.db.delete(convo._id);
  }
  await deleteAll(
    ctx,
    await ctx.db.query("resumeReviews").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  );
  const resumes = await ctx.db
    .query("resumeVersions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const resume of resumes) {
    await deleteObjectQuietly(ctx, resume.fileKey);
    await ctx.db.delete(resume._id);
  }
  await deleteAll(
    ctx,
    await ctx.db.query("starkHelpEvents").withIndex("by_user_created", (q) => q.eq("userId", userId)).collect(),
  );

  // Any remaining files they uploaded.
  const uploads = await ctx.db
    .query("uploadedObjects")
    .withIndex("by_user_created", (q) => q.eq("userId", userId))
    .collect();
  for (const upload of uploads) {
    await deleteObjectQuietly(ctx, upload.key);
    await ctx.db.delete(upload._id);
  }

  // Their invitation, so the email is not shown as an enrolled/invited person.
  if (user.email) {
    const email = normalizeEmail(user.email);
    await deleteAll(
      ctx,
      await ctx.db.query("enrollments").withIndex("by_email", (q) => q.eq("email", email)).collect(),
    );
  }

  await ctx.db.delete(userId);
}
