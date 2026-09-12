"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { MyCohortCard } from "@/components/cohort/MyCohortCard";
import { formatCohortDate } from "@/components/teacher/CohortContext";
import { getInitials, timeAgo } from "@/lib/utils";
import { BookOpen, CalendarDays, GraduationCap, Megaphone, Pin, Users, ArrowRight, MessageSquare } from "lucide-react";

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
        <div
          className="w-16 h-20 mx-auto mb-5 rounded-r-md flex items-center justify-center text-white"
          style={{
            background: "linear-gradient(90deg, rgba(0,0,0,0.25), transparent 40%), #2563EB",
            boxShadow: "4px 6px 0 #1d4ed822",
          }}
        >
          <BookOpen size={26} />
        </div>
        <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
          Your seat isn&apos;t assigned yet
        </h1>
        <p className="text-sm max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
          Once your instructor adds you to a class you&apos;ll see the roll book, schedule, and announcements here.
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <GraduationCap size={13} /> The classroom
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight" style={{ color: "var(--text)" }}>
          {membership ? membership.cohort.name : "Loading…"}
        </h1>
        {membership?.cohort.description && (
          <p className="text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {membership.cohort.description}
          </p>
        )}
      </div>

      <div className="mb-8">
        <MyCohortCard compact />
        <Link
          href="/board"
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: color }}
        >
          <MessageSquare size={14} /> Open the Board
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section id="announcements">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} style={{ color }} />
            <h2 className="font-serif text-xl font-bold" style={{ color: "var(--text)" }}>From the desk</h2>
          </div>

          {announcements === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="notebook-sheet card p-8 text-center">
              <p className="font-serif font-bold" style={{ color: "var(--text)" }}>Blank page</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Your instructors&apos; notes will show up here and in your notification bell.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <article
                  key={a._id}
                  className="notebook-sheet card p-5"
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
                      <h3 className="font-serif font-bold text-lg mt-1" style={{ color: "var(--text)" }}>{a.title}</h3>
                      <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>{a.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} style={{ color }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>At the front of the room</h2>
            </div>
            <div className="cork-board rounded-2xl p-3 space-y-2">
              {instructors === undefined ? (
                <div className="h-16 animate-pulse rounded-xl bg-black/10" />
              ) : instructors.length === 0 ? (
                <p className="p-3 text-sm bg-white/90 dark:bg-black/40 rounded-xl" style={{ color: "var(--text-muted)" }}>To be announced.</p>
              ) : (
                instructors.map((t) => (
                  <div key={t._id} className="p-3 flex items-center gap-3 rounded-xl bg-white/92 dark:bg-black/45 shadow-sm">
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
              Notes from your instructors <ArrowRight size={12} />
            </Link>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} style={{ color }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>On the calendar</h2>
            </div>
            <div className="card divide-y overflow-hidden" style={{ borderColor: "var(--border)" }}>
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
            <p className="text-xs font-serif italic" style={{ color: "var(--text-muted)" }}>
              Term: {formatCohortDate(membership.cohort.startDate)}
              {membership.cohort.endDate ? ` → ${formatCohortDate(membership.cohort.endDate)}` : ""}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
