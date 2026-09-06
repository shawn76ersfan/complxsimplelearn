/** Mirrors convex/lib/roles.ts for client-side gating (never a security boundary). */
export type Role = "admin" | "teacher" | "student";

export function isAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Same as `isAdmin`. Kept so Convex-style `isAdminRole` imports don't crash the app. */
export const isAdminRole = isAdmin;

export function isStaff(role: string | null | undefined): boolean {
  return role === "admin" || role === "teacher";
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  teacher: "Instructor",
  student: "Student",
};
