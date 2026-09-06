"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Cpu, Brain, Shield, Terminal, ArrowRight, BookOpen, Trophy, Flame, Star, Quote, AlertTriangle, Calendar, Cloud, Container, Boxes, GitBranch, Layers, Wrench, Workflow, Gauge, Play } from "lucide-react";
import { StudentHomework } from "@/components/learn/StudentHomework";
import { FeedbackPreviewCard } from "@/components/learn/FeedbackPreviewCard";
import { MyCohortCard } from "@/components/cohort/MyCohortCard";
import { useInstructorName } from "@/components/cohort/useInstructorName";

const TRACK_ICONS: Record<string, React.ElementType> = {
  hardware: Cpu,
  ai: Brain,
  cybersecurity: Shield,
  linux: Terminal,
  aws: Cloud,
  azure: Cloud,
  "version-control": GitBranch,
  docker: Container,
  kubernetes: Boxes,
  terraform: Layers,
  ansible: Wrench,
  cicd: Workflow,
  monitoring: Gauge,
};

function ProgressRing({ percentage, color, size = 88 }: { percentage: number; color: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percentage)) / 100) * c;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{percentage}%</span>
      </div>
    </div>
  );
}

function ContinueLearningCard() {
  const next = useQuery(api.attempts.getContinueLearning);

  if (next === undefined) {
    return <div className="card p-8 mb-6 animate-pulse h-40" style={{ background: "var(--surface-2)" }} />;
  }

  if (next === null || next.allComplete) {
    return (
      <div className="index-card p-6 sm:p-8 pt-0 mb-6 relative overflow-hidden">
        <Bookmark color="var(--primary)" />
        <div className="index-card-title">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Bookmark · Where you left off</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-2">
          <ProgressRing percentage={next?.percentage ?? 100} color="var(--primary)" size={96} />
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
              {next?.allComplete ? "Every chapter read" : "Open your first chapter"}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {next?.allComplete
                ? "Nice work — browse the shelf anytime to review material."
                : "Pick a textbook and begin building job-ready skills."}
            </p>
            <Link href="/learn" className="btn-ink btn-sm">
              Browse the shelf <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="index-card p-6 sm:p-8 pt-0 mb-6 relative overflow-hidden">
      <Bookmark color={next.trackColor} />
      <div className="index-card-title">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: next.trackColor }}>
          Bookmark · {next.trackName}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-2">
        <ProgressRing percentage={next.percentage} color={next.trackColor} size={96} />
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-2 truncate" style={{ color: "var(--text)" }}>
            {next.lessonTitle}
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {next.completed} of {next.total} lessons complete
          </p>
          <Link href={`/learn/${next.trackSlug}/${next.lessonId}`} className="btn-ink btn-sm">
            <Play size={15} fill="currentColor" /> Pick up where you left off
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Ribbon bookmark hanging off the top-right corner of a card. */
function Bookmark({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="absolute top-0 right-6 sm:right-8 w-7 h-14"
      style={{
        background: color,
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
        boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
      }}
    />
  );
}

function TrackCard({ track }: { track: { _id: string; name: string; slug: string; description: string; color: string; icon: string } }) {
  const progress = useQuery(api.attempts.getTrackProgress, { trackId: track._id as never });
  const Icon = TRACK_ICONS[track.slug] ?? BookOpen;
  const pct = progress?.percentage ?? 0;

  return (
    <Link
      href={`/learn/${track.slug}`}
      className="book-cover hover:-translate-y-1 transition-transform group cursor-pointer"
      style={{ ["--book-color" as string]: track.color }}
    >
      <div className="relative z-10 p-5 flex flex-col gap-4 flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: `${track.color}18`, border: `1px solid ${track.color}44` }}>
            <Icon size={20} style={{ color: track.color }} />
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded font-serif" style={{ background: `${track.color}14`, color: track.color }}>{pct}%</span>
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg leading-tight mb-1" style={{ color: "var(--text)" }}>{track.name}</h3>
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>{track.description}</p>
        </div>
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>{progress?.completed ?? 0}/{progress?.total ?? 0} chapters</span>
            <span>{pct}% read</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--surface-2)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: track.color }} />
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all" style={{ color: track.color }}>
          Open book <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
}

function DenseLevel({
  level,
  completedCount,
  totalCount,
}: {
  level: number;
  completedCount: number;
  totalCount: number;
}) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <div className="card p-3.5 h-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold font-serif" style={{ background: "var(--ink)", color: "var(--paper)" }}>
            {level}
          </span>
          <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>Level {level}</span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{completedCount}/{totalCount}</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: "5px", background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
    </div>
  );
}

function QuoteCard() {
  const quote = useQuery(api.quotes.getCurrent);
  if (!quote) return null;
  return (
    <div className="sticky-note p-6 pt-7 relative" style={{ ["--tilt" as string]: "-0.8deg" }}>
      <span className="push-pin" style={{ ["--pin" as string]: "#2563EB" }} />
      <Quote size={40} className="absolute top-3 left-3 opacity-15" />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-2">Quote of the week</p>
        <p className="font-serif text-lg leading-relaxed italic font-medium">
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.author && (
          <p className="text-xs mt-3 font-bold opacity-80">— {quote.author}</p>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useUser();
  const tracks = useQuery(api.tracks.list);
  const myAttempts = useQuery(api.attempts.getMyAttempts);
  const profile = useQuery(api.users.getMyProfile);
  const progress = useQuery(api.assignments.getMyProgress);
  const activeWarnings = useQuery(api.feedback.getActiveWarnings);
  const acknowledgeWarning = useMutation(api.feedback.acknowledgeWarning);
  const instructor = useInstructorName();

  const totalScore = myAttempts?.reduce((s, a) => s + a.score, 0) ?? 0;
  const totalMax   = myAttempts?.reduce((s, a) => s + a.maxScore, 0) ?? 0;
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const level = progress?.level ?? 0;
  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="eyebrow mb-3">Your desk</p>
        <h1 className="font-serif text-4xl font-bold tracking-tight mb-1" style={{ color: "var(--text)" }}>
          Hey, {user?.firstName ?? "Student"}.
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ready to learn something new today?</p>
      </div>

      {activeWarnings && activeWarnings.length > 0 && (
        <div className="space-y-3 mb-6">
          {activeWarnings.map((w) => (
            <div
              key={w._id}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warning-text)" }} />
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--warning-text)" }}>
                    Warning from {w.authorName ?? instructor.short}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{w.message}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pl-7">
                <a
                  href="https://calendly.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ border: "1px solid var(--primary)", color: "var(--primary)", borderRadius: "8px", background: "transparent" }}
                >
                  <Calendar size={13} /> Schedule a meeting with {w.authorName ?? instructor.short}
                </a>
                <button
                  onClick={() => acknowledgeWarning({ feedbackId: w._id })}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ border: "1px solid var(--warning-text)", color: "var(--warning-text)", borderRadius: "8px", background: "transparent" }}
                >
                  <AlertTriangle size={13} /> I acknowledge this warning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <MyCohortCard className="mb-6" />

      <div className="mb-6">
        <QuoteCard />
      </div>

      <ContinueLearningCard />

      {/* Secondary dense row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <div className="col-span-2 sm:col-span-1">
          <DenseLevel level={level} completedCount={completedCount} totalCount={totalCount} />
        </div>
        {[
          { label: "Score", value: `${overallPct}%`, icon: Trophy, color: "var(--primary)" },
          { label: "Lessons", value: myAttempts?.length ?? 0, icon: BookOpen, color: "var(--secondary)" },
          { label: "Homework", value: completedCount, icon: Star, color: "var(--accent)" },
          { label: "Streak", value: streak, icon: Flame, color: "var(--accent)" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-2.5 p-3.5">
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg" style={{ background: "var(--surface-2)" }}>
              <stat.icon size={14} style={{ color: stat.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold leading-none" style={{ color: "var(--text)" }}>{stat.value}</p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <FeedbackPreviewCard />
      </div>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">The shelf</p>
          <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>Your textbooks</h2>
        </div>
        <Link href="/learn" className="text-sm font-semibold hover:opacity-70 transition-opacity pencil-underline" style={{ color: "var(--text)" }}>See the whole shelf</Link>
      </div>

      {(!tracks || tracks.length === 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card p-6 animate-pulse h-56" style={{ background: "var(--surface-2)" }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {tracks.sort((a, b) => a.order - b.order).map((track) => (
            <TrackCard key={track._id} track={track} />
          ))}
        </div>
      )}

      <div className="mb-8">
        <p className="eyebrow mb-2">Due dates</p>
        <h2 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Homework &amp; assignments</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          Assignments from {instructor.short} — complete them before the deadline.
        </p>
        <StudentHomework />
      </div>

      <div className="chalkboard p-6 sm:p-8 mb-12" style={{ ["--board" as string]: "#0b201e", ["--board-edge" as string]: "#07302b" }}>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "#14B8A6",
              boxShadow: "0 0 24px rgba(20,184,166,0.4)",
              border: "1px solid rgba(20,184,166,0.35)",
            }}
          >
            <span className="font-black text-[22px] text-white tracking-tight">S</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="font-black text-[22px] text-white tracking-[0.18em]">
                STARK
              </h2>
              <span
                className="font-bold text-[9px] tracking-[0.1em] px-2.5 py-0.5 rounded-full"
                style={{
                  color: "#14B8A6",
                  border: "1px solid #14B8A633",
                  background: "#14B8A610",
                }}
              >
                AVAILABLE NOW
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4 chalk-muted">
              Stark is included with your platform access. Ask course questions, review Linux and cloud concepts, break down DevOps tools, and get learning guidance whenever office hours are closed.
            </p>
            <Link
              href="/stark"
              className="btn-ink btn-sm"
              style={{ ["--ink" as string]: "#14B8A6", ["--paper" as string]: "#062b28", ["--accent" as string]: "#5eead4" }}
            >
              Open Stark <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
