/**
 * Pure role helpers shared by Convex functions and the Next.js client
 * (import from `convex/lib/roles` on either side).
 *
 * - admin:   Cassandra + the dev. Runs the school: cohorts, staff, CMS,
 *            Stark knowledge, info sessions, quote of the week, dropping students.
 * - teacher: An instructor. Scoped to the cohorts they are assigned to.
 * - student: Sees school-wide content plus content targeted at their cohorts.
 */
export type Role = "admin" | "teacher" | "student";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Admins and teachers both count as staff for the Teacher Hub. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "teacher";
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  teacher: "Instructor",
  student: "Student",
};
