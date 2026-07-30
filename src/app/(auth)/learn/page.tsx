"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Cpu, Brain, Shield, Terminal, ArrowRight, BookOpen, Tv, ExternalLink, Cloud, Container, Boxes, GitBranch, Layers, Wrench, Workflow, Gauge } from "lucide-react";

const TRACK_ICONS: Record<string, React.ElementType> = {
  hardware:     Cpu,
  ai:           Brain,
  cybersecurity: Shield,
  linux:        Terminal,
  aws:          Cloud,
  azure:        Cloud,
  "version-control": GitBranch,
  docker:       Container,
  kubernetes:   Boxes,
  terraform:    Layers,
  ansible:      Wrench,
  cicd:         Workflow,
  monitoring:   Gauge,
};

export default function LearnPage() {
  const tracks = useQuery(api.tracks.list);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">

      {/* Learning Tracks */}
      <section>
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2" style={{ color: "var(--text)" }}>Learning Tracks</h1>
          <p style={{ color: "var(--text-muted)" }}>Choose a track to start learning. Complete lessons, take quizzes, and finish the mandatory crossword in each track!</p>
        </div>

        {!tracks ? (
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card p-8 animate-pulse h-28" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {tracks
              .sort((a, b) => a.order - b.order)
              .map((track) => {
                const Icon = TRACK_ICONS[track.slug] ?? BookOpen;
                return (
                  <Link
                    key={track._id}
                    href={`/learn/${track.slug}`}
                    className="card p-6 flex items-center gap-6 hover:scale-[1.01] transition-transform group"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${track.color}22`, border: `1px solid ${track.color}44` }}
                    >
                      <Icon size={28} style={{ color: track.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>{track.name}</h2>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{track.description}</p>
                    </div>
                    <ArrowRight size={20} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: track.color }} />
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* Watch Party */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>Watch Party</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Join a live watch party with your class — watch videos together, chat in real time, and discuss with Cassandra and your peers.
          </p>
        </div>

        <div
          className="card p-6 flex items-center gap-6"
          style={{ border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}
        >
          {/* Subtle background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 10% 50%, rgba(37,99,235,0.06) 0%, transparent 70%)" }}
          />

          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
            style={{ background: "#2563EB15", border: "1px solid #2563EB33" }}
          >
            <Tv size={28} style={{ color: "#2563EB" }} />
          </div>

          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Class Watch Party</h3>
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "#F9731615", color: "#F97316", border: "1px solid #F9731630" }}
              >
                COMING SOON
              </span>
            </div>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Watch curated tech content alongside your class, discuss concepts in real time, and get live guidance from Cassandra — all in one shared room.
            </p>
            <a
              href="https://www.watchparty.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <ExternalLink size={13} /> Preview WatchParty.me
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
