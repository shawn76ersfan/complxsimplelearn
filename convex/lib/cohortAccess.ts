import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { isAdminRole, isStaffRole } from "./roles";

type Ctx = QueryCtx | MutationCtx;

/** Every cohort this user belongs to, in any role. */
export async function cohortIdsForUser(ctx: Ctx, userId: Id<"users">): Promise<Id<"cohorts">[]> {
  const rows = await ctx.db
    .query("cohortMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.map((r) => r.cohortId);
}

/**
 * Cohorts a staff member may act on. Admins see everything ("all");
 * teachers see the cohorts they are a member of as a teacher.
 */
export async function teachingScope(
  ctx: Ctx,
  staff: Doc<"users">,
): Promise<"all" | Set<Id<"cohorts">>> {
  if (isAdminRole(staff.role)) return "all";
  const rows = await ctx.db
    .query("cohortMembers")
    .withIndex("by_user", (q) => q.eq("userId", staff._id))
    .collect();
  return new Set(rows.filter((r) => r.role === "teacher").map((r) => r.cohortId));
}

export function scopeIncludes(scope: "all" | Set<Id<"cohorts">>, cohortId: Id<"cohorts">): boolean {
  return scope === "all" || scope.has(cohortId);
}

/** Content with no cohortId is school-wide and visible to every staff member. */
export function contentInScope(
  scope: "all" | Set<Id<"cohorts">>,
  cohortId: Id<"cohorts"> | undefined,
): boolean {
  return cohortId === undefined || scopeIncludes(scope, cohortId);
}

/**
 * Board / attendance: admins may enter any cohort. Everyone else must
 * be a member of that cohort (student or assigned instructor).
 */
export async function assertBoardAccess(
  ctx: Ctx,
  user: Doc<"users">,
  cohortId: Id<"cohorts">,
): Promise<Doc<"cohorts">> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) throw new Error("Cohort not found");
  if (isAdminRole(user.role)) return cohort;
  if (user.status === "dropped") throw new Error("Account is inactive");

  const membership = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort_user", (q) => q.eq("cohortId", cohortId).eq("userId", user._id))
    .unique();
  if (!membership) {
    throw new Error("You are not in this cohort");
  }
  return cohort;
}

export async function canAccessBoard(
  ctx: Ctx,
  user: Doc<"users">,
  cohortId: Id<"cohorts">,
): Promise<boolean> {
  try {
    await assertBoardAccess(ctx, user, cohortId);
    return true;
  } catch {
    return false;
  }
}

/** Throws unless the staff member may manage this cohort. */
export async function assertCohortAccess(
  ctx: Ctx,
  staff: Doc<"users">,
  cohortId: Id<"cohorts">,
): Promise<Doc<"cohorts">> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) throw new Error("Cohort not found");
  const scope = await teachingScope(ctx, staff);
  if (!scopeIncludes(scope, cohortId)) {
    throw new Error("You are not an instructor for this cohort");
  }
  return cohort;
}

/**
 * May this staff member create/edit/delete content targeted at `cohortId`?
 * School-wide content (undefined) is admin-only; cohort content requires
 * teaching that cohort.
 */
export async function assertContentAccess(
  ctx: Ctx,
  staff: Doc<"users">,
  cohortId: Id<"cohorts"> | undefined,
): Promise<void> {
  if (cohortId === undefined) {
    if (!isAdminRole(staff.role)) {
      throw new Error("Pick a cohort. Only admins can post school-wide.");
    }
    return;
  }
  await assertCohortAccess(ctx, staff, cohortId);
}

/**
 * Optional cohort filter coming from the Teacher Hub switcher. Validates the
 * teacher is allowed to look at it; admins may look at any cohort.
 */
export async function resolveCohortFilter(
  ctx: Ctx,
  staff: Doc<"users">,
  cohortId: Id<"cohorts"> | undefined,
): Promise<{ scope: "all" | Set<Id<"cohorts">>; cohortId: Id<"cohorts"> | undefined }> {
  const scope = await teachingScope(ctx, staff);
  if (cohortId !== undefined && !scopeIncludes(scope, cohortId)) {
    throw new Error("You are not an instructor for this cohort");
  }
  return { scope, cohortId };
}

async function studentMembersOf(ctx: Ctx, cohortId: Id<"cohorts">): Promise<Id<"users">[]> {
  const rows = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort_role", (q) => q.eq("cohortId", cohortId).eq("role", "student"))
    .collect();
  return rows.map((r) => r.userId);
}

/**
 * Students a staff member can see, optionally narrowed to one cohort.
 * - admin, no filter  -> every student (including ones not in any cohort yet)
 * - admin, cohort     -> that cohort's students
 * - teacher, no filter-> union of students across the cohorts they teach
 * - teacher, cohort   -> that cohort's students (must be one they teach)
 * Dropped students are included; callers decide whether to show them.
 */
export async function visibleStudents(
  ctx: Ctx,
  staff: Doc<"users">,
  cohortId?: Id<"cohorts">,
): Promise<Doc<"users">[]> {
  const { scope } = await resolveCohortFilter(ctx, staff, cohortId);

  if (cohortId !== undefined) {
    const ids = await studentMembersOf(ctx, cohortId);
    return await loadUsers(ctx, ids);
  }

  if (scope === "all") {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "student"))
      .collect();
  }

  const ids = new Set<Id<"users">>();
  for (const id of scope) {
    for (const userId of await studentMembersOf(ctx, id)) ids.add(userId);
  }
  return await loadUsers(ctx, [...ids]);
}

async function loadUsers(ctx: Ctx, ids: Id<"users">[]): Promise<Doc<"users">[]> {
  const out: Doc<"users">[] = [];
  for (const id of ids) {
    const user = await ctx.db.get(id);
    if (user && user.role === "student") out.push(user);
  }
  return out;
}

/** True when the staff member teaches (or admins) this student. */
export async function canAccessStudent(
  ctx: Ctx,
  staff: Doc<"users">,
  studentId: Id<"users">,
): Promise<boolean> {
  const scope = await teachingScope(ctx, staff);
  if (scope === "all") return true;
  if (scope.size === 0) return false;
  const memberships = await cohortIdsForUser(ctx, studentId);
  return memberships.some((c) => scope.has(c));
}

export async function assertStudentAccess(
  ctx: Ctx,
  staff: Doc<"users">,
  studentId: Id<"users">,
): Promise<void> {
  if (!(await canAccessStudent(ctx, staff, studentId))) {
    throw new Error("This student is not in one of your cohorts");
  }
}

/**
 * Recipients for content: the cohort's active students, or every active
 * student when the content is school-wide.
 */
export async function studentRecipients(
  ctx: Ctx,
  cohortId: Id<"cohorts"> | undefined,
): Promise<Id<"users">[]> {
  if (cohortId !== undefined) {
    const users = await loadUsers(ctx, await studentMembersOf(ctx, cohortId));
    return users.filter((u) => u.status !== "dropped").map((u) => u._id);
  }
  const all = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "student"))
    .collect();
  return all.filter((u) => u.status !== "dropped").map((u) => u._id);
}

/** Teachers of a cohort, or every admin + teacher when school-wide. */
export async function staffRecipients(
  ctx: Ctx,
  cohortId: Id<"cohorts"> | undefined,
): Promise<Id<"users">[]> {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();
  const ids = new Set<Id<"users">>(admins.map((a) => a._id));
  if (cohortId !== undefined) {
    const rows = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_role", (q) => q.eq("cohortId", cohortId).eq("role", "teacher"))
      .collect();
    for (const r of rows) ids.add(r.userId);
  } else {
    const teachers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "teacher"))
      .collect();
    for (const t of teachers) ids.add(t._id);
  }
  return [...ids];
}

/**
 * Idempotently add a user to a cohort. Returns true when a new membership was
 * created. Validates the user's account role matches the membership role.
 */
export async function addMember(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
  role: "student" | "teacher",
  addedBy: Id<"users">,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  if (role === "teacher" && !isStaffRole(user.role)) {
    throw new Error(`${user.name} is not an instructor. Change their role first.`);
  }
  if (role === "student" && user.role !== "student") {
    throw new Error(`${user.name} is staff and cannot be enrolled as a student.`);
  }
  const existing = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort_user", (q) => q.eq("cohortId", cohortId).eq("userId", userId))
    .unique();
  if (existing) {
    if (existing.role !== role) await ctx.db.patch(existing._id, { role });
    return false;
  }
  await ctx.db.insert("cohortMembers", { cohortId, userId, role, addedBy, addedAt: Date.now() });
  return true;
}

/** Used by users.store: enroll a freshly signed-up student into their invited cohort. */
export async function addStudentToCohort(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
  addedBy: Id<"users">,
): Promise<void> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) return;
  await addMember(ctx, cohortId, userId, "student", addedBy);
}

/** Used by users.store: drop a newly signed-up instructor into the cohort they were invited to. */
export async function addTeacherToCohort(
  ctx: MutationCtx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
  addedBy: Id<"users">,
): Promise<void> {
  const cohort = await ctx.db.get(cohortId);
  if (!cohort) return;
  await addMember(ctx, cohortId, userId, "teacher", addedBy);
}

export function normalizeReleaseReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new Error("Add a short reason for releasing them from this cohort.");
  }
  if (trimmed.length > 500) {
    throw new Error("Reason is too long (keep it under 500 characters).");
  }
  return trimmed;
}

/** Delete the membership and write a lasting departure record. Returns false if they were not a member. */
export async function releaseMember(
  ctx: MutationCtx,
  args: {
    cohortId: Id<"cohorts">;
    userId: Id<"users">;
    role: "student" | "teacher";
    reason: string;
    removedBy: Id<"users">;
  },
): Promise<boolean> {
  const reason = normalizeReleaseReason(args.reason);
  const row = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort_user", (q) => q.eq("cohortId", args.cohortId).eq("userId", args.userId))
    .unique();
  if (!row || row.role !== args.role) return false;

  const user = await ctx.db.get(args.userId);
  await ctx.db.delete(row._id);
  await ctx.db.insert("cohortDepartures", {
    cohortId: args.cohortId,
    userId: args.userId,
    email: user?.email ?? "",
    name: user?.name ?? "Unknown",
    role: args.role,
    reason,
    removedBy: args.removedBy,
    removedAt: Date.now(),
  });
  return true;
}

/** Filter a list of cohort-tagged rows down to what a student may see. */
export function visibleToStudent<T extends { cohortId?: Id<"cohorts"> }>(
  rows: T[],
  myCohorts: Id<"cohorts">[],
): T[] {
  const mine = new Set(myCohorts);
  return rows.filter((r) => r.cohortId === undefined || mine.has(r.cohortId));
}

/** Filter cohort-tagged rows to a staff member's scope and optional switcher filter. */
export function visibleToStaff<T extends { cohortId?: Id<"cohorts"> }>(
  rows: T[],
  scope: "all" | Set<Id<"cohorts">>,
  cohortId: Id<"cohorts"> | undefined,
): T[] {
  return rows.filter((r) => {
    if (cohortId !== undefined) return r.cohortId === undefined || r.cohortId === cohortId;
    return contentInScope(scope, r.cohortId);
  });
}
