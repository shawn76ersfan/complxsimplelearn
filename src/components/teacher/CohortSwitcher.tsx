"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { Layers, Users } from "lucide-react";
import { COHORT_STATUS_LABEL, useCohortScope } from "./CohortContext";

/**
 * Horizontal strip of cohort chips in the Teacher Hub header. Selecting one
 * scopes every tab (students, scores, homework, calendar, videos, email) to it.
 */
export function CohortSwitcher() {
  const { cohortId, setCohortId, cohorts, canViewAll, isAdmin } = useCohortScope();

  if (!cohorts) {
    return (
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[52px] w-44 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
        style={{ background: "var(--surface-2)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}
      >
        <Layers size={16} />
        {isAdmin
          ? "No cohorts yet. Create one in the Cohorts tab; until then everything is school-wide."
          : "You haven't been assigned to a cohort yet. Ask an admin to add you."}
      </div>
    );
  }

  const visible = cohorts.filter((c) => c.cohort.status !== "archived" || c.cohort._id === cohortId);
  const totalStudents = cohorts.reduce((n, c) => n + c.activeStudentCount, 0);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:thin]">
      {canViewAll && (
        <Chip
          active={cohortId === undefined}
          onClick={() => setCohortId(undefined)}
          color="var(--text-muted)"
          code={<Layers size={13} />}
          name={isAdmin ? "Whole school" : "All my cohorts"}
          meta={`${totalStudents} student${totalStudents === 1 ? "" : "s"} · ${cohorts.length} cohort${cohorts.length === 1 ? "" : "s"}`}
        />
      )}
      {visible.map((c) => (
        <Chip
          key={c.cohort._id}
          active={cohortId === c.cohort._id}
          onClick={() => setCohortId(c.cohort._id as Id<"cohorts">)}
          color={c.cohort.color}
          code={c.cohort.code ?? c.cohort.name.slice(0, 2).toUpperCase()}
          name={c.cohort.name}
          meta={`${c.activeStudentCount} student${c.activeStudentCount === 1 ? "" : "s"} · ${COHORT_STATUS_LABEL[c.cohort.status]}`}
          live={c.cohort.status === "active"}
        />
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  color,
  code,
  name,
  meta,
  live,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  code: React.ReactNode;
  name: string;
  meta: string;
  live?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-xl text-left flex-shrink-0 transition-all"
      style={{
        background: active ? "var(--surface)" : "var(--surface-2)",
        border: `1px solid ${active ? color : "var(--border)"}`,
        boxShadow: active ? `0 0 0 3px ${color}22` : "none",
      }}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black tracking-wide text-white flex-shrink-0"
        style={{ background: color, opacity: active ? 1 : 0.85 }}
      >
        {code}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
            {name}
          </span>
          {live && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: "#10B981" }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "#10B981" }} />
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          <Users size={10} /> {meta}
        </span>
      </span>
    </button>
  );
}
