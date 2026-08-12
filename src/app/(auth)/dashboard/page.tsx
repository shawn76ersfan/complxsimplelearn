"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Cpu, Brain, Shield, Terminal, ArrowRight, BookOpen, Trophy, Flame, Star, Quote, AlertTriangle, Calendar, Cloud, Container, Boxes, GitBranch, Layers, Wrench, Workflow, Gauge, Play } from "lucide-react";
import { StudentHomework } from "@/components/learn/StudentHomework";
import { FeedbackPreviewCard } from "@/components/learn/FeedbackPreviewCard";

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
      <div
        className="card p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
        style={{
          border: "1px solid transparent",
          backgroundImage: "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, var(--primary), var(--accent))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
      >
        <ProgressRing percentage={next?.percentage ?? 100} color="var(--primary)" size={96} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--primary)" }}>
            Continue Learning
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>
            {next?.allComplete ? "All lessons complete" : "Start your first lesson"}
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {next?.allComplete
              ? "Nice work — browse tracks anytime to review material."
              : "Pick a track and begin building job-ready skills."}
          </p>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
          >
            Browse tracks <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
      style={{
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, var(--primary), var(--accent))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <ProgressRing percentage={next.percentage} color={next.trackColor} size={96} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: next.trackColor }}>
          Continue Learning · {next.trackName}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 truncate" style={{ color: "var(--text)" }}>
          {next.lessonTitle}
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {next.completed} of {next.total} lessons complete
        </p>
        <Link
          href={`/learn/${next.trackSlug}/${next.lessonId}`}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          <Play size={16} fill="currentColor" /> Continue
        </Link>
      </div>
    </div>
  );
}

function TrackCard({ track }: { track: { _id: string; name: string; slug: string; description: string; color: string; icon: string } }) {
  const progress = useQuery(api.attempts.getTrackProgress, { trackId: track._id as never });
  const Icon = TRACK_ICONS[track.slug] ?? BookOpen;
  const pct = progress?.percentage ?? 0;

  return (
    <Link href={`/learn/${track.slug}`} className="card p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform group cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${track.color}18` }}>
          <Icon size={22} style={{ color: track.color }} />
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${track.color}12`, color: track.color }}>{pct}%</span>
      </div>
      <div>
        <h3 className="font-bold text-base mb-1" style={{ color: "var(--text)" }}>{track.name}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{track.description}</p>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
          <span>{progress?.completed ?? 0}/{progress?.total ?? 0} lessons</span>
          <span>{pct}% complete</span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--surface-2)", borderRadius: "999px" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(135deg, var(--primary), var(--accent))", borderRadius: "999px" }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: track.color }}>
        Continue <ArrowRight size={14} />
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
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            {level}
          </span>
          <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>Level {level}</span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{completedCount}/{totalCount}</span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: "5px", background: "var(--surface-2)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(135deg, var(--primary), var(--accent))" }} />
      </div>
    </div>
  );
}

function QuoteCard() {
  const quote = useQuery(api.quotes.getCurrent);
  if (!quote) return null;
  return (
    <div
      className="card p-6 relative overflow-hidden"
      style={{
        border: "2px solid transparent",
        backgroundImage: "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, var(--primary), var(--accent))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <Quote size={40} className="absolute -top-1 -left-1 opacity-10" style={{ color: "var(--primary)" }} />
      <div className="relative">
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--primary)" }}>Quote of the Week</p>
        <p className="text-base leading-relaxed italic font-medium" style={{ color: "var(--text)" }}>
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.author && (
          <p className="text-xs mt-2 font-semibold" style={{ color: "var(--text-muted)" }}>— {quote.author}</p>
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

  const totalScore = myAttempts?.reduce((s, a) => s + a.score, 0) ?? 0;
  const totalMax   = myAttempts?.reduce((s, a) => s + a.maxScore, 0) ?? 0;
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const level = progress?.level ?? 0;
  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-1" style={{ fontWeight: 700, color: "var(--text)" }}>
          Hey, {user?.firstName ?? "Student"}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Ready to learn something new today?</p>
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
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--warning-text)" }}>Warning from Cassandra</p>
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
                  <Calendar size={13} /> Schedule a meeting with Cassandra
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

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Your Learning Tracks</h2>
        <Link href="/learn" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "var(--primary)" }}>View all</Link>
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
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Homework & Assignments</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Assignments from Cassandra — complete them before the deadline.</p>
        <StudentHomework />
      </div>

      <div
        className="card p-6 mb-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #020d0d, #071a17, #030f0f)", border: "1px solid rgba(20,184,166,0.25)" }}
      >
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full pointer-events-none" style={{ background: "rgba(20,184,166,0.14)", filter: "blur(40px)" }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(13,148,136,0.10)", filter: "blur(36px)" }} />

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
            <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
              Stark is included with your platform access. Ask course questions, review Linux and cloud concepts, break down DevOps tools, and get learning guidance whenever you need it.
            </p>
            <Link
              href="/stark"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90"
              style={{ background: "#14B8A6", color: "#fff" }}
            >
              Open Stark <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
