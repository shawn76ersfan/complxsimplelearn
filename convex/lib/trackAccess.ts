import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { cohortIdsForUser } from "./cohortAccess";
import { isStaffRole } from "./roles";
import { isStaffEmail } from "./teacherEmails";

type Ctx = QueryCtx | MutationCtx;

export function isStaffUser(user: Doc<"users">): boolean {
  return isStaffRole(user.role) || isStaffEmail(user.email);
}

/** Track ids currently released to this student (cohort and/or school-wide). */
export async function openTrackIdSet(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<Set<Id<"tracks">>> {
  const open = new Set<Id<"tracks">>();

  const schoolWide = await ctx.db
    .query("trackReleases")
    .withIndex("by_cohort", (q) => q.eq("cohortId", undefined))
    .collect();
  for (const row of schoolWide) {
    if (row.open) open.add(row.trackId);
  }

  const cohortIds = await cohortIdsForUser(ctx, userId);
  for (const cohortId of cohortIds) {
    const rows = await ctx.db
      .query("trackReleases")
      .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
      .collect();
    for (const row of rows) {
      if (row.open) open.add(row.trackId);
    }
  }

  return open;
}

export async function isTrackOpenForUser(
  ctx: Ctx,
  user: Doc<"users">,
  trackId: Id<"tracks">,
): Promise<boolean> {
  if (isStaffUser(user)) return true;
  return (await openTrackIdSet(ctx, user._id)).has(trackId);
}

export async function assertTrackOpenForStudent(
  ctx: Ctx,
  user: Doc<"users">,
  trackId: Id<"tracks">,
): Promise<void> {
  if (await isTrackOpenForUser(ctx, user, trackId)) return;
  throw new Error(
    "This learning track is not open yet. Your instructor will open it when the class is ready.",
  );
}
