"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Film, Trash2, Play, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function formatFileSize(bytes?: number): string | null {
  if (bytes == null || bytes <= 0) return null;

  const mb = bytes / 1024 ** 2;

  if (mb < 1024) {
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  }

  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

export function VideoLibrary({
  canManage = false,
  cohortId,
  cohortBadge,
}: {
  canManage?: boolean;
  /** Staff-only: undefined = everything the viewer can see. */
  cohortId?: Id<"cohorts">;
  /** Staff-only: cohort chip on each card. */
  cohortBadge?: (cohortId: Id<"cohorts"> | undefined) => { name: string; color: string } | null;
}) {
  const videos = useQuery(api.videos.list, { cohortId });
  const removeVideo = useMutation(api.videos.remove);
  const [deletingId, setDeletingId] = useState<Id<"videos"> | null>(null);
  const [playingId, setPlayingId] = useState<Id<"videos"> | null>(null);

  async function handleDelete(id: Id<"videos">, title: string) {
    if (!confirm(`Delete "${title}"? This permanently removes the recording for everyone.`)) return;
    setDeletingId(id);
    try {
      await removeVideo({ id });
      toast.success("Video deleted.");
      if (playingId === id) setPlayingId(null);
    } catch {
      toast.error("Could not delete video.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!videos) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="index-card h-56 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="index-card p-10 pt-0 text-center max-w-lg mx-auto">
        <div className="index-card-title justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Tape shelf
          </p>
        </div>
        <Film size={28} className="mx-auto mt-4 mb-3 opacity-40" style={{ color: "var(--text-muted)" }} />
        <p className="font-serif text-xl font-bold" style={{ color: "var(--text)" }}>
          No recordings yet
        </p>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {canManage
            ? "Upload a class recording above and it will appear here for students."
            : "When your instructor posts a class recording, it shows up on this shelf."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {videos.map((video) => {
        const isPlaying = playingId === video._id;
        const size = formatFileSize(video.fileSize);
        const badge = cohortBadge ? cohortBadge(video.cohortId) : null;
        return (
          <article key={video._id} className="index-card plain p-0 overflow-hidden flex flex-col">
            <div className="px-4">
              <div className="index-card-title justify-between gap-2">
                <span className="stamp" style={{ ["--stamp" as string]: "var(--accent)" }}>
                  {formatDate(video.recordedDate)}
                </span>
                {badge && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em] truncate"
                    style={{ color: badge.color }}
                  >
                    {badge.name}
                  </span>
                )}
              </div>
            </div>

            <div className="relative w-full bg-black" style={{ aspectRatio: "16 / 9" }}>
              {isPlaying && video.url ? (
                <video
                  src={video.url}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => video.url && setPlayingId(video._id)}
                  disabled={!video.url}
                  className="group w-full h-full flex items-center justify-center transition-all disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(160deg, var(--board), var(--board-edge))" }}
                  aria-label={`Play ${video.title}`}
                >
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{
                      background: "var(--paper)",
                      color: "var(--ink)",
                      boxShadow: "3px 3px 0 var(--accent)",
                    }}
                  >
                    <Play size={22} className="ml-0.5" fill="currentColor" />
                  </span>
                </button>
              )}
              {isPlaying && (
                <button
                  type="button"
                  onClick={() => setPlayingId(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center z-10"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  aria-label="Close player"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-serif font-bold text-lg leading-snug" style={{ color: "var(--text)" }}>
                {video.title}
              </h3>
              {size && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {size}
                </p>
              )}
              {video.description && (
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {video.description}
                </p>
              )}
              {canManage && (
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(video._id, video.title)}
                    disabled={deletingId === video._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ background: "#EF444415", border: "1px solid #EF444433", color: "#EF4444" }}
                  >
                    {deletingId === video._id ? (
                      <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
