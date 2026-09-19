export const US_TIMEZONES = [
  { id: "America/New_York", label: "Eastern Time (ET)" },
  { id: "America/Chicago", label: "Central Time (CT)" },
  { id: "America/Denver", label: "Mountain Time (MT)" },
  { id: "America/Phoenix", label: "Arizona (no DST)" },
  { id: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { id: "America/Anchorage", label: "Alaska Time" },
  { id: "Pacific/Honolulu", label: "Hawaii Time" },
  { id: "America/Puerto_Rico", label: "Atlantic / Puerto Rico" },
  { id: "Pacific/Guam", label: "Guam" },
  { id: "UTC", label: "UTC (outside the US)" },
] as const;

export const DEFAULT_CLASS_TIMEZONE = "America/New_York";

const ZONE_IDS = new Set<string>(US_TIMEZONES.map((z) => z.id));

export function isUsTimezone(value: string): boolean {
  return ZONE_IDS.has(value);
}

export function timezoneLabel(id: string | undefined): string {
  if (!id) return "Eastern Time (ET)";
  return US_TIMEZONES.find((z) => z.id === id)?.label ?? id;
}

export function guessTimezone(): string {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && ZONE_IDS.has(detected)) return detected;
  } catch {
    /* ignore */
  }
  return DEFAULT_CLASS_TIMEZONE;
}

export function formatClock(atMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(atMs));
}
