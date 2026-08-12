"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "../../../convex/_generated/api";
import { VideoLibrary } from "@/components/videos/VideoLibrary";
import { UploadCloud, Film, X } from "lucide-react";
import toast from "react-hot-toast";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function VideoManager() {
  const uploadFile = useUploadFile(api.videos);
  const createVideo = useMutation(api.videos.create);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [recordedDate, setRecordedDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Please choose a video file.");
      return;
    }
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function reset() {
    setFile(null);
    setTitle("");
    setRecordedDate(todayISO());
    setDescription("");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Choose a video file first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    if (!recordedDate) {
      toast.error("Add the class date.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      // Uploads straight to Cloudflare R2 via a presigned URL (no size/time limit).
      const key = await uploadFile(file, {
        onProgress: ({ loaded, total }: { loaded: number; total: number }) => {
          if (total > 0) setProgress(Math.round((loaded / total) * 100));
        },
      });
      await createVideo({
        key,
        title: title.trim(),
        recordedDate,
        description: description.trim() || undefined,
        contentType: file.type,
        fileSize: file.size,
      });
      toast.success("Video published! Students can watch it now.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  } as const;

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <div className="card p-5 space-y-4 max-w-2xl">
        <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
          <UploadCloud size={15} style={{ color: "#2563EB" }} /> Upload a recording
        </h3>

        {/* File picker / dropzone */}
        {!file ? (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex flex-col items-center justify-center gap-2 py-10 px-4 rounded-xl cursor-pointer text-center transition-all hover:opacity-90"
            style={{ background: "var(--surface-2)", border: "2px dashed var(--border)" }}
          >
            <Film size={26} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Click to choose a video, or drag &amp; drop
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              MP4, MOV, WebM — full-length recordings are fine
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#2563EB18" }}
            >
              <Film size={16} style={{ color: "#2563EB" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{file.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            {!uploading && (
              <button onClick={() => setFile(null)} style={{ color: "var(--text-muted)" }} aria-label="Remove file">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Title + date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 4 — Intro to Networking"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Class date *</label>
            <input
              type="date"
              value={recordedDate}
              onChange={(e) => setRecordedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            Description (optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was covered in this class? Any notes for students…"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-y transition-all"
            style={{ ...inputStyle, lineHeight: "1.6" }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              <span>Uploading… keep this tab open</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "8px", background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: "linear-gradient(135deg, #2563EB, #F97316)" }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <UploadCloud size={15} />
          {uploading ? "Uploading…" : "Publish video"}
        </button>
      </div>

      {/* Existing videos */}
      <div>
        <h3 className="font-bold text-sm mb-4" style={{ color: "var(--text)" }}>Uploaded recordings</h3>
        <VideoLibrary canManage />
      </div>
    </div>
  );
}
