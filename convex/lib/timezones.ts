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

export type UsTimezoneId = (typeof US_TIMEZONES)[number]["id"];

const ZONE_IDS = new Set<string>(US_TIMEZONES.map((z) => z.id));

export const DEFAULT_CLASS_TIMEZONE: UsTimezoneId = "America/New_York";

export function isUsTimezone(value: string): boolean {
  return ZONE_IDS.has(value);
}

export function timezoneLabel(id: string | undefined): string {
  if (!id) return "Eastern Time (ET)";
  return US_TIMEZONES.find((z) => z.id === id)?.label ?? id;
}
