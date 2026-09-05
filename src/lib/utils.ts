import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(ts);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function percentageColor(pct: number): string {
  if (pct >= 80) return "text-sky-500";
  if (pct >= 60) return "text-amber-500";
  return "text-rose-500";
}

export function percentageBg(pct: number): string {
  if (pct >= 80) return "bg-sky-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-rose-500";
}
