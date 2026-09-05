import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { isAdminRole, isStaffRole } from "../lib/roles";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found. Please refresh the page.");
  return user;
}

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Admin or teacher. Use for anything in the Teacher Hub that is cohort-scoped. */
export async function requireStaff(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!isStaffRole(user.role)) throw new Error("Instructor access required");
  return user;
}

/** Admin only. School-wide settings, cohorts, staff, CMS, dropping students. */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!isAdminRole(user.role)) throw new Error("Admin access required");
  return user;
}

/** Like requireStaff but returns null instead of throwing, for list queries. */
export async function getStaffOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

/** @deprecated Use requireStaff (cohort-scoped) or requireAdmin (school-wide). */
export const requireTeacher = requireStaff;
