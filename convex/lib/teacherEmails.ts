export function getTeacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? process.env.TEACHER_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isTeacherEmail(email: string): boolean {
  return getTeacherEmails().includes(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
