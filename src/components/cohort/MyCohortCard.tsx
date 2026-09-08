"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Megaphone, Users, Video } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cohortWeek, formatCohortDate } from "@/components/teacher/CohortContext";
import { getInitials, timeAgo } from "@/lib/utils";

function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Weekday + short date for a YYYY-MM-DD, e.g. "Thu, Sep 10". */
function shortDay(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(y, m - 1, d, 12));
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T12:00:00`).getTime();
  const b = new Date(`${toISO}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function InstructorStack({
  instructors,
  size = 32,
}: {
  instructors: { _id: string; name: string; imageUrl?: string }[];
  size?: number;
}) {
  if (instructors.length === 0) return null;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {instructors.slice(0, 4).map((t) => (
          <div
            key={t._id}
            title={t.name}
            className="rounded-full flex items-center justify-center font-bold text-white overflow-hidden"
            style={{
              width: size,
              height: size,
              fontSize: size * 0.36,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              // ring matches the card so overlapping avatars read as a stack
              boxShadow: "0 0 0 2px var(--surface)",
            }}
          >
            {t.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(t.name)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The student's "class" card. Reads like a real cohort — the code badge, where
 * you are in the term, who teaches it, when class meets, and what's coming up —
 * instead of a generic stats tile. Renders nothing for users not in a cohort.
 */
export function MyCohortCard({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const [today, setToday] = useState(() => todayISO());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setToday(todayISO());
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const mine = useQuery(api.cohorts.mine, { today });
  if (mine === undefined) {
    return <div className={`card h-44 animate-pulse ${className}`} style={{ background: "var(--surface-2)" }} />;
  }
  const membership = mine.find((m) => m.roleInCohort === "student") ?? mine[0];
  if (!membership) return null;

  const { cohort, instructors, classSize, nextEvent, latestAnnouncement } = membership;
  const term = cohortWeek(cohort.startDate, cohort.endDate, new Date(`${today}T12:00:00`));
  const color = cohort.color;

  let phase: { label: string; sub: string };
  if (cohort.status === "upcoming" || term.daysUntilStart > 0) {
    phase = {
      label: term.daysUntilStart === 1 ? "Starts tomorrow" : `Starts in ${term.daysUntilStart} days`,
      sub: `First class ${formatCohortDate(cohort.startDate)}`,
    };
  } else if (cohort.status === "completed" || (cohort.endDate && today > cohort.endDate)) {
    phase = { label: "Cohort complete", sub: cohort.endDate ? `Wrapped ${formatCohortDate(cohort.endDate)}` : "Nice work" };
  } else {
    phase = {
      label: term.totalWeeks ? `Week ${term.week} of ${term.totalWeeks}` : `Week ${term.week}`,
      sub: cohort.endDate ? `Ends ${formatCohortDate(cohort.endDate)}` : `Started ${formatCohortDate(cohort.startDate)}`,
    };
  }

  const nextIn = nextEvent ? daysBetween(today, nextEvent.date) : null;
  const nextWhen =
    nextIn === null ? null : nextIn === 0 ? "Today" : nextIn === 1 ? "Tomorrow" : `In ${nextIn} days`;

  return (
    <div
      className={`book-cover ${className}`}
      style={{ ["--book-color" as string]: color }}
    >
      <div className="relative flex-1 p-5 sm:p-6 min-w-0">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-12 h-14 rounded-r-md flex items-center justify-center font-black text-white text-sm tracking-wide flex-shrink-0"
              style={{
                background: `linear-gradient(90deg, rgba(0,0,0,0.25), transparent 42%), ${color}`,
                boxShadow: `3px 4px 0 ${color}33`,
              }}
            >
              {cohort.code ?? getInitials(cohort.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                Your roll book
              </p>
              <h2 className="font-serif text-xl sm:text-2xl font-bold leading-tight truncate" style={{ color: "var(--text)" }}>
                {cohort.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {cohort.schedule && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {cohort.schedule}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users size={12} /> {classSize} classmate{classSize === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {cohort.meetingUrl && (
              <a
                href={cohort.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: color }}
              >
                <Video size={14} /> Join class
              </a>
            )}
            {!compact && (
              <>
                <Link
                  href="/board"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: color }}
                >
                  Open Board <ArrowRight size={14} />
                </Link>
                <Link
                  href="/cohort"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  Class page <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Term progress */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{phase.label}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{phase.sub}</p>
          </div>
          {term.totalWeeks ? (
            <div className="flex gap-1">
              {Array.from({ length: term.totalWeeks }, (_, i) => {
                const n = i + 1;
                const done = n < term.week || cohort.status === "completed";
                const current = n === term.week && cohort.status !== "completed" && term.daysUntilStart <= 0;
                return (
                  <div
                    key={n}
                    title={`Week ${n}`}
                    className="h-2 flex-1 rounded-full transition-all"
                    style={{
                      background: done ? color : current ? `${color}` : "var(--surface-2)",
                      opacity: current ? 0.55 : 1,
                      outline: current ? `2px solid ${color}` : "none",
                      outlineOffset: 1,
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-2 rounded-full" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full" style={{ width: "100%", background: `${color}55` }} />
            </div>
          )}
        </div>

        {/* Bottom strip: instructors · next up · latest post */}
        <div className={`mt-5 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--surface-2)" }}>
            <InstructorStack instructors={instructors} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {instructors.length === 1 ? "Instructor" : "Instructors"}
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                {instructors.length === 0
                  ? "To be announced"
                  : instructors.length <= 2
                    ? instructors.map((t) => t.name).join(" & ")
                    : `${instructors[0].name} +${instructors.length - 1}`}
              </p>
            </div>
          </div>

          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--surface-2)" }}>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${nextEvent?.color ?? color}20`, color: nextEvent?.color ?? color }}
            >
              <CalendarDays size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {nextEvent ? `Next up · ${nextWhen}` : "Next up"}
              </p>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                {nextEvent ? `${nextEvent.title} · ${shortDay(nextEvent.date)}` : "Nothing scheduled yet"}
              </p>
            </div>
          </div>

          {!compact && (
            <Link
              href="/cohort#announcements"
              className="rounded-xl p-3 flex items-center gap-3 transition-opacity hover:opacity-80"
              style={{ background: "var(--surface-2)" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
                <Megaphone size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {latestAnnouncement ? `${latestAnnouncement.authorName.split(" ")[0]} · ${timeAgo(latestAnnouncement.createdAt, now)}` : "Announcements"}
                </p>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                  {latestAnnouncement ? latestAnnouncement.title : "No posts yet"}
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
