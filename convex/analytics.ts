import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getStaffOrNull } from "./_lib/auth";
import { canAccessStudent, resolveCohortFilter, visibleStudents, visibleToStaff } from "./lib/cohortAccess";
import {
  homeworkAverageFromSubmissions,
  testAverageForAttempts,
  type LessonMeta,
} from "./lib/scoring";
import { rosterName } from "./lib/names";
import { timezoneLabel } from "./lib/timezones";

const studentRow = v.object({
  studentId: v.id("users"),
  name: v.string(),
  testAvg: v.union(v.number(), v.null()),
  homeworkAvg: v.union(v.number(), v.null()),
  homeworkOverdue: v.number(),
  attendanceRate: v.union(v.number(), v.null()),
  starkChats: v.number(),
  coachScore: v.union(v.number(), v.null()),
  reasons: v.array(v.string()),
});

export const logEvent = internalMutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("starkConversations")),
    mode: v.union(v.literal("default"), v.literal("coach")),
    kind: v.union(
      v.literal("chat"),
      v.literal("quiz_followup"),
      v.literal("career"),
      v.literal("platform"),
      v.literal("refused"),
    ),
    topic: v.string(),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("starkHelpEvents", {
      userId: args.userId,
      conversationId: args.conversationId,
      mode: args.mode,
      kind: args.kind,
      topic: args.topic.slice(0, 80),
      createdAt: args.createdAt,
    });
    return null;
  },
});

export const getLearningAnalytics = query({
  args: {
    cohortId: v.optional(v.id("cohorts")),
    now: v.number(),
    since: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      studentCount: v.number(),
      classTestAvg: v.union(v.number(), v.null()),
      classHomeworkAvg: v.union(v.number(), v.null()),
      classAttendanceRate: v.union(v.number(), v.null()),
      starkUsers: v.number(),
      atRisk: v.array(studentRow),
      hardQuestions: v.array(
        v.object({
          lessonId: v.id("lessons"),
          lessonTitle: v.string(),
          question: v.string(),
          missRate: v.number(),
          attempts: v.number(),
        }),
      ),
      homeworkLag: v.array(
        v.object({
          assignmentId: v.id("assignments"),
          title: v.string(),
          dueDate: v.number(),
          missing: v.number(),
          roster: v.number(),
        }),
      ),
      starkTopics: v.array(
        v.object({
          topic: v.string(),
          kind: v.string(),
          count: v.number(),
        }),
      ),
      starkByStudent: v.array(
        v.object({
          studentId: v.id("users"),
          name: v.string(),
          chats: v.number(),
          lastTopic: v.union(v.string(), v.null()),
        }),
      ),
      coachScores: v.array(
        v.object({
          studentId: v.id("users"),
          name: v.string(),
          overallScore: v.number(),
          readinessLabel: v.string(),
          careerTrack: v.string(),
        }),
      ),
      states: v.array(v.object({ state: v.string(), count: v.number() })),
      timezones: v.array(v.object({ timezone: v.string(), label: v.string(), count: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getStaffOrNull(ctx);
    if (!staff) return null;

    const { scope, cohortId } = await resolveCohortFilter(ctx, staff, args.cohortId);
    const students = (await visibleStudents(ctx, staff, cohortId)).filter(
      (s) => s.status !== "dropped",
    );
    const studentIds = new Set(students.map((s) => s._id));
    const lessons = await ctx.db.query("lessons").collect();
    const lessonsById = new Map<string, LessonMeta>(
      lessons.map((lesson) => [lesson._id, lesson]),
    );
    const quizQuestionRows = await ctx.db.query("quizQuestions").collect();
    const questionsByLesson = new Map<string, typeof quizQuestionRows>();
    for (const question of quizQuestionRows) {
      const list = questionsByLesson.get(question.lessonId) ?? [];
      list.push(question);
      questionsByLesson.set(question.lessonId, list);
    }

    const assignments = visibleToStaff(
      await ctx.db.query("assignments").collect(),
      scope,
      cohortId,
    );

    const questionStats = new Map<
      string,
      { lessonId: typeof lessons[number]["_id"]; lessonTitle: string; question: string; miss: number; total: number }
    >();

    type Rollup = {
      testAvg: number | null;
      homeworkAvg: number | null;
      homeworkOverdue: number;
      attendancePresent: number;
      attendanceTotal: number;
      coachScore: number | null;
      coachReady: string | null;
      coachTrack: string | null;
    };
    const rollup = new Map<string, Rollup>();

    for (const student of students) {
      const attempts = await ctx.db
        .query("attempts")
        .withIndex("by_user", (q) => q.eq("userId", student._id))
        .collect();
      const submissions = await ctx.db
        .query("assignmentSubmissions")
        .withIndex("by_student", (q) => q.eq("studentId", student._id))
        .collect();
      const submittedIds = new Set(submissions.map((s) => s.assignmentId));
      const overdue = assignments.filter(
        (a) => a.dueDate < args.now && !submittedIds.has(a._id),
      ).length;

      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_student_date", (q) => q.eq("studentId", student._id))
        .collect();
      const scopedAttendance =
        cohortId !== undefined
          ? attendance.filter((row) => row.cohortId === cohortId)
          : attendance;

      const bestByLesson = new Map<string, (typeof attempts)[number]>();
      for (const attempt of attempts) {
        const existing = bestByLesson.get(attempt.lessonId);
        if (!existing || attempt.score > existing.score) {
          bestByLesson.set(attempt.lessonId, attempt);
        }
      }

      for (const attempt of bestByLesson.values()) {
        const lesson = lessons.find((l) => l._id === attempt.lessonId);
        if (!lesson || lesson.type !== "quiz" || !attempt.answers) continue;
        const questions = questionsByLesson.get(lesson._id) ?? [];
        const sorted = [...questions].sort((a, b) => a.order - b.order);
        for (let i = 0; i < sorted.length; i++) {
          const q = sorted[i];
          if (!q) continue;
          const key = q._id;
          const entry = questionStats.get(key) ?? {
            lessonId: lesson._id,
            lessonTitle: lesson.title,
            question: q.question,
            miss: 0,
            total: 0,
          };
          entry.total += 1;
          if (attempt.answers[i] !== q.correctIndex) entry.miss += 1;
          questionStats.set(key, entry);
        }
      }

      const reviews = await ctx.db
        .query("resumeReviews")
        .withIndex("by_user_created", (q) => q.eq("userId", student._id))
        .order("desc")
        .take(1);
      const latestCoach = reviews[0];

      rollup.set(student._id, {
        testAvg: testAverageForAttempts(attempts, lessonsById),
        homeworkAvg: homeworkAverageFromSubmissions(submissions),
        homeworkOverdue: overdue,
        attendancePresent: scopedAttendance.filter(
          (r) => r.status === "present" || r.status === "late",
        ).length,
        attendanceTotal: scopedAttendance.length,
        coachScore: latestCoach?.overallScore ?? null,
        coachReady: latestCoach?.readinessLabel ?? null,
        coachTrack: latestCoach?.careerTrack ?? null,
      });
    }

    const helpEvents = await ctx.db
      .query("starkHelpEvents")
      .withIndex("by_created", (q) => q.gte("createdAt", args.since))
      .collect();
    const scopedHelp = helpEvents.filter((e) => studentIds.has(e.userId));

    const chatsByStudent = new Map<string, { chats: number; lastTopic: string | null; lastAt: number }>();
    const topicCounts = new Map<string, { topic: string; kind: string; count: number }>();
    for (const event of scopedHelp) {
      if (event.kind === "refused") continue;
      const row = chatsByStudent.get(event.userId) ?? { chats: 0, lastTopic: null, lastAt: 0 };
      row.chats += 1;
      if (event.createdAt >= row.lastAt) {
        row.lastAt = event.createdAt;
        row.lastTopic = event.topic;
      }
      chatsByStudent.set(event.userId, row);

      const tKey = `${event.kind}:${event.topic}`;
      const t = topicCounts.get(tKey) ?? { topic: event.topic, kind: event.kind, count: 0 };
      t.count += 1;
      topicCounts.set(tKey, t);
    }

    const testValues = [...rollup.values()].map((r) => r.testAvg).filter((n): n is number => n !== null);
    const hwValues = [...rollup.values()].map((r) => r.homeworkAvg).filter((n): n is number => n !== null);
    const attTotals = [...rollup.values()].reduce(
      (acc, r) => ({ present: acc.present + r.attendancePresent, total: acc.total + r.attendanceTotal }),
      { present: 0, total: 0 },
    );

    const atRisk = students
      .map((student) => {
        const row = rollup.get(student._id);
        if (!row) return null;
        const attendanceRate =
          row.attendanceTotal > 0
            ? Math.round((row.attendancePresent / row.attendanceTotal) * 100)
            : null;
        const reasons: string[] = [];
        if (row.testAvg !== null && row.testAvg < 60) reasons.push(`Tests ${row.testAvg}%`);
        if (row.homeworkOverdue >= 2) reasons.push(`${row.homeworkOverdue} overdue homework`);
        if (attendanceRate !== null && attendanceRate < 70) reasons.push(`Attendance ${attendanceRate}%`);
        if (reasons.length === 0) return null;
        return {
          studentId: student._id,
          name: rosterName(student),
          testAvg: row.testAvg,
          homeworkAvg: row.homeworkAvg,
          homeworkOverdue: row.homeworkOverdue,
          attendanceRate,
          starkChats: chatsByStudent.get(student._id)?.chats ?? 0,
          coachScore: row.coachScore,
          reasons,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.reasons.length - a.reasons.length)
      .slice(0, 12);

    const hardQuestions = [...questionStats.values()]
      .filter((q) => q.total >= 2)
      .map((q) => ({
        lessonId: q.lessonId,
        lessonTitle: q.lessonTitle,
        question: q.question,
        missRate: Math.round((q.miss / q.total) * 100),
        attempts: q.total,
      }))
      .sort((a, b) => b.missRate - a.missRate || b.attempts - a.attempts)
      .slice(0, 8);

    const homeworkLag = [];
    for (const assignment of assignments.filter((a) => a.dueDate < args.now)) {
      const subs = await ctx.db
        .query("assignmentSubmissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();
      const submitted = new Set(subs.map((s) => s.studentId));
      const missing = students.filter((s) => !submitted.has(s._id)).length;
      if (missing === 0) continue;
      homeworkLag.push({
        assignmentId: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        missing,
        roster: students.length,
      });
    }
    homeworkLag.sort((a, b) => b.missing - a.missing);

    const stateCounts = new Map<string, number>();
    const tzCounts = new Map<string, number>();
    for (const student of students) {
      const state = student.state?.trim() || "Unknown";
      stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
      const tz = student.timezone?.trim() || "Unset";
      tzCounts.set(tz, (tzCounts.get(tz) ?? 0) + 1);
    }

    const coachScores = students
      .map((student) => {
        const row = rollup.get(student._id);
        if (!row || row.coachScore === null || !row.coachReady || !row.coachTrack) return null;
        return {
          studentId: student._id,
          name: rosterName(student),
          overallScore: row.coachScore,
          readinessLabel: row.coachReady,
          careerTrack: row.coachTrack,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.overallScore - a.overallScore);

    return {
      studentCount: students.length,
      classTestAvg: testValues.length
        ? Math.round(testValues.reduce((s, n) => s + n, 0) / testValues.length)
        : null,
      classHomeworkAvg: hwValues.length
        ? Math.round(hwValues.reduce((s, n) => s + n, 0) / hwValues.length)
        : null,
      classAttendanceRate:
        attTotals.total > 0 ? Math.round((attTotals.present / attTotals.total) * 100) : null,
      starkUsers: chatsByStudent.size,
      atRisk,
      hardQuestions,
      homeworkLag: homeworkLag.slice(0, 8),
      starkTopics: [...topicCounts.values()].sort((a, b) => b.count - a.count).slice(0, 8),
      starkByStudent: students
        .map((s) => ({
          studentId: s._id,
          name: rosterName(s),
          chats: chatsByStudent.get(s._id)?.chats ?? 0,
          lastTopic: chatsByStudent.get(s._id)?.lastTopic ?? null,
        }))
        .filter((s) => s.chats > 0)
        .sort((a, b) => b.chats - a.chats)
        .slice(0, 12),
      coachScores: coachScores.slice(0, 12),
      states: [...stateCounts.entries()]
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count),
      timezones: [...tzCounts.entries()]
        .map(([timezone, count]) => ({
          timezone,
          label: timezone === "Unset" ? "Timezone not set" : timezoneLabel(timezone),
          count,
        }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

export const getStudentInsight = query({
  args: { studentId: v.id("users"), now: v.number(), since: v.number() },
  returns: v.union(
    v.null(),
    v.object({
      timezone: v.union(v.string(), v.null()),
      timezoneLabel: v.string(),
      state: v.union(v.string(), v.null()),
      starkChats: v.number(),
      lastTopic: v.union(v.string(), v.null()),
      coachScore: v.union(v.number(), v.null()),
      coachReady: v.union(v.string(), v.null()),
      homeworkOverdue: v.number(),
      attendanceRate: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getStaffOrNull(ctx);
    if (!staff) return null;
    if (!(await canAccessStudent(ctx, staff, args.studentId))) return null;
    const student = await ctx.db.get(args.studentId);
    if (!student) return null;

    const events = await ctx.db
      .query("starkHelpEvents")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", args.studentId).gte("createdAt", args.since),
      )
      .collect();
    const chats = events.filter((e) => e.kind !== "refused");
    const last = [...chats].sort((a, b) => b.createdAt - a.createdAt)[0];

    const reviews = await ctx.db
      .query("resumeReviews")
      .withIndex("by_user_created", (q) => q.eq("userId", args.studentId))
      .order("desc")
      .take(1);

    const assignments = await ctx.db.query("assignments").collect();
    const submissions = await ctx.db
      .query("assignmentSubmissions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .collect();
    const submitted = new Set(submissions.map((s) => s.assignmentId));
    const overdue = assignments.filter((a) => a.dueDate < args.now && !submitted.has(a._id)).length;

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_student_date", (q) => q.eq("studentId", args.studentId))
      .collect();
    const present = attendance.filter((r) => r.status === "present" || r.status === "late").length;

    return {
      timezone: student.timezone ?? null,
      timezoneLabel: timezoneLabel(student.timezone),
      state: student.state ?? null,
      starkChats: chats.length,
      lastTopic: last?.topic ?? null,
      coachScore: reviews[0]?.overallScore ?? null,
      coachReady: reviews[0]?.readinessLabel ?? null,
      homeworkOverdue: overdue,
      attendanceRate:
        attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null,
    };
  },
});
