"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MyCohortCard } from "@/components/cohort/MyCohortCard";
import { formatCohortDate } from "@/components/teacher/CohortContext";
import { getInitials, timeAgo } from "@/lib/utils";
import { CalendarDays, GraduationCap, Megaphone, Pin, Users, ArrowRight } from "lucide-react";

function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayParts(yyyyMmDd: string): { dow: string; day: string; mon: string } {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1, 12);
  return {
    dow: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
    day: String(d ?? ""),
    mon: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
  };
}

/**
 * Student "My class" page: the cohort header, who's teaching, the run of
 * announcements, and the next few dates. Everything is scoped server-side to
 * the cohorts the viewer belongs to.
 */
export default function CohortPage() {
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
  const instructors = useQuery(api.users.myInstructors);
  const announcements = useQuery(api.announcements.list, { limit: 30 });
  const upcoming = useQuery(api.calendar.upcoming, { today, limit: 6 });

  const membership = mine?.find((m) => m.roleInCohort === "student") ?? mine?.[0];

  if (mine !== undefined && !membership) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
          <GraduationCap size={26} style={{ color: "var(--text-muted)" }} />
        </div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text)" }}>You&apos;re not in a cohort yet</h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Once your instructor adds you to a class you&apos;ll see your schedule, classmates, and announcements here.
          Your lessons and homework still work in the meantime.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          Back to dashboard <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const color = membership?.cohort.color ?? "var(--primary)";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--text-muted)" }}>My class</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>
          {membership ? membership.cohort.name : "Loading…"}
        </h1>
        {membership?.cohort.description && (
          <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>{membership.cohort.description}</p>
        )}
      </div>

      <div className="mb-8">
        <MyCohortCard compact />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Announcements feed */}
        <section id="announcements">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} style={{ color }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Announcements</h2>
          </div>

          {announcements === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Nothing posted yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Your instructors&apos; announcements will show up here and in your notification bell.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <article
                  key={a._id}
                  className="card p-5"
                  style={a.pinned ? { borderColor: `${a.cohortColor ?? color}66` } : undefined}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                      {a.author.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.author.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(a.author.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{a.author.name}</span>
                        <span>·</span>
                        <span>{timeAgo(a.createdAt, now)}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: `${a.cohortColor ?? "#6B7280"}20`, color: a.cohortColor ?? "var(--text-muted)" }}
                        >
                          {a.cohortName ?? "Whole school"}
                        </span>
                        {a.pinned && (
                          <span className="inline-flex items-center gap-1 font-semibold" style={{ color: a.cohortColor ?? color }}>
                            <Pin size={11} /> Pinned
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold mt-1" style={{ color: "var(--text)" }}>{a.title}</h3>
                      <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{a.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar: instructors + coming up */}
        <aside className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Your instructors</h2>
            </div>
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {instructors === undefined ? (
                <div className="p-4 h-16 animate-pulse" />
              ) : instructors.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>To be announced.</p>
              ) : (
                instructors.map((t) => (
                  <div key={t._id} className="p-3.5 flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
                    >
                      {t.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(t.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{t.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {t.role === "admin" ? "Lead instructor" : "Instructor"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/feedback" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold" style={{ color }}>
              Messages from your instructors <ArrowRight size={12} />
            </Link>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} style={{ color }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Coming up</h2>
            </div>
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {upcoming === undefined ? (
                <div className="p-4 h-16 animate-pulse" />
              ) : upcoming.length === 0 ? (
                <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>No dates on the calendar yet.</p>
              ) : (
                upcoming.map((e) => {
                  const p = dayParts(e.date);
                  const isToday = e.date === today;
                  return (
                    <div key={e._id} className="p-3.5 flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
                      <div
                        className="w-11 rounded-lg flex flex-col items-center justify-center py-1 flex-shrink-0"
                        style={{ background: `${e.color ?? color}18`, color: e.color ?? color }}
                      >
                        <span className="text-[10px] font-bold uppercase leading-none">{p.mon}</span>
                        <span className="text-lg font-black leading-tight">{p.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{e.title}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                          {isToday ? "Today" : p.dow}
                          {e.cohortName ? ` · ${e.cohortName}` : " · Whole school"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {membership && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatCohortDate(membership.cohort.startDate)}
              {membership.cohort.endDate ? ` → ${formatCohortDate(membership.cohort.endDate)}` : ""}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
