"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Cpu, Brain, Shield, Terminal, ArrowRight, BookOpen, Tv, ExternalLink, Cloud, Container, Boxes, GitBranch, Layers, Wrench, Workflow, Gauge } from "lucide-react";
import { useInstructorName } from "@/components/cohort/useInstructorName";

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
  const instructor = useInstructorName();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-14">

      {/* Learning Tracks */}
      <section>
        <div className="mb-8">
          <p className="eyebrow mb-3">The library</p>
          <h1 className="font-serif text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>Learning tracks</h1>
          <p style={{ color: "var(--text-muted)" }}>Pull a textbook off the shelf. Read the chapters, take the quizzes, and finish the mandatory crossword in each one.</p>
        </div>

        {!tracks ? (
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card p-8 animate-pulse h-28" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : (
          <>
            {/* Standing books — quick jump */}
            <div className="bookshelf mb-12 pt-6 overflow-x-auto">
              {[...tracks]
                .sort((a, b) => a.order - b.order)
                .map((track, i) => (
                  <Link
                    key={track._id}
                    href={`/learn/${track.slug}`}
                    className={`book-spine ${["tall", "", "short", "wide", ""][i % 5]}`}
                    style={{ ["--book-color" as string]: track.color }}
                    title={track.name}
                  >
                    <span className="spine-badge text-[10px] font-black">{String(i + 1).padStart(2, "0")}</span>
                    <span className="spine-title">{track.name}</span>
                    <span className="text-[9px] font-bold tracking-widest opacity-80">CS</span>
                  </Link>
                ))}
            </div>

            {/* Catalog */}
            <div className="grid gap-5">
              {[...tracks]
                .sort((a, b) => a.order - b.order)
                .map((track, i) => {
                  const Icon = TRACK_ICONS[track.slug] ?? BookOpen;
                  return (
                    <Link
                      key={track._id}
                      href={`/learn/${track.slug}`}
                      className="book-cover hover:-translate-y-0.5 transition-transform group"
                      style={{ ["--book-color" as string]: track.color }}
                    >
                      <div className="relative z-10 p-6 flex items-center gap-6 flex-1 min-w-0">
                        <div
                          className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${track.color}1a`, border: `1px solid ${track.color}44` }}
                        >
                          <Icon size={26} style={{ color: track.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: track.color }}>
                            Volume {String(i + 1).padStart(2, "0")}
                          </p>
                          <h2 className="font-serif text-xl font-bold mb-1 leading-tight" style={{ color: "var(--text)" }}>{track.name}</h2>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{track.description}</p>
                        </div>
                        <ArrowRight size={20} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: track.color }} />
                      </div>
                    </Link>
                  );
                })}
            </div>
          </>
        )}
      </section>

      {/* Watch Party */}
      <section>
        <div className="mb-6">
          <p className="eyebrow mb-3">Study hall</p>
          <h2 className="font-serif text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>Watch party</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Join a live watch party with your class — watch videos together, chat in real time, and discuss with {instructor.short} and your peers.
          </p>
        </div>

        <div className="index-card p-6 pt-0 relative">
          <span className="washi-tape right" />
          <div className="index-card-title justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Class watch party</span>
            <span className="stamp" style={{ ["--stamp" as string]: "var(--accent)" }}>Coming soon</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-3">
            <div
              className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#2563EB15", border: "1px solid #2563EB33" }}
            >
              <Tv size={26} style={{ color: "var(--primary)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-7 mb-3" style={{ color: "var(--text-muted)" }}>
                Watch curated tech content alongside your class, discuss concepts in real time, and get live guidance from {instructor.short} — all in one shared room.
              </p>
              <a href="https://www.watchparty.me/" target="_blank" rel="noopener noreferrer" className="btn-paper btn-sm">
                <ExternalLink size={13} /> Preview WatchParty.me
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
