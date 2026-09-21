"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { ArrowRight, Tv, ExternalLink, Lock } from "lucide-react";
import { useInstructorName } from "@/components/cohort/useInstructorName";
import { TrackIcon } from "@/lib/trackIcons";
import { weekLabel } from "@/lib/weeks";

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
          <p style={{ color: "var(--text-muted)" }}>Tracks open when your instructor releases them. Quizzes and mandatory work are graded by instructors.</p>
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
                .map((track, i) => {
                  const locked = track.open === false;
                  const spine = (
                    <>
                      <span className="spine-badge text-[10px] font-black">{String(i + 1).padStart(2, "0")}</span>
                      <span className="spine-title">{track.name}</span>
                      <span className="text-[9px] font-bold tracking-widest opacity-80">{locked ? "LOCK" : "CS"}</span>
                    </>
                  );
                  const cls = `book-spine ${["tall", "", "short", "wide", ""][i % 5]}`;
                  const style = { ["--book-color" as string]: track.color };
                  if (locked) {
                    return (
                      <span key={track._id} className={`${cls} opacity-60 cursor-not-allowed`} style={style} title={`${track.name} — not open yet`}>
                        {spine}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={track._id}
                      href={`/learn/${track.slug}`}
                      className={cls}
                      style={style}
                      title={track.name}
                    >
                      {spine}
                    </Link>
                  );
                })}
            </div>

            {/* Catalog */}
            <div className="grid gap-5">
              {[...tracks]
                .sort((a, b) => a.order - b.order)
                .map((track, i) => {
                  const locked = track.open === false;
                  const body = (
                      <div className="relative z-10 p-6 flex items-center gap-6 flex-1 min-w-0">
                        <div
                          className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${track.color}1a`, border: `1px solid ${track.color}44` }}
                        >
                          <TrackIcon slug={track.slug} icon={track.icon} size={26} style={{ color: track.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: track.color }}>
                            {weekLabel(i)}
                          </p>
                          <h2 className="font-serif text-xl font-bold mb-1 leading-tight" style={{ color: "var(--text)" }}>{track.name}</h2>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {locked ? "Not open yet — your instructor will release this track in class." : track.description}
                          </p>
                        </div>
                        {locked
                          ? <Lock size={18} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                          : <ArrowRight size={20} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: track.color }} />}
                      </div>
                  );
                  if (locked) {
                    return (
                      <div
                        key={track._id}
                        className="book-cover opacity-80"
                        style={{ ["--book-color" as string]: track.color }}
                      >
                        {body}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={track._id}
                      href={`/learn/${track.slug}`}
                      className="book-cover hover:-translate-y-0.5 transition-transform group"
                      style={{ ["--book-color" as string]: track.color }}
                    >
                      {body}
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
