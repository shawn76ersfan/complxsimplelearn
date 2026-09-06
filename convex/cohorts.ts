import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUserOrNull, requireAdmin, requireStaff } from "./_lib/auth";
import {
  addMember,
  assertCohortAccess,
  cohortIdsForUser,
  releaseMember,
  scopeIncludes,
  teachingScope,
} from "./lib/cohortAccess";
import { isStaffRole } from "./lib/roles";
import { notifyUsers } from "./lib/notify";

const cohortStatus = v.union(
  v.literal("upcoming"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

const cohortDoc = v.object({
  _id: v.id("cohorts"),
  _creationTime: v.number(),
  name: v.string(),
  code: v.optional(v.string()),
  description: v.optional(v.string()),
  startDate: v.string(),
  endDate: v.optional(v.string()),
  schedule: v.optional(v.string()),
  meetingUrl: v.optional(v.string()),
  color: v.string(),
  status: cohortStatus,
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const personSummary = v.object({
  _id: v.id("users"),
  name: v.string(),
  email: v.string(),
  imageUrl: v.optional(v.string()),
  role: v.union(v.literal("admin"), v.literal("teacher"), v.literal("student")),
  status: v.optional(v.union(v.literal("active"), v.literal("dropped"))),
  streak: v.optional(v.number()),
  memberSince: v.number(),
});

type PersonSummary = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  role: "admin" | "teacher" | "student";
  status?: "active" | "dropped";
  streak?: number;
  memberSince: number;
};

const COHORT_COLORS = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#E11D48", "#8B5CF6", "#F97316", "#14B8A6"];

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T12:00:00`).getTime());
}

async function membersWithUsers(
  ctx: QueryCtx | MutationCtx,
  cohortId: Id<"cohorts">,
): Promise<{ students: PersonSummary[]; teachers: PersonSummary[] }> {
  const rows = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  const students: PersonSummary[] = [];
  const teachers: PersonSummary[] = [];
  for (const row of rows) {
    const user = await ctx.db.get(row.userId);
    if (!user) continue;
    const summary: PersonSummary = {
      _id: user._id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      status: user.status,
      streak: user.streak,
      memberSince: row.addedAt,
    };
    (row.role === "teacher" ? teachers : students).push(summary);
  }
  students.sort((a, b) => a.name.localeCompare(b.name));
  teachers.sort((a, b) => a.name.localeCompare(b.name));
  return { students, teachers };
}

/** Cohorts visible to the signed-in staff member, with headline counts. */
export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(
    v.object({
      cohort: cohortDoc,
      studentCount: v.number(),
      activeStudentCount: v.number(),
      teachers: v.array(v.object({ _id: v.id("users"), name: v.string(), imageUrl: v.optional(v.string()) })),
      pendingInvites: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return [];
    const scope = await teachingScope(ctx, staff);

    const all = await ctx.db.query("cohorts").withIndex("by_start").order("desc").collect();
    const cohorts = all.filter(
      (c) => scopeIncludes(scope, c._id) && (args.includeArchived || c.status !== "archived"),
    );

    const out = [];
    for (const cohort of cohorts) {
      const { students, teachers } = await membersWithUsers(ctx, cohort._id);
      const invites = await ctx.db
        .query("enrollments")
        .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
        .collect();
      out.push({
        cohort,
        studentCount: students.length,
        activeStudentCount: students.filter((s) => s.status !== "dropped").length,
        teachers: teachers.map((t) => ({ _id: t._id, name: t.name, imageUrl: t.imageUrl })),
        pendingInvites: invites.filter((i) => i.status === "invited").length,
      });
    }
    const rank = { active: 0, upcoming: 1, completed: 2, archived: 3 } as const;
    out.sort((a, b) => rank[a.cohort.status] - rank[b.cohort.status] || b.cohort.startDate.localeCompare(a.cohort.startDate));
    return out;
  },
});

/** One cohort with its full roster. Teachers may only open cohorts they teach. */
export const get = query({
  args: { cohortId: v.id("cohorts") },
  returns: v.union(
    v.null(),
    v.object({
      cohort: cohortDoc,
      students: v.array(personSummary),
      teachers: v.array(personSummary),
      pendingInvites: v.array(
        v.object({
          _id: v.id("enrollments"),
          email: v.string(),
          displayName: v.optional(v.string()),
          invitedAt: v.number(),
        }),
      ),
      departures: v.array(
        v.object({
          _id: v.id("cohortDepartures"),
          userId: v.id("users"),
          email: v.string(),
          name: v.string(),
          role: v.union(v.literal("student"), v.literal("teacher")),
          reason: v.string(),
          removedAt: v.number(),
          removedByName: v.string(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return null;
    const scope = await teachingScope(ctx, staff);
    if (!scopeIncludes(scope, args.cohortId)) return null;
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) return null;
    const { students, teachers } = await membersWithUsers(ctx, cohort._id);
    const invites = await ctx.db
      .query("enrollments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
      .collect();
    const departureRows = await ctx.db
      .query("cohortDepartures")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
      .order("desc")
      .take(40);
    const departures = [];
    for (const d of departureRows) {
      const remover = await ctx.db.get(d.removedBy);
      departures.push({
        _id: d._id,
        userId: d.userId,
        email: d.email,
        name: d.name,
        role: d.role,
        reason: d.reason,
        removedAt: d.removedAt,
        removedByName: remover?.name ?? "Staff",
      });
    }
    return {
      cohort,
      students,
      teachers,
      pendingInvites: invites
        .filter((i) => i.status === "invited")
        .map((i) => ({ _id: i._id, email: i.email, displayName: i.displayName, invitedAt: i.invitedAt })),
      departures,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    schedule: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    status: v.optional(cohortStatus),
    teacherIds: v.optional(v.array(v.id("users"))),
  },
  returns: v.id("cohorts"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const name = args.name.trim();
    if (name.length < 2) throw new Error("Give the cohort a name");
    if (!isValidDate(args.startDate)) throw new Error("Start date must be YYYY-MM-DD");
    if (args.endDate && !isValidDate(args.endDate)) throw new Error("End date must be YYYY-MM-DD");
    if (args.endDate && args.endDate < args.startDate) throw new Error("End date is before the start date");

    const existing = await ctx.db.query("cohorts").collect();
    const color = args.color ?? COHORT_COLORS[existing.length % COHORT_COLORS.length]!;
    const now = Date.now();

    const cohortId = await ctx.db.insert("cohorts", {
      name,
      code: args.code?.trim() || undefined,
      description: args.description?.trim() || undefined,
      startDate: args.startDate,
      endDate: args.endDate || undefined,
      schedule: args.schedule?.trim() || undefined,
      meetingUrl: args.meetingUrl?.trim() || undefined,
      color,
      status: args.status ?? "upcoming",
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });

    for (const teacherId of args.teacherIds ?? []) {
      await addMember(ctx, cohortId, teacherId, "teacher", admin._id);
    }
    return cohortId;
  },
});

export const update = mutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    schedule: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    color: v.optional(v.string()),
    status: v.optional(cohortStatus),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new Error("Cohort not found");

    const patch: Partial<Doc<"cohorts">> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2) throw new Error("Give the cohort a name");
      patch.name = name;
    }
    if (args.code !== undefined) patch.code = args.code.trim() || undefined;
    if (args.description !== undefined) patch.description = args.description.trim() || undefined;
    if (args.startDate !== undefined) {
      if (!isValidDate(args.startDate)) throw new Error("Start date must be YYYY-MM-DD");
      patch.startDate = args.startDate;
    }
    if (args.endDate !== undefined) {
      if (args.endDate && !isValidDate(args.endDate)) throw new Error("End date must be YYYY-MM-DD");
      patch.endDate = args.endDate || undefined;
    }
    const start = patch.startDate ?? cohort.startDate;
    const end = patch.endDate !== undefined ? patch.endDate : cohort.endDate;
    if (end && end < start) throw new Error("End date is before the start date");
    if (args.schedule !== undefined) patch.schedule = args.schedule.trim() || undefined;
    if (args.meetingUrl !== undefined) patch.meetingUrl = args.meetingUrl.trim() || undefined;
    if (args.color !== undefined) patch.color = args.color;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.cohortId, patch);
    return null;
  },
});

/**
 * Delete a cohort. Memberships go away; content that was targeted at it
 * becomes school-wide rather than disappearing. Prefer archiving.
 */
export const remove = mutation({
  args: { cohortId: v.id("cohorts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) return null;

    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);

    for (const table of ["assignments", "videos", "calendarEvents"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
        .collect();
      for (const row of rows) await ctx.db.patch(row._id, { cohortId: undefined });
    }
    const invites = await ctx.db
      .query("enrollments")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    for (const inv of invites) await ctx.db.patch(inv._id, { cohortId: undefined });
    const posts = await ctx.db
      .query("announcements")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    for (const p of posts) await ctx.db.delete(p._id);

    await ctx.db.delete(args.cohortId);
    return null;
  },
});

/** Staff who teach the cohort (or admins) can add existing students. */
export const addStudents = mutation({
  args: { cohortId: v.id("cohorts"), studentIds: v.array(v.id("users")) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const cohort = await assertCohortAccess(ctx, staff, args.cohortId);
    let added = 0;
    const newlyAdded: Id<"users">[] = [];
    for (const studentId of args.studentIds) {
      if (await addMember(ctx, args.cohortId, studentId, "student", staff._id)) {
        added += 1;
        newlyAdded.push(studentId);
      }
    }
    if (newlyAdded.length > 0) {
      await notifyUsers(ctx, newlyAdded, {
        type: "announcement",
        title: `You've been added to ${cohort.name}`,
        body: cohort.schedule
          ? `Class meets ${cohort.schedule}. Your dashboard now shows this cohort's schedule and assignments.`
          : "Your dashboard now shows this cohort's schedule and assignments.",
        href: "/dashboard",
        actorId: staff._id,
        dedupeKey: `cohort_welcome:${cohort._id}`,
      });
    }
    return added;
  },
});

export const removeStudent = mutation({
  args: {
    cohortId: v.id("cohorts"),
    studentId: v.id("users"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const cohort = await assertCohortAccess(ctx, staff, args.cohortId);
    const released = await releaseMember(ctx, {
      cohortId: args.cohortId,
      userId: args.studentId,
      role: "student",
      reason: args.reason,
      removedBy: staff._id,
    });
    if (released) {
      await notifyUsers(ctx, [args.studentId], {
        type: "announcement",
        title: `You've been released from ${cohort.name}`,
        body: "You still have access to the student portal. Ask an instructor if you think this was a mistake.",
        href: "/dashboard",
        actorId: staff._id,
        skipEmail: true,
      });
    }
    return null;
  },
});

/** Admin only: assign one instructor to a cohort. */
export const addTeacher = mutation({
  args: { cohortId: v.id("cohorts"), teacherId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new Error("Cohort not found");
    const created = await addMember(ctx, args.cohortId, args.teacherId, "teacher", admin._id);
    if (created) {
      await notifyUsers(ctx, [args.teacherId], {
        type: "announcement",
        title: `You're now teaching ${cohort.name}`,
        body: "The cohort appears in your Teacher Hub switcher.",
        href: "/teacher/dashboard",
        actorId: admin._id,
      });
    }
    return null;
  },
});

/** Admin only: release an instructor from a cohort and store the reason. */
export const removeTeacher = mutation({
  args: {
    cohortId: v.id("cohorts"),
    teacherId: v.id("users"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new Error("Cohort not found");
    const released = await releaseMember(ctx, {
      cohortId: args.cohortId,
      userId: args.teacherId,
      role: "teacher",
      reason: args.reason,
      removedBy: admin._id,
    });
    if (released) {
      await notifyUsers(ctx, [args.teacherId], {
        type: "announcement",
        title: `You're no longer teaching ${cohort.name}`,
        body: "This cohort will drop off your Teacher Hub switcher.",
        href: "/teacher/dashboard",
        actorId: admin._id,
        skipEmail: true,
      });
    }
    return null;
  },
});

/** Admin only: assign or unassign an instructor. */
export const setTeachers = mutation({
  args: { cohortId: v.id("cohorts"), teacherIds: v.array(v.id("users")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new Error("Cohort not found");

    const current = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_role", (q) => q.eq("cohortId", args.cohortId).eq("role", "teacher"))
      .collect();
    const wanted = new Set(args.teacherIds);
    for (const row of current) {
      if (!wanted.has(row.userId)) await ctx.db.delete(row._id);
    }
    const have = new Set(current.map((r) => r.userId));
    const added: Id<"users">[] = [];
    for (const teacherId of wanted) {
      if (!have.has(teacherId)) {
        await addMember(ctx, args.cohortId, teacherId, "teacher", admin._id);
        added.push(teacherId);
      }
    }
    if (added.length > 0) {
      await notifyUsers(ctx, added, {
        type: "announcement",
        title: `You're now teaching ${cohort.name}`,
        body: "The cohort appears in your Teacher Hub switcher.",
        href: "/teacher/dashboard",
        actorId: admin._id,
        skipEmail: false,
      });
    }
    return null;
  },
});

/**
 * Used by the invite action (which runs in Node and can't touch the db):
 * may the signed-in staff member invite into this cohort? Admins may also
 * invite without a cohort; teachers must pick one they teach.
 */
export const canInviteTo = query({
  args: { cohortId: v.optional(v.id("cohorts")), role: v.optional(v.union(v.literal("student"), v.literal("teacher"))) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || !isStaffRole(staff.role)) return false;
    if ((args.role ?? "student") === "teacher") return staff.role === "admin";
    if (args.cohortId === undefined) return staff.role === "admin";
    const scope = await teachingScope(ctx, staff);
    return scopeIncludes(scope, args.cohortId);
  },
});

/** Admin only: students who are not in any cohort yet. */
export const listUnassignedStudents = query({
  args: {},
  returns: v.array(personSummary),
  handler: async (ctx) => {
    const staff = await getCurrentUserOrNull(ctx);
    if (!staff || staff.role !== "admin") return [];
    const students = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
    const out: PersonSummary[] = [];
    for (const s of students) {
      if (s.status === "dropped") continue;
      const memberships = await cohortIdsForUser(ctx, s._id);
      if (memberships.length > 0) continue;
      out.push({
        _id: s._id,
        name: s.name,
        email: s.email,
        imageUrl: s.imageUrl,
        role: s.role,
        status: s.status,
        streak: s.streak,
        memberSince: s.createdAt,
      });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * The signed-in user's cohorts for the student dashboard card: instructors,
 * class size, and the next scheduled event on or after `today` (YYYY-MM-DD,
 * passed from the client so the query stays deterministic).
 */
export const mine = query({
  args: { today: v.string() },
  returns: v.array(
    v.object({
      cohort: cohortDoc,
      roleInCohort: v.union(v.literal("student"), v.literal("teacher")),
      instructors: v.array(v.object({ _id: v.id("users"), name: v.string(), imageUrl: v.optional(v.string()) })),
      classSize: v.number(),
      nextEvent: v.union(
        v.null(),
        v.object({ _id: v.id("calendarEvents"), date: v.string(), title: v.string(), color: v.optional(v.string()) }),
      ),
      latestAnnouncement: v.union(
        v.null(),
        v.object({ _id: v.id("announcements"), title: v.string(), body: v.string(), createdAt: v.number(), authorName: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await getCurrentUserOrNull(ctx);
    if (!me) return [];
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const out = [];
    for (const m of memberships) {
      const cohort = await ctx.db.get(m.cohortId);
      if (!cohort || cohort.status === "archived") continue;
      const { students, teachers } = await membersWithUsers(ctx, cohort._id);

      const events = await ctx.db
        .query("calendarEvents")
        .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
        .collect();
      const schoolWide = await ctx.db
        .query("calendarEvents")
        .withIndex("by_cohort", (q) => q.eq("cohortId", undefined))
        .collect();
      const upcoming = [...events, ...schoolWide]
        .filter((e) => e.date >= args.today)
        .sort((a, b) => a.date.localeCompare(b.date));
      const next = upcoming[0];

      const posts = await ctx.db
        .query("announcements")
        .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
        .order("desc")
        .take(1);
      const latest = posts[0];
      const author = latest ? await ctx.db.get(latest.authorId) : null;

      out.push({
        cohort,
        roleInCohort: m.role,
        instructors: teachers.map((t) => ({ _id: t._id, name: t.name, imageUrl: t.imageUrl })),
        classSize: students.filter((s) => s.status !== "dropped").length,
        nextEvent: next ? { _id: next._id, date: next.date, title: next.title, color: next.color } : null,
        latestAnnouncement: latest
          ? { _id: latest._id, title: latest.title, body: latest.body, createdAt: latest.createdAt, authorName: author?.name ?? "Instructor" }
          : null,
      });
    }
    return out;
  },
});
