"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn, percentageColor, percentageBg, getInitials } from "@/lib/utils";
import { Trophy, Users, TrendingUp, ArrowRight, Flame } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useCohortScope } from "./CohortContext";

export function ScoresDashboard() {
  const { cohortId } = useCohortScope();
  const scores = useQuery(api.attempts.getAllStudentScores, { cohortId });
  const [selectedTrack, setSelectedTrack] = useState<string>("all");

  if (!scores) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Users size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold" style={{ color: "var(--text)" }}>No students yet</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Students will appear here once they sign up and start learning.
        </p>
      </div>
    );
  }

  const active = scores.filter((r) => r.student.status !== "dropped");
  const roster = active.length > 0 ? active : scores;
  const allTracks = roster[0]?.trackSummaries.map((t) => ({ id: t.trackId, name: t.trackName, color: t.trackColor })) ?? [];
  const classAvg = Math.round(roster.reduce((s, r) => s + r.overall, 0) / roster.length);
  const avgStreak = Math.round(
    roster.reduce((s, r) => s + (r.student.streak ?? 0), 0) / roster.length
  );
  const sorted = [...roster].sort((a, b) => b.overall - a.overall);

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#2563EB22" }}>
            <Users size={16} style={{ color: "#2563EB" }} />
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: "var(--text)" }}>{roster.length}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Students</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0EA5E922" }}>
            <TrendingUp size={16} style={{ color: "#0EA5E9" }} />
          </div>
          <div>
            <p className={cn("text-xl font-black", percentageColor(classAvg))}>{classAvg}%</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Class Avg</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F59E0B22" }}>
            <Trophy size={16} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <p className="text-xl font-black truncate" style={{ color: "var(--text)" }}>
              {sorted[0]?.student.name.split(" ")[0] ?? "—"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Top Student</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F9731622" }}>
            <Flame size={16} style={{ color: "#F97316" }} />
          </div>
          <div>
            <p className="text-xl font-black" style={{ color: "var(--text)" }}>{avgStreak}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Streak</p>
          </div>
        </div>
      </div>

      {/* Student card grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>All Students</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {sorted.map((row) => (
            <Link
              key={row.student._id}
              href={`/teacher/students/${row.student._id}`}
              className="card p-4 flex flex-col items-center text-center gap-2 hover:scale-[1.03] transition-transform group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
              >
                {row.student.imageUrl ? (
                  <img src={row.student.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  getInitials(row.student.name)
                )}
              </div>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{row.student.name}</p>
                <p className={cn("text-lg font-black", percentageColor(row.overall))}>{row.overall}%</p>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Flame size={11} style={{ color: "#F97316" }} />
                {row.student.streak ?? 0} streak
              </div>
              <div
                className="w-full h-1 rounded-full overflow-hidden"
                style={{ background: "var(--surface-2)" }}
              >
                <div
                  className={cn("h-full rounded-full", percentageBg(row.overall))}
                  style={{ width: `${row.overall}%` }}
                />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#2563EB" }}>
                View details <ArrowRight size={11} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Track filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Detailed Rankings</h3>
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setSelectedTrack("all")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: selectedTrack === "all" ? "#2563EB" : "var(--surface-2)",
              color: selectedTrack === "all" ? "white" : "var(--text)",
              border: "1px solid var(--border)",
            }}
          >
            All Tracks
          </button>
          {allTracks.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTrack(t.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: selectedTrack === t.id ? t.color : "var(--surface-2)",
                color: selectedTrack === t.id ? "white" : "var(--text)",
                border: `1px solid ${selectedTrack === t.id ? t.color : "var(--border)"}`,
              }}
            >
              {t.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Ranked student rows */}
        <div className="space-y-2">
          {sorted.map((row, idx) => {
            const displayScore =
              selectedTrack === "all"
                ? row.overall
                : row.trackSummaries.find((t) => t.trackId === selectedTrack)?.percentage ?? 0;
            const trackData =
              selectedTrack !== "all"
                ? row.trackSummaries.find((t) => t.trackId === selectedTrack)
                : null;

            return (
              <Link
                key={row.student._id}
                href={`/teacher/students/${row.student._id}`}
                className="card p-4 flex items-center gap-4 hover:scale-[1.01] transition-transform group"
              >
                {/* Rank */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{
                    background: idx === 0 ? "#F59E0B22" : idx === 1 ? "#94A3B822" : "var(--surface-2)",
                    color: idx === 0 ? "#F59E0B" : idx === 1 ? "#94A3B8" : "var(--text-muted)",
                  }}
                >
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 text-white"
                  style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                >
                  {row.student.imageUrl ? (
                    <img src={row.student.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    getInitials(row.student.name)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{row.student.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{row.student.email}</p>
                  {selectedTrack !== "all" && trackData && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {trackData.completedLessons} lessons completed
                    </p>
                  )}
                </div>

                {/* Track score bars */}
                {selectedTrack === "all" && (
                  <div className="hidden sm:flex gap-2">
                    {row.trackSummaries.map((t) => (
                      <div key={t.trackId} className="text-center">
                        <div className="text-xs font-bold mb-1" style={{ color: t.trackColor }}>{t.percentage}%</div>
                        <div className="w-1.5 h-10 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                          <div className="w-full rounded-full" style={{ height: `${t.percentage}%`, background: t.trackColor }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Score + arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className={cn("text-lg font-black", percentageColor(displayScore))}>{displayScore}%</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedTrack === "all" ? "Overall" : "Track"}</p>
                  </div>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#2563EB" }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
