/** Mirrors convex/lib/roles.ts for client-side gating (never a security boundary). */
export type Role = "admin" | "teacher" | "student";

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

export function isStaff(role: string | null | undefined): boolean {
  return role === "admin" || role === "teacher";
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  teacher: "Instructor",
  student: "Student",
};
