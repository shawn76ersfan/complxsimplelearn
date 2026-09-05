"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { useCohortScope } from "./CohortContext";

/**
 * Select used in create forms (assignment, video, event, invite). Defaults to
 * the header switcher's cohort. "Whole school" is only offered to admins;
 * teachers must target one of their cohorts.
 */
export function CohortPicker({
  value,
  onChange,
  label = "Cohort",
  allowSchoolWide = true,
  schoolWideLabel = "Whole school (every cohort)",
  required,
  className,
}: {
  value: Id<"cohorts"> | undefined;
  onChange: (id: Id<"cohorts"> | undefined) => void;
  label?: string;
  allowSchoolWide?: boolean;
  schoolWideLabel?: string;
  required?: boolean;
  className?: string;
}) {
  const { cohorts, isAdmin } = useCohortScope();
  const options = (cohorts ?? []).filter((c) => c.cohort.status !== "archived");
  const canSchoolWide = isAdmin && allowSchoolWide;

  // Nothing to pick from: admins with no cohorts post school-wide implicitly.
  if (cohorts && options.length === 0) {
    return canSchoolWide ? null : (
      <p className="text-xs" style={{ color: "#EF4444" }}>
        You need to be assigned to a cohort before you can post.
      </p>
    );
  }

  const selected = options.find((c) => c.cohort._id === value);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
          {label}
          {required && !canSchoolWide ? " *" : ""}
        </label>
      )}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
          style={{ background: selected?.cohort.color ?? "var(--text-muted)" }}
        />
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? (e.target.value as Id<"cohorts">) : undefined)}
          required={required && !canSchoolWide}
          className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm outline-none appearance-none"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {canSchoolWide ? (
            <option value="">{schoolWideLabel}</option>
          ) : (
            !value && <option value="">Choose a cohort…</option>
          )}
          {options.map((c) => (
            <option key={c.cohort._id} value={c.cohort._id}>
              {c.cohort.code ? `${c.cohort.code} · ` : ""}
              {c.cohort.name} ({c.activeStudentCount} student{c.activeStudentCount === 1 ? "" : "s"})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
