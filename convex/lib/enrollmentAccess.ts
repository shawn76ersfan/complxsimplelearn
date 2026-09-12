import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { normalizeEmail } from "./teacherEmails";

export function isPlaceholderName(name: string | undefined | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.toLowerCase() === "student";
}

export async function getEnrollmentByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<Doc<"enrollments"> | null> {
  return await ctx.db
    .query("enrollments")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(email)))
    .unique();
}

/** Looks up a user by email, trying the normalized form and Clerk's original casing. */
export async function getUserByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<Doc<"users"> | null> {
  const normalized = normalizeEmail(email);
  const byNormalized = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  if (byNormalized) return byNormalized;
  const trimmed = email.trim();
  if (trimmed !== normalized) {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmed))
      .unique();
  }
  return null;
}

export async function emailHasActiveEnrollment(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<boolean> {
  const enrollment = await getEnrollmentByEmail(ctx, email);
  if (!enrollment) return false;
  return enrollment.status === "invited" || enrollment.status === "accepted";
}
