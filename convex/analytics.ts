import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getStaffOrNull } from "./_lib/auth";
import { assignedToStudentCohorts, canAccessStudent, cohortIdsForUser, resolveCohortFilter, visibleStudents, visibleToStaff } from "./lib/cohortAccess";
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
  progressPct: v.union(v.number(), v.null()),
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
      classProgressAvg: v.union(v.number(), v.null()),
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
      weekProgress: v.array(
        v.object({
          week: v.number(),
          trackId: v.id("tracks"),
          trackName: v.string(),
          color: v.string(),
          avgPct: v.number(),
          open: v.boolean(),
        }),
      ),
      studentProgress: v.array(
        v.object({
          studentId: v.id("users"),
          name: v.string(),
          progressPct: v.number(),
          completedLessons: v.number(),
          totalLessons: v.number(),
          testAvg: v.union(v.number(), v.null()),
          homeworkAvg: v.union(v.number(), v.null()),
          attendanceRate: v.union(v.number(), v.null()),
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
    void args.since;
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

    const publishedTracks = (await ctx.db.query("tracks").withIndex("by_published", (q) => q.eq("published", true)).collect())
      .slice()
      .sort((a, b) => a.order - b.order);
    const publishedLessons = lessons.filter((l) => l.published);
    const totalProgramLessons = publishedLessons.length;
    const lessonsByTrackId = new Map<string, typeof publishedLessons>();
    for (const lesson of publishedLessons) {
      const list = lessonsByTrackId.get(lesson.trackId) ?? [];
      list.push(lesson);
      lessonsByTrackId.set(lesson.trackId, list);
    }

    type Rollup = {
      testAvg: number | null;
      homeworkAvg: number | null;
      homeworkOverdue: number;
      attendancePresent: number;
      attendanceTotal: number;
      coachScore: number | null;
      coachReady: string | null;
      coachTrack: string | null;
      completedLessons: number;
      progressPct: number;
      byTrack: Map<string, number>;
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
      const theirHomework = assignedToStudentCohorts(
        assignments,
        await cohortIdsForUser(ctx, student._id),
      );
      const overdue = theirHomework.filter(
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
      const completedIds = new Set(attempts.map((a) => a.lessonId));
      const completedLessons = publishedLessons.filter((l) => completedIds.has(l._id)).length;
      const byTrack = new Map<string, number>();
      for (const track of publishedTracks) {
        const trackLessons = lessonsByTrackId.get(track._id) ?? [];
        if (trackLessons.length === 0) continue;
        const done = trackLessons.filter((l) => completedIds.has(l._id)).length;
        byTrack.set(track._id, Math.round((done / trackLessons.length) * 100));
      }

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
        completedLessons,
        progressPct: totalProgramLessons > 0 ? Math.round((completedLessons / totalProgramLessons) * 100) : 0,
        byTrack,
      });
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
        if (row.progressPct < 25 && totalProgramLessons > 0) reasons.push(`Program ${row.progressPct}%`);
        if (reasons.length === 0) return null;
        return {
          studentId: student._id,
          name: rosterName(student),
          testAvg: row.testAvg,
          homeworkAvg: row.homeworkAvg,
          homeworkOverdue: row.homeworkOverdue,
          attendanceRate,
          progressPct: row.progressPct,
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
    for (const assignment of assignments.filter((a) => a.dueDate < args.now && a.cohortId)) {
      const roster = [];
      for (const s of students) {
        const membership = await cohortIdsForUser(ctx, s._id);
        if (assignment.cohortId && membership.includes(assignment.cohortId)) roster.push(s);
      }
      const subs = await ctx.db
        .query("assignmentSubmissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();
      const submitted = new Set(subs.map((s) => s.studentId));
      const missing = roster.filter((s) => !submitted.has(s._id)).length;
      if (missing === 0) continue;
      homeworkLag.push({
        assignmentId: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        missing,
        roster: roster.length,
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

    const progressValues = [...rollup.values()].map((r) => r.progressPct);
    const weekProgress = publishedTracks.map((track, i) => {
      const pcts = students
        .map((s) => rollup.get(s._id)?.byTrack.get(track._id))
        .filter((n): n is number => n !== undefined);
      const avgPct = pcts.length ? Math.round(pcts.reduce((sum, n) => sum + n, 0) / pcts.length) : 0;
      return {
        week: i + 1,
        trackId: track._id,
        trackName: track.name,
        color: track.color,
        avgPct,
        open: true,
      };
    });
    const studentProgress = students
      .map((student) => {
        const row = rollup.get(student._id);
        if (!row) return null;
        const attendanceRate =
          row.attendanceTotal > 0
            ? Math.round((row.attendancePresent / row.attendanceTotal) * 100)
            : null;
        return {
          studentId: student._id,
          name: rosterName(student),
          progressPct: row.progressPct,
          completedLessons: row.completedLessons,
          totalLessons: totalProgramLessons,
          testAvg: row.testAvg,
          homeworkAvg: row.homeworkAvg,
          attendanceRate,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.progressPct - b.progressPct);

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
      classProgressAvg: progressValues.length
        ? Math.round(progressValues.reduce((s, n) => s + n, 0) / progressValues.length)
        : null,
      atRisk,
      hardQuestions,
      homeworkLag: homeworkLag.slice(0, 8),
      weekProgress,
      studentProgress,
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
      progressPct: v.union(v.number(), v.null()),
      completedLessons: v.number(),
      totalLessons: v.number(),
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
    void args.since;

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user", (q) => q.eq("userId", args.studentId))
      .collect();
    const publishedLessons = await ctx.db
      .query("lessons")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const completedIds = new Set(attempts.map((a) => a.lessonId));
    const completedLessons = publishedLessons.filter((l) => completedIds.has(l._id)).length;
    const totalLessons = publishedLessons.length;

    const reviews = await ctx.db
      .query("resumeReviews")
      .withIndex("by_user_created", (q) => q.eq("userId", args.studentId))
      .order("desc")
      .take(1);

    const assignments = assignedToStudentCohorts(
      await ctx.db.query("assignments").collect(),
      await cohortIdsForUser(ctx, args.studentId),
    );
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
      progressPct: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : null,
      completedLessons,
      totalLessons,
      coachScore: reviews[0]?.overallScore ?? null,
      coachReady: reviews[0]?.readinessLabel ?? null,
      homeworkOverdue: overdue,
      attendanceRate:
        attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null,
    };
  },
});
