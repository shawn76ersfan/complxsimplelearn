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
