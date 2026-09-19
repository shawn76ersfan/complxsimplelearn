"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCohortScope } from "./CohortContext";
import {
  AlertTriangle,
  Clock,
  Globe,
  MapPin,
  MessageSquare,
  Sparkles,
  Trophy,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value}%`;
}

export function LearningAnalytics() {
  const { cohortId } = useCohortScope();
  const window = useMemo(() => {
    const now = Date.now();
    return { now, since: now - 14 * 24 * 60 * 60 * 1000 };
  }, []);
  const data = useQuery(api.analytics.getLearningAnalytics, {
    cohortId,
    now: window.now,
    since: window.since,
  });

  if (data === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Instructor access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Students" value={String(data.studentCount)} icon={Globe} color="#2563EB" />
        <Stat label="Class test avg" value={pct(data.classTestAvg)} icon={Trophy} color="#F97316" />
        <Stat label="Attendance" value={pct(data.classAttendanceRate)} icon={Clock} color="#0EA5E9" />
        <Stat label="Used Stark (14d)" value={String(data.starkUsers)} icon={Sparkles} color="#7C3AED" />
      </div>

      <section>
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Needs attention</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Low tests, overdue homework, or missed live class — intervene before they drop.
        </p>
        {data.atRisk.length === 0 ? (
          <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Nobody is flashing red right now. Keep watching homework lag and attendance.
          </div>
        ) : (
          <div className="space-y-3">
            {data.atRisk.map((row) => (
              <Link
                key={row.studentId}
                href={`/teacher/students/${row.studentId}`}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:opacity-90"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertTriangle size={16} style={{ color: "#F97316" }} />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{row.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {row.reasons.join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Tests {pct(row.testAvg)}</span>
                  <span>HW {pct(row.homeworkAvg)}</span>
                  <span>Stark {row.starkChats}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Hardest quiz items</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Best-attempt miss rate. Re-teach these in class or via Stark.
          </p>
          {data.hardQuestions.length === 0 ? (
            <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
              Not enough quiz attempts yet for item analysis.
            </div>
          ) : (
            <div className="space-y-3">
              {data.hardQuestions.map((q) => (
                <div key={`${q.lessonId}-${q.question}`} className="card p-4">
                  <div className="flex justify-between gap-3 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      {q.lessonTitle}
                    </p>
                    <p className="text-sm font-bold" style={{ color: q.missRate >= 60 ? "#EF4444" : "#F97316" }}>
                      {q.missRate}% miss
                    </p>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{q.question}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{q.attempts} students</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Homework lag</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Past-due assignments still missing from the roster.
          </p>
          {data.homeworkLag.length === 0 ? (
            <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
              No overdue holes right now.
            </div>
          ) : (
            <div className="space-y-3">
              {data.homeworkLag.map((row) => (
                <div key={row.assignmentId} className="card p-4 flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{row.title}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Due {formatDate(row.dueDate)}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "#EF4444" }}>
                    {row.missing}/{row.roster}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <MessageSquare size={18} /> What Stark helped with
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Topics only — full chats stay private to the student. Last 14 days.
        </p>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {data.starkTopics.length === 0 ? (
              <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
                No Stark chats in this window yet.
              </div>
            ) : (
              data.starkTopics.map((t) => (
                <div key={`${t.kind}-${t.topic}`} className="card p-3 flex justify-between gap-3">
                  <div>
                    <p className="text-sm" style={{ color: "var(--text)" }}>{t.topic}</p>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{t.kind}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{t.count}</p>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2">
            {data.starkByStudent.map((s) => (
              <Link
                key={s.studentId}
                href={`/teacher/students/${s.studentId}`}
                className="card p-3 flex justify-between gap-3 hover:opacity-90"
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.name}</p>
                  <p className="text-xs truncate max-w-[240px]" style={{ color: "var(--text-muted)" }}>
                    {s.lastTopic ?? "General help"}
                  </p>
                </div>
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{s.chats} chats</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {data.coachScores.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Coach Mode scores</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Latest resume rubric score. Open a student to follow up in class.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.coachScores.map((row) => (
              <Link
                key={row.studentId}
                href={`/teacher/students/${row.studentId}`}
                className="card p-4 flex justify-between gap-3 hover:opacity-90"
              >
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{row.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {row.careerTrack} · {row.readinessLabel}
                  </p>
                </div>
                <p className="text-xl font-black" style={{ color: "var(--primary)" }}>{row.overallScore}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <MapPin size={18} /> Nationwide classroom
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Where students join from and which clocks they live on. Class times should be posted in the cohort timezone.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-4 space-y-2">
            {data.states.map((s) => (
              <div key={s.state} className="flex justify-between text-sm">
                <span style={{ color: "var(--text)" }}>{s.state}</span>
                <span style={{ color: "var(--text-muted)" }}>{s.count}</span>
              </div>
            ))}
            {data.states.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No roster yet.</p>
            )}
          </div>
          <div className="card p-4 space-y-2">
            {data.timezones.map((t) => (
              <div key={t.timezone} className="flex justify-between text-sm">
                <span style={{ color: "var(--text)" }}>{t.label}</span>
                <span style={{ color: "var(--text-muted)" }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-black" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
      </div>
    </div>
  );
}
