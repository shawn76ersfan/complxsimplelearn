import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrNull, requireStaff } from "./_lib/auth";
import { assertContentAccess, resolveCohortFilter, staffRecipients, visibleStudents } from "./lib/cohortAccess";
import { notifyUsers, activeStudentIds } from "./lib/notify";
import { rosterName } from "./lib/names";
import { Id } from "./_generated/dataModel";

const paceValidator = v.union(
  v.literal("too_slow"),
  v.literal("just_right"),
  v.literal("too_fast"),
);
const difficultyValidator = v.union(
  v.literal("too_easy"),
  v.literal("ok"),
  v.literal("too_hard"),
);
const feelingValidator = v.union(
  v.literal("struggling"),
  v.literal("ok"),
  v.literal("thriving"),
);

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

const PACE_LABEL = {
  too_slow: "Too slow",
  just_right: "Just right",
  too_fast: "Too fast",
} as const;
const DIFFICULTY_LABEL = {
  too_easy: "Too easy",
  ok: "About right",
  too_hard: "Too hard",
} as const;
const FEELING_LABEL = {
  struggling: "Struggling",
  ok: "Okay",
  thriving: "Thriving",
} as const;

export const sendCheckIn = mutation({
  args: {
    cohortId: v.optional(v.id("cohorts")),
    prompt: v.optional(v.string()),
  },
  returns: v.object({
    surveyId: v.id("pulseSurveys"),
    sent: v.number(),
    daysSinceLast: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    await assertContentAccess(ctx, staff, args.cohortId);

    const previous = args.cohortId
      ? await ctx.db
          .query("pulseSurveys")
          .withIndex("by_cohort_sent", (q) => q.eq("cohortId", args.cohortId))
          .order("desc")
          .first()
      : await ctx.db.query("pulseSurveys").withIndex("by_sentAt").order("desc").first();

    const now = Date.now();
    const daysSinceLast =
      previous ? Math.round((now - previous.sentAt) / (24 * 60 * 60 * 1000)) : null;

    const title = "Class survey: how is it going?";
    const surveyId = await ctx.db.insert("pulseSurveys", {
      cohortId: args.cohortId,
      title,
      prompt: args.prompt?.trim() || undefined,
      sentBy: staff._id,
      sentAt: now,
    });

    const recipients = await activeStudentIds(ctx, args.cohortId);
    await notifyUsers(ctx, recipients, {
      type: "pulse_survey",
      title,
      body: "Please fill out this short class survey (pace, difficulty, and how you're feeling). Your instructor reads every response.",
      href: "/check-in",
      actorId: staff._id,
      dedupeKey: `pulse_survey:${surveyId}`,
    });

    return { surveyId, sent: recipients.length, daysSinceLast };
  },
});

export const lastSent = query({
  args: { cohortId: v.optional(v.id("cohorts")), now: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      sentAt: v.number(),
      daysAgo: v.number(),
      dueForNext: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "teacher")) return null;
    await resolveCohortFilter(ctx, staff, args.cohortId);
    const now = args.now;
    let latest = null as { sentAt: number } | null;
    if (args.cohortId) {
      latest = await ctx.db
        .query("pulseSurveys")
        .withIndex("by_cohort_sent", (q) => q.eq("cohortId", args.cohortId))
        .order("desc")
        .first();
    } else {
      latest = await ctx.db.query("pulseSurveys").withIndex("by_sentAt").order("desc").first();
    }
    if (!latest) return null;
    const daysAgo = Math.floor((now - latest.sentAt) / (24 * 60 * 60 * 1000));
    return { sentAt: latest.sentAt, daysAgo, dueForNext: daysAgo >= 14 };
  },
});

export const pendingMine = query({
  args: { now: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("pulseSurveys"),
      title: v.string(),
      prompt: v.optional(v.string()),
      sentAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user || user.role !== "student" || user.status === "dropped") return null;

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const cohortIds = new Set(memberships.filter((m) => m.role === "student").map((m) => m.cohortId));

    const recent = await ctx.db.query("pulseSurveys").withIndex("by_sentAt").order("desc").take(20);
    for (const survey of recent) {
      if (survey.sentAt < args.now - TWO_WEEKS_MS * 2) break;
      if (survey.cohortId && !cohortIds.has(survey.cohortId)) continue;
      const existing = await ctx.db
        .query("pulseSurveyResponses")
        .withIndex("by_survey_student", (q) =>
          q.eq("surveyId", survey._id).eq("studentId", user._id),
        )
        .unique();
      if (existing) continue;
      return {
        _id: survey._id,
        title: survey.title,
        prompt: survey.prompt,
        sentAt: survey.sentAt,
      };
    }
    return null;
  },
});

export const submit = mutation({
  args: {
    surveyId: v.id("pulseSurveys"),
    pace: paceValidator,
    difficulty: difficultyValidator,
    support: v.number(),
    feeling: feelingValidator,
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.role !== "student") throw new Error("Only students submit check-ins");
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) throw new Error("Check-in not found");
    if (args.support < 1 || args.support > 5) throw new Error("Support must be 1–5");

    const existing = await ctx.db
      .query("pulseSurveyResponses")
      .withIndex("by_survey_student", (q) =>
        q.eq("surveyId", args.surveyId).eq("studentId", user._id),
      )
      .unique();
    if (existing) throw new Error("You already sent this check-in");

    await ctx.db.insert("pulseSurveyResponses", {
      surveyId: args.surveyId,
      studentId: user._id,
      pace: args.pace,
      difficulty: args.difficulty,
      support: args.support,
      feeling: args.feeling,
      comment: args.comment?.trim() || undefined,
      submittedAt: Date.now(),
    });

    const staffIds = new Set<Id<"users">>(await staffRecipients(ctx, survey.cohortId));
    staffIds.add(survey.sentBy);
    const staffEmails: string[] = [];
    for (const id of staffIds) {
      if (id === user._id) continue;
      const person = await ctx.db.get(id);
      if (!person || person.status === "dropped" || !person.email) continue;
      staffEmails.push(person.email);
    }
    const sendSubmission = (
      internal as typeof internal & {
        email: typeof internal.email & {
          sendCheckInSubmissionEmail: FunctionReference<
            "action",
            "internal",
            {
              studentName: string;
              studentEmail: string;
              surveyTitle: string;
              pace: string;
              difficulty: string;
              support: number;
              feeling: string;
              comment?: string;
              staffEmails: string[];
            },
            null
          >;
        };
      }
    ).email.sendCheckInSubmissionEmail;
    await ctx.scheduler.runAfter(0, sendSubmission, {
      studentName: rosterName(user),
      studentEmail: user.email,
      surveyTitle: survey.title,
      pace: PACE_LABEL[args.pace],
      difficulty: DIFFICULTY_LABEL[args.difficulty],
      support: args.support,
      feeling: FEELING_LABEL[args.feeling],
      comment: args.comment?.trim() || undefined,
      staffEmails,
    });
    return null;
  },
});

export const latestSummary = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  returns: v.union(
    v.null(),
    v.object({
      surveyId: v.id("pulseSurveys"),
      sentAt: v.number(),
      title: v.string(),
      roster: v.number(),
      responses: v.number(),
      pace: v.object({
        too_slow: v.number(),
        just_right: v.number(),
        too_fast: v.number(),
      }),
      difficulty: v.object({
        too_easy: v.number(),
        ok: v.number(),
        too_hard: v.number(),
      }),
      feeling: v.object({
        struggling: v.number(),
        ok: v.number(),
        thriving: v.number(),
      }),
      avgSupport: v.union(v.number(), v.null()),
      comments: v.array(
        v.object({
          studentId: v.id("users"),
          name: v.string(),
          feeling: feelingValidator,
          comment: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || (staff.role !== "admin" && staff.role !== "teacher")) return null;
    await resolveCohortFilter(ctx, staff, args.cohortId);

    const survey = args.cohortId
      ? await ctx.db
          .query("pulseSurveys")
          .withIndex("by_cohort_sent", (q) => q.eq("cohortId", args.cohortId))
          .order("desc")
          .first()
      : await ctx.db.query("pulseSurveys").withIndex("by_sentAt").order("desc").first();
    if (!survey) return null;

    const students = (await visibleStudents(ctx, staff, survey.cohortId ?? args.cohortId)).filter(
      (s) => s.status !== "dropped",
    );
    const rows = await ctx.db
      .query("pulseSurveyResponses")
      .withIndex("by_survey", (q) => q.eq("surveyId", survey._id))
      .collect();

    const pace = { too_slow: 0, just_right: 0, too_fast: 0 };
    const difficulty = { too_easy: 0, ok: 0, too_hard: 0 };
    const feeling = { struggling: 0, ok: 0, thriving: 0 };
    let supportSum = 0;
    const comments: Array<{
      studentId: typeof students[number]["_id"];
      name: string;
      feeling: "struggling" | "ok" | "thriving";
      comment: string;
    }> = [];

    const studentById = new Map(students.map((s) => [s._id, s]));
    for (const row of rows) {
      pace[row.pace] += 1;
      difficulty[row.difficulty] += 1;
      feeling[row.feeling] += 1;
      supportSum += row.support;
      if (row.comment) {
        const student = studentById.get(row.studentId);
        comments.push({
          studentId: row.studentId,
          name: student ? rosterName(student) : "Student",
          feeling: row.feeling,
          comment: row.comment,
        });
      }
    }

    return {
      surveyId: survey._id,
      sentAt: survey.sentAt,
      title: survey.title,
      roster: students.length,
      responses: rows.length,
      pace,
      difficulty,
      feeling,
      avgSupport: rows.length ? Math.round((supportSum / rows.length) * 10) / 10 : null,
      comments: comments.slice(0, 12),
    };
  },
});
