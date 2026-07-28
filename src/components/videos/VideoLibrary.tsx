"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Video, Trash2, Calendar, Play, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

function formatFileSize(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function VideoLibrary({ canManage = false }: { canManage?: boolean }) {
  const videos = useQuery(api.videos.list);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card h-48 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Video size={32} className="mx-auto mb-3 opacity-25" />
        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>No recordings yet</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {canManage
            ? "Upload a class recording above and it'll appear here for students."
            : "Recorded classes will show up here once your teacher uploads them."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((video) => {
        const isPlaying = playingId === video._id;
        const size = formatFileSize(video.fileSize);
        return (
          <div key={video._id} className="card p-0 overflow-hidden flex flex-col">
            {/* Player / thumbnail area */}
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
                  onClick={() => video.url && setPlayingId(video._id)}
                  disabled={!video.url}
                  className="group w-full h-full flex items-center justify-center transition-all disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #0b1220, #111827)" }}
                  aria-label={`Play ${video.title}`}
                >
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", boxShadow: "0 6px 20px rgba(37,99,235,0.4)" }}
                  >
                    <Play size={22} className="text-white ml-0.5" fill="white" />
                  </span>
                </button>
              )}
              {isPlaying && (
                <button
                  onClick={() => setPlayingId(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center z-10"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  aria-label="Close player"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Meta */}
            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-bold text-sm leading-snug" style={{ color: "var(--text)" }}>
                {video.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <Calendar size={12} />
                {formatDate(video.recordedDate)}
                {size && <span className="opacity-60">· {size}</span>}
              </div>
              {video.description && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                  {video.description}
                </p>
              )}
              {canManage && (
                <div className="mt-auto pt-2">
                  <button
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
          </div>
        );
      })}
    </div>
  );
}
