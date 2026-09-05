import type { Role } from "./roles";

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Staff bootstrapped from env. Anyone here gets at least the teacher role on
 * sign-in. Kept for backward compatibility; day-to-day, admins invite teachers
 * from the Teacher Hub instead.
 */
export function getTeacherEmails(): string[] {
  return parseList(process.env.TEACHER_EMAILS ?? process.env.TEACHER_EMAIL);
}

/**
 * Admins bootstrapped from env. If ADMIN_EMAILS is not set, every env teacher
 * is an admin so an existing deployment keeps working the day this ships.
 * Set ADMIN_EMAILS to narrow it down to Cassandra + the dev.
 */
export function getAdminEmails(): string[] {
  const explicit = parseList(process.env.ADMIN_EMAILS);
  return explicit.length > 0 ? explicit : getTeacherEmails();
}

export function isTeacherEmail(email: string): boolean {
  return getTeacherEmails().includes(normalizeEmail(email));
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(normalizeEmail(email));
}

/** Role the env grants this email, or null if the env says nothing about it. */
export function envRoleForEmail(email: string): Exclude<Role, "student"> | null {
  if (isAdminEmail(email)) return "admin";
  if (isTeacherEmail(email)) return "teacher";
  return null;
}

/** True when the email is staff by env, so it must not go through student invites. */
export function isStaffEmail(email: string): boolean {
  return envRoleForEmail(email) !== null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
