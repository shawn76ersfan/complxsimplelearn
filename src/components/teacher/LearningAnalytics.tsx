"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCohortScope } from "./CohortContext";
import {
  AlertTriangle,
  Bot,
  Clock,
  Globe,
  MapPin,
  MessageSquare,
  Send,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { weekLabel } from "@/lib/weeks";
import toast from "react-hot-toast";

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
  const lastSent = useQuery(api.surveys.lastSent, { cohortId, now: window.now });
  const survey = useQuery(api.surveys.latestSummary, { cohortId });
  const sendCheckIn = useMutation(api.surveys.sendCheckIn);
  const [sending, setSending] = useState(false);

  async function handleSendCheckIn() {
    if (sending) return;
    setSending(true);
    try {
      const result = await sendCheckIn({ cohortId });
      toast.success(
        result.sent === 1
          ? "Survey sent to 1 student"
          : `Survey sent to ${result.sent} students`,
      );
    } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not send the survey");
    } finally {
      setSending(false);
    }
  }

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
        <Stat label="On the roster" value={String(data.studentCount)} icon={Globe} color="#2563EB" />
        <Stat label="Program progress" value={pct(data.classProgressAvg)} icon={TrendingUp} color="#7C3AED" />
        <Stat label="Class test avg" value={pct(data.classTestAvg)} icon={Trophy} color="#F97316" />
        <Stat label="Attendance" value={pct(data.classAttendanceRate)} icon={Clock} color="#0EA5E9" />
      </div>

      <section>
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Progress through the program</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Share of published lessons completed, week by week. Click a student to open their full record.
        </p>
        {data.weekProgress.length === 0 ? (
          <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Publish learning tracks to start seeing week-by-week progress.
          </div>
        ) : (
          <div className="space-y-3">
            {data.weekProgress.map((week) => (
              <div key={week.trackId} className="card p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: week.color }}>
                      {weekLabel(week.week - 1)}
                    </p>
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{week.trackName}</p>
                  </div>
                  <p className="text-sm font-black flex-shrink-0" style={{ color: week.color }}>{week.avgPct}%</p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${week.avgPct}%`, background: week.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Each student</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Sorted so the furthest behind appear first.
        </p>
        {data.studentProgress.length === 0 ? (
          <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            No students on this roster yet.
          </div>
        ) : (
          <div className="space-y-2">
            {data.studentProgress.map((row) => (
              <Link
                key={row.studentId}
                href={`/teacher/students/${row.studentId}`}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:opacity-90"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{row.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {row.completedLessons}/{row.totalLessons} lessons
                  </p>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.progressPct}%`,
                        background: row.progressPct < 25 ? "#EF4444" : row.progressPct < 60 ? "#F97316" : "#10B981",
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="font-bold" style={{ color: "var(--text)" }}>{row.progressPct}%</span>
                  <span>Tests {pct(row.testAvg)}</span>
                  <span>HW {pct(row.homeworkAvg)}</span>
                  <span>Att {pct(row.attendanceRate)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Needs attention</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Low program progress, tests, overdue homework, or missed live class — intervene before they drop.
        </p>
        {data.atRisk.length === 0 ? (
          <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
            Nobody is flashing red right now. Keep watching progress, homework lag, and attendance.
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
                  <span>Program {pct(row.progressPct)}</span>
                  <span>Tests {pct(row.testAvg)}</span>
                  <span>HW {pct(row.homeworkAvg)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <MessageSquare size={18} /> Class survey
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Send every two weeks. Students get a notification and email with a link to fill out the survey. You get an email the moment someone submits.
        </p>
        <div className="card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {lastSent
                  ? lastSent.dueForNext
                    ? "Ready for the next check-in"
                    : `Last sent ${lastSent.daysAgo === 0 ? "today" : `${lastSent.daysAgo} day${lastSent.daysAgo === 1 ? "" : "s"} ago`}`
                  : "No check-in sent yet"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {lastSent ? `Sent ${formatDate(lastSent.sentAt)}` : "Aim for one every 14 days so you can adjust class."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSendCheckIn()}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              <Send size={14} /> {sending ? "Sending…" : "Send survey"}
            </button>
          </div>

          {survey && (
            <div className="pt-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                Latest round · {survey.responses}/{survey.roster} responses · support {survey.avgSupport ?? "—"}/5
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <PulseGroup
                  title="Pace"
                  rows={[
                    ["Too slow", survey.pace.too_slow],
                    ["Just right", survey.pace.just_right],
                    ["Too fast", survey.pace.too_fast],
                  ]}
                />
                <PulseGroup
                  title="Difficulty"
                  rows={[
                    ["Too easy", survey.difficulty.too_easy],
                    ["Okay", survey.difficulty.ok],
                    ["Too hard", survey.difficulty.too_hard],
                  ]}
                />
                <PulseGroup
                  title="How they feel"
                  rows={[
                    ["Struggling", survey.feeling.struggling],
                    ["Okay", survey.feeling.ok],
                    ["Thriving", survey.feeling.thriving],
                  ]}
                />
              </div>
              {survey.comments.length > 0 && (
                <div className="space-y-2">
                  {survey.comments.map((c) => (
                    <Link
                      key={`${c.studentId}-${c.comment.slice(0, 12)}`}
                      href={`/teacher/students/${c.studentId}`}
                      className="block text-sm p-3 rounded-xl hover:opacity-90"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span className="font-semibold" style={{ color: "var(--text)" }}>{c.name}</span>
                      <span className="text-xs ml-2 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{c.feeling}</span>
                      <p className="mt-1" style={{ color: "var(--text-muted)" }}>{c.comment}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>Hardest quiz items</h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Best-attempt miss rate. Re-teach these in class.
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

      <section className="card p-5 flex gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#7C3AED22" }}
        >
          <Bot size={18} style={{ color: "#7C3AED" }} />
        </div>
        <div>
          <h3 className="font-bold text-sm mb-1" style={{ color: "var(--text)" }}>Later: AI agents for staff</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Next up is a staff-only layer on this same progress data — an agent that flags students falling behind a week,
            drafts outreach from check-in comments, and suggests who is ready to become a paid instructor. Nothing autonomous
            yet; instructors stay in control of every message and promotion.
          </p>
        </div>
      </section>
    </div>
  );
}

function PulseGroup({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const total = rows.reduce((sum, [, n]) => sum + n, 0);
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
      <p className="font-semibold mb-2" style={{ color: "var(--text)" }}>{title}</p>
      {rows.map(([label, n]) => (
        <div key={label} className="flex justify-between gap-2">
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <span style={{ color: "var(--text)" }}>{total ? `${n}` : "—"}</span>
        </div>
      ))}
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
