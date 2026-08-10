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

export async function emailHasActiveEnrollment(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<boolean> {
  const enrollment = await getEnrollmentByEmail(ctx, email);
  if (!enrollment) return false;
  return enrollment.status === "invited" || enrollment.status === "accepted";
}
