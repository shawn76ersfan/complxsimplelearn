"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useCohortScope } from "./CohortContext";
import { getInitials } from "@/lib/utils";
import toast from "react-hot-toast";
import { Check, ClipboardCheck, Clock } from "lucide-react";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prettyDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(y, (m ?? 1) - 1, d ?? 1, 12));
}

/**
 * The roll sheet. Staff pick a class date, then go down the roster and tick
 * who was there. Unticked = absent. A small "late" toggle is there for the
 * stragglers. Students never see or touch this.
 */
export function AttendanceRoster() {
  const { cohortId, selected } = useCohortScope();
  const [date, setDate] = useState(todayISO);
  const roster = useQuery(api.attendance.rosterForDate, cohortId ? { cohortId, date } : "skip");
  const history = useQuery(api.attendance.markedDates, cohortId ? { cohortId } : "skip");
  const mark = useMutation(api.attendance.mark);
  const clear = useMutation(api.attendance.clear);

  const counts = useMemo(() => {
    if (!roster) return null;
    let here = 0;
    let late = 0;
    for (const row of roster) {
      if (row.status === "present") here += 1;
      if (row.status === "late") late += 1;
    }
    return { here: here + late, late, total: roster.length };
  }, [roster]);

  if (!cohortId) {
    return (
      <div className="card p-8 text-center">
        <ClipboardCheck className="mx-auto mb-3 opacity-40" />
        <p className="font-semibold" style={{ color: "var(--text)" }}>Pick a cohort</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Each class has its own roll sheet. Choose a cohort in the switcher first.
        </p>
      </div>
    );
  }

  async function setHere(studentId: Id<"users">, here: boolean) {
    try {
      if (here) {
        await mark({ cohortId: cohortId!, studentId, date, status: "present" });
      } else {
        await clear({ cohortId: cohortId!, studentId, date });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the roll");
    }
  }

  async function toggleLate(studentId: Id<"users">, currentlyLate: boolean) {
    try {
      await mark({ cohortId: cohortId!, studentId, date, status: currentlyLate ? "present" : "late" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the roll");
    }
  }

  async function markAllHere() {
    if (!roster) return;
    try {
      await Promise.all(
        roster
          .filter((r) => r.status !== "present" && r.status !== "late")
          .map((r) => mark({ cohortId: cohortId!, studentId: r.studentId, date, status: "present" })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the roll");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px] items-start">
      <div className="index-card p-0 overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-end justify-between gap-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>Roll sheet</p>
            <h3 className="font-serif text-xl font-bold" style={{ color: "var(--text)" }}>
              {selected?.cohort.name ?? "Class"} · {prettyDate(date)}
            </h3>
            {counts && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {counts.here} of {counts.total} here{counts.late ? ` (${counts.late} late)` : ""}
              </p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Class date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>
            <button type="button" onClick={markAllHere} className="btn-paper text-xs h-[38px]">
              Everyone&apos;s here
            </button>
          </div>
        </div>

        {roster === undefined ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--surface-2)" }} />)}
          </div>
        ) : roster.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No students on this roster yet.
          </p>
        ) : (
          <ol className="divide-y" style={{ borderColor: "var(--border)" }}>
            {roster.map((row, idx) => {
              const here = row.status === "present" || row.status === "late";
              const late = row.status === "late";
              return (
                <li key={row.studentId} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
                  <span className="w-6 text-xs font-serif text-right" style={{ color: "var(--text-muted)" }}>{idx + 1}.</span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={here}
                    aria-label={`${row.name} ${here ? "present" : "absent"}`}
                    onClick={() => void setHere(row.studentId, !here)}
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      background: here ? "var(--ink)" : "var(--surface)",
                      border: "2px solid var(--ink)",
                      color: "var(--paper)",
                    }}
                  >
                    {here && <Check size={16} strokeWidth={3} />}
                  </button>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white overflow-hidden flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                  >
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(row.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: here ? "var(--text)" : "var(--text-muted)" }}
                    >
                      {row.name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{row.state ?? "—"}</p>
                  </div>
                  {here && (
                    <button
                      type="button"
                      onClick={() => void toggleLate(row.studentId, late)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold"
                      style={{
                        background: late ? "#F59E0B" : "var(--surface-2)",
                        color: late ? "#fff" : "var(--text-muted)",
                      }}
                      title={late ? "Marked late — click to clear" : "Mark late"}
                    >
                      <Clock size={11} /> Late
                    </button>
                  )}
                  {!here && (
                    <span className="text-[11px] font-bold" style={{ color: "#EF4444" }}>Absent</span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <aside className="card p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: "var(--text-muted)" }}>Past classes</p>
        {history === undefined ? (
          <div className="h-16 animate-pulse rounded-lg" style={{ background: "var(--surface-2)" }} />
        ) : history.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing marked yet. Pick today and start ticking.</p>
        ) : (
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.date}>
                <button
                  type="button"
                  onClick={() => setDate(h.date)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm hover:opacity-80"
                  style={{
                    background: h.date === date ? "var(--surface-2)" : "transparent",
                    color: "var(--text)",
                  }}
                >
                  <span>{prettyDate(h.date)}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{h.present}/{h.total}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
