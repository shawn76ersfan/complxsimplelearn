"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { isAdmin as isAdminRole } from "@/lib/roles";

export type CohortSummary = {
  cohort: {
    _id: Id<"cohorts">;
    name: string;
    code?: string;
    description?: string;
    startDate: string;
    endDate?: string;
    schedule?: string;
    meetingUrl?: string;
    color: string;
    status: "upcoming" | "active" | "completed" | "archived";
  };
  studentCount: number;
  activeStudentCount: number;
  teachers: { _id: Id<"users">; name: string; imageUrl?: string }[];
  pendingInvites: number;
};

type CohortScope = {
  /** undefined = "all my cohorts" (admins: whole school). */
  cohortId: Id<"cohorts"> | undefined;
  setCohortId: (id: Id<"cohorts"> | undefined) => void;
  cohorts: CohortSummary[] | undefined;
  selected: CohortSummary | undefined;
  isAdmin: boolean;
  /** Teachers with exactly one cohort are pinned to it; no "all" option. */
  canViewAll: boolean;
  profile: { _id: Id<"users">; name: string; role: string } | null | undefined;
};

const Ctx = createContext<CohortScope | null>(null);
const STORAGE_KEY = "cs.teacherHub.cohort";

// The remembered switcher choice lives in localStorage and is read through
// useSyncExternalStore, so the server render and first client render agree
// (both see "nothing stored") and there's no setState-in-effect dance.
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readStored(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}
function readServer(): string | null {
  return null;
}
function writeStored(id: string | undefined) {
  if (id) window.localStorage.setItem(STORAGE_KEY, id);
  else window.localStorage.removeItem(STORAGE_KEY);
  for (const cb of listeners) cb();
}

export function CohortScopeProvider({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.users.getMyProfile);
  const cohorts = useQuery(api.cohorts.list, {}) as CohortSummary[] | undefined;
  const stored = useSyncExternalStore(subscribe, readStored, readServer);

  const isAdmin = isAdminRole(profile?.role);
  const canViewAll = isAdmin || (cohorts?.length ?? 0) > 1;

  // Effective selection: the remembered cohort if it still exists in scope;
  // otherwise a single-cohort teacher is pinned to their one cohort and
  // everyone else sees "all".
  const cohortId = useMemo<Id<"cohorts"> | undefined>(() => {
    if (!cohorts) return undefined;
    const valid = cohorts.find((c) => c.cohort._id === stored);
    if (valid) return valid.cohort._id;
    if (!canViewAll && cohorts.length >= 1) return cohorts[0]!.cohort._id;
    return undefined;
  }, [cohorts, stored, canViewAll]);

  const setCohortId = useCallback((id: Id<"cohorts"> | undefined) => {
    writeStored(id);
  }, []);

  const value = useMemo<CohortScope>(
    () => ({
      cohortId,
      setCohortId,
      cohorts,
      selected: cohorts?.find((c) => c.cohort._id === cohortId),
      isAdmin,
      canViewAll,
      profile: profile ? { _id: profile._id, name: profile.name, role: profile.role } : profile,
    }),
    [cohortId, setCohortId, cohorts, isAdmin, canViewAll, profile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Current Teacher Hub cohort filter. Safe to call outside the provider (e.g.
 * the student detail page): returns an unscoped, non-admin view.
 */
export function useCohortScope(): CohortScope {
  const ctx = useContext(Ctx);
  const profile = useQuery(api.users.getMyProfile, ctx ? "skip" : {});
  if (ctx) return ctx;
  return {
    cohortId: undefined,
    setCohortId: () => {},
    cohorts: undefined,
    selected: undefined,
    isAdmin: isAdminRole(profile?.role),
    canViewAll: true,
    profile: profile ? { _id: profile._id, name: profile.name, role: profile.role } : profile,
  };
}

export const COHORT_STATUS_LABEL: Record<CohortSummary["cohort"]["status"], string> = {
  upcoming: "Starts soon",
  active: "In session",
  completed: "Graduated",
  archived: "Archived",
};

/** "Week 3 of 12" style progress from the cohort's dates. */
export function cohortWeek(
  startDate: string,
  endDate: string | undefined,
  today = new Date(),
): { week: number; totalWeeks: number | null; pct: number; daysUntilStart: number } {
  const start = new Date(`${startDate}T00:00:00`);
  const msPerWeek = 7 * 86400000;
  const elapsed = today.getTime() - start.getTime();
  const daysUntilStart = Math.ceil(-elapsed / 86400000);
  const week = Math.max(1, Math.floor(elapsed / msPerWeek) + 1);
  if (!endDate) return { week, totalWeeks: null, pct: 0, daysUntilStart };
  const end = new Date(`${endDate}T23:59:59`);
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerWeek));
  const pct = Math.min(100, Math.max(0, Math.round((elapsed / (end.getTime() - start.getTime())) * 100)));
  return { week: Math.min(week, totalWeeks), totalWeeks, pct, daysUntilStart };
}

export function formatCohortDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(y, m - 1, d, 12),
  );
}
