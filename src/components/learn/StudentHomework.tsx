"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CheckCircle, Clock, AlertTriangle, X, BookOpen, ArrowRight, FileText, Star } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES = {
  complete:    { bg: "#0EA5E920", color: "#0EA5E9", label: "Complete ✓", icon: CheckCircle },
  graded:      { bg: "#0EA5E920", color: "#0EA5E9", label: "Graded",     icon: Star },
  submitted:   { bg: "#8B5CF620", color: "#8B5CF6", label: "Submitted",  icon: FileText },
  late:        { bg: "#EF444420", color: "#EF4444", label: "Late",        icon: AlertTriangle },
  pending:     { bg: "#2563EB20", color: "#2563EB", label: "Pending",     icon: Clock },
  empty:       { bg: "#F9731620", color: "#F97316", label: "Empty",       icon: X },
  "no-track":  { bg: "var(--surface-2)", color: "var(--text-muted)", label: "General", icon: BookOpen },
} as const;

type AssignmentStatus = keyof typeof STATUS_STYLES;

export function StudentHomework() {
  const assignments = useQuery(api.assignments.getMyStatus);

  if (!assignments) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse flex-shrink-0" style={{ width: "260px", height: "140px", background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="card p-8 text-center">
        <BookOpen size={28} className="mx-auto mb-2 opacity-25" />
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>No assignments yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Cassandra will post assignments here.</p>
      </div>
    );
  }

  // Sorted most recent first (by _creationTime)
  const sorted = [...assignments].sort((a, b) => (b as { _creationTime: number })._creationTime - (a as { _creationTime: number })._creationTime);

  return (
    <div>
      {/* Slider */}
      <div
        className="flex gap-4 pb-3"
        style={{ overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {sorted.map((a) => {
          const s = STATUS_STYLES[a.status as AssignmentStatus] ?? STATUS_STYLES.pending;
          const Icon = s.icon;
          const now = Date.now();
          const isPast = now > a.dueDate;
          const daysLeft = Math.ceil((a.dueDate - now) / (1000 * 60 * 60 * 24));
          const track = (a as { track?: { name: string; slug: string } }).track;

          return (
            <div
              key={a._id}
              className="card p-5 flex-shrink-0 flex flex-col justify-between"
              style={{
                width: "260px",
                scrollSnapAlign: "start",
                borderColor: a.status === "late" || a.status === "empty"
                  ? "#EF444433"
                  : a.status === "complete" || a.status === "graded" ? "#0EA5E933" : "var(--border)",
              }}
            >
              <div>
                {/* Status pill */}
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                  style={{ background: s.bg, color: s.color }}
                >
                  <Icon size={10} /> {s.label}
                </span>
                <p className="font-bold text-sm leading-snug mb-1" style={{ color: "var(--text)" }}>{a.title}</p>
              </div>

              <div className="space-y-1 mt-2">
                {/* Assigned on */}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Assigned: <span style={{ color: "var(--text)" }}>{formatDate((a as { _creationTime: number })._creationTime)}</span>
                </p>
                {/* Due date */}
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Due:{" "}
                  <span style={{ color: isPast && a.status !== "complete" && a.status !== "graded" ? "#EF4444" : "var(--text)" }}>
                    {formatDate(a.dueDate)}
                  </span>
                </p>
                {/* Countdown */}
                {!isPast && a.status !== "complete" && a.status !== "graded" && daysLeft <= 7 && (
                  <p className="text-xs font-semibold" style={{ color: daysLeft <= 2 ? "#EF4444" : "#F59E0B" }}>
                    {daysLeft <= 0 ? "Due today!" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                  </p>
                )}
                {/* Track link */}
                {track && (
                  <Link
                    href={`/learn/${track.slug}`}
                    className="text-xs font-medium hover:opacity-70 transition-opacity block mt-1"
                    style={{ color: "#2563EB" }}
                  >
                    → {track.name}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* See All */}
      <div className="flex justify-end mt-2">
        <Link
          href="/homework"
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: "#2563EB" }}
        >
          See all assignments <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
