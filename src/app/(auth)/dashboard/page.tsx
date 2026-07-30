"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Cpu, Brain, Shield, Terminal, ArrowRight, BookOpen, Trophy, Flame, Star, Quote, AlertTriangle, Calendar, Cloud, Container, Boxes, GitBranch, Layers, Wrench, Workflow, Gauge } from "lucide-react";
import { FeedbackInbox } from "@/components/teacher/FeedbackInbox";
import { StudentHomework } from "@/components/learn/StudentHomework";

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
        {/* Progress bar — spec: 6px, #E5E7EB track, brand purple fill */}
        <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "#E5E7EB", borderRadius: "999px" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(135deg, #2563EB, #F97316)", borderRadius: "999px" }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: track.color }}>
        Continue <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function XpBar({ xp }: { xp: number }) {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
            {level}
          </span>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>Level {level}</span>
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{xp} XP total</span>
      </div>
      {/* XP bar — spec: 8px, #E5E7EB track, gradient fill */}
      <div className="w-full rounded-full overflow-hidden" style={{ height: "8px", background: "#E5E7EB", borderRadius: "999px" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpInLevel}%`, background: "linear-gradient(135deg, #2563EB, #F97316)", borderRadius: "999px" }} />
      </div>
      <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{xpInLevel}/100 XP to level {level + 1}</p>
    </div>
  );
}

function QuoteCard() {
  const quote = useQuery(api.quotes.getCurrent);
  if (!quote) return null;
  return (
    <div
      className="card p-6 relative overflow-hidden"
      style={{ border: "2px solid transparent", backgroundImage: "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, #2563EB, #F97316)", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}
    >
      <Quote size={40} className="absolute -top-1 -left-1 opacity-10" style={{ color: "#2563EB" }} />
      <div className="relative">
        <p className="text-sm font-semibold mb-1" style={{ color: "#2563EB" }}>Quote of the Week</p>
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
  const unreadFeedback = useQuery(api.feedback.getUnreadCount);
  const activeWarnings = useQuery(api.feedback.getActiveWarnings);
  const acknowledgeWarning = useMutation(api.feedback.acknowledgeWarning);

  const totalScore = myAttempts?.reduce((s, a) => s + a.score, 0) ?? 0;
  const totalMax   = myAttempts?.reduce((s, a) => s + a.maxScore, 0) ?? 0;
  const overallPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const xp     = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl mb-1" style={{ fontWeight: 700, color: "var(--text)" }}>
          Hey, {user?.firstName ?? "Student"} 👋
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>Ready to learn something new today?</p>
      </div>

      {/* Warning banners — softened per spec */}
      {activeWarnings && activeWarnings.length > 0 && (
        <div className="space-y-3 mb-6">
          {activeWarnings.map((w) => (
            <div
              key={w._id}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#92400E" }} />
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1" style={{ color: "#92400E" }}>Warning from Cassandra</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#1C1917" }}>{w.message}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pl-7">
                <a
                  href="https://calendly.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ border: "1px solid #2563EB", color: "#2563EB", borderRadius: "8px", background: "transparent" }}
                >
                  <Calendar size={13} /> Schedule a meeting with Cassandra
                </a>
                <button
                  onClick={() => acknowledgeWarning({ feedbackId: w._id })}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ border: "1px solid #B45309", color: "#B45309", borderRadius: "8px", background: "transparent" }}
                >
                  <AlertTriangle size={13} /> I acknowledge this warning
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quote of the week */}
      <div className="mb-6">
        <QuoteCard />
      </div>

      {/* XP bar */}
      <div className="mb-6">
        <XpBar xp={xp} />
      </div>

      {/* Stats row — spec: p-16px, r-12px, icon 36x36 r-10px, metric 22px/700, label 13px */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Overall Score", value: `${overallPct}%`, icon: Trophy,  color: "#2563EB" },
          { label: "Lessons Done",  value: myAttempts?.length ?? 0, icon: BookOpen, color: "#0EA5E9" },
          { label: "Total XP",      value: xp,     icon: Star,  color: "#F97316" },
          { label: "Day Streak",    value: streak,  icon: Flame, color: "#F97316" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3" style={{ padding: "16px", borderRadius: "12px" }}>
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: "36px", height: "36px", borderRadius: "10px", background: `${stat.color}18` }}>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tracks grid */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Your Learning Tracks</h2>
        <Link href="/learn" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: "#2563EB" }}>View all</Link>
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

      {/* Homework */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Homework & Assignments</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Assignments from Cassandra — complete them before the deadline.</p>
        <StudentHomework />
      </div>

      {/* Stark */}
      <div
        className="card p-6 mb-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #020d0d, #071a17, #030f0f)", border: "1px solid rgba(20,184,166,0.25)" }}
      >
        {/* Teal glow blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full pointer-events-none" style={{ background: "rgba(20,184,166,0.14)", filter: "blur(40px)" }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none" style={{ background: "rgba(13,148,136,0.10)", filter: "blur(36px)" }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Logo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "#14B8A6",
              boxShadow: "0 0 24px rgba(20,184,166,0.4)",
              border: "1px solid rgba(20,184,166,0.35)",
            }}
          >
            <span style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "22px", color: "#fff" }}>S</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 900,
                  fontSize: "22px",
                  color: "#fff",
                  letterSpacing: "0.06em",
                }}
              >
                STARK
              </h2>
              <span
                style={{
                  fontFamily: "var(--font-orbitron)",
                  fontWeight: 700,
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  color: "#14B8A6",
                  border: "1px solid #14B8A633",
                  background: "#14B8A610",
                  padding: "3px 9px",
                  borderRadius: "99px",
                }}
              >
                AVAILABLE NOW
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
              Stark is included with your platform access. Ask course questions, review Linux and cloud concepts, break down DevOps tools, and get learning guidance whenever you need it.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["Course FAQs", "Tech Concepts", "Career Advice", "Bias-Aware AI"].map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: "rgba(20,184,166,0.08)", color: "#5eead4", border: "1px solid rgba(20,184,166,0.18)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link
              href="/stark"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
              style={{ background: "#14B8A6", color: "#fff" }}
            >
              Open Stark <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Feedback from Cassandra */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Feedback from Cassandra</h2>
        {!!unreadFeedback && unreadFeedback > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
            {unreadFeedback}
          </span>
        )}
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Personal notes and encouragement from your teacher.</p>
      <FeedbackInbox />
    </div>
  );
}
