"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "../../../convex/_generated/api";
import { FileUp, X } from "lucide-react";
import { extractPdfTextFromFile } from "@/lib/extractPdfText";

type Track = { id: string; label: string };

type Props = {
  tracks: Track[] | undefined;
  busy: boolean;
  onReview: (payload: {
    rawText: string;
    careerTrack: "devops" | "software" | "it_support" | "data" | "consulting";
    jobDescription?: string;
    fileKey?: string;
    fileName?: string;
  }) => Promise<void>;
  hasActiveVersion: boolean;
};

const inputStyle = {
  background: "var(--stark-bg)",
  border: "1px solid var(--stark-border)",
  color: "var(--stark-text)",
} as const;

const MAX_BYTES = 8 * 1024 * 1024;

export function CoachSetupPanel({ tracks, busy, onReview, hasActiveVersion }: Props) {
  const uploadFile = useUploadFile(api.starkResumeFiles);
  const extractFromKey = useAction(api.resumePdf.extractTextFromKey);

  const fileRef = useRef<HTMLInputElement>(null);
  const [careerTrack, setCareerTrack] = useState<
    "devops" | "software" | "it_support" | "data" | "consulting"
  >("devops");
  const [rawText, setRawText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [open, setOpen] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  function clearFile() {
    setFileName(null);
    setFileKey(undefined);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileError(null);

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isTxt =
      file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isTxt) {
      setFileError("Upload a PDF or .txt file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File must be 8 MB or smaller.");
      return;
    }

    setExtracting(true);
    try {
      if (isTxt) {
        const text = (await file.text()).trim();
        if (text.length < 40) {
          throw new Error("That text file is too short to review.");
        }
        setRawText(text);
        setFileName(file.name);
        // Still store a copy in R2 for version history
        const key = await uploadFile(file);
        setFileKey(key);
      } else {
        // Prefer client extraction; fall back to server if needed
        let text = "";
        try {
          text = await extractPdfTextFromFile(file);
        } catch {
          const key = await uploadFile(file);
          setFileKey(key);
          setFileName(file.name);
          const extracted = await extractFromKey({ key });
          text = extracted.text;
          setRawText(text);
          setExtracting(false);
          return;
        }
        setRawText(text);
        setFileName(file.name);
        const key = await uploadFile(file);
        setFileKey(key);
      }
    } catch (err) {
      clearFile();
      setFileError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!rawText.trim() || busy || extracting) return;
    await onReview({
      rawText: rawText.trim(),
      careerTrack,
      jobDescription: jobDescription.trim() || undefined,
      fileKey,
      fileName: fileName ?? undefined,
    });
  }

  const working = busy || extracting;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--stark-border)", background: "var(--stark-surface)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        style={{ color: "var(--stark-text)" }}
      >
        <span>
          {hasActiveVersion ? "Save & review new version" : "Paste or upload resume to start coaching"}
        </span>
        <span style={{ color: "var(--stark-muted)" }}>{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--stark-muted)" }}>
              Career rubric
            </label>
            <select
              value={careerTrack}
              onChange={(e) =>
                setCareerTrack(e.target.value as typeof careerTrack)
              }
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={inputStyle}
            >
              {(tracks ?? [{ id: "devops", label: "DevOps / IT / Cloud" }]).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--stark-muted)" }}>
              Upload PDF (or .txt)
            </label>
            {!fileName ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl cursor-pointer text-center transition-opacity hover:opacity-90"
                style={{
                  background: "var(--stark-bg)",
                  border: "2px dashed var(--stark-border)",
                }}
              >
                <FileUp size={22} style={{ color: "var(--stark-muted)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--stark-text)" }}>
                  Drop a resume PDF here, or click to browse
                </p>
                <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
                  PDF or TXT · max 8 MB · up to 8 pages
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf,text/plain,.txt"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
              >
                <FileUp size={16} style={{ color: "#14B8A6" }} />
                <span className="flex-1 truncate" style={{ color: "var(--stark-text)" }}>
                  {extracting ? "Extracting text…" : fileName}
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  disabled={working}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: "var(--stark-muted)" }}
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {fileError && (
              <p className="text-xs mt-1.5" style={{ color: "#ef4444" }}>
                {fileError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--stark-muted)" }}>
              Resume text {fileName ? "(editable after extract)" : "*"}
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              placeholder="Paste your resume, or upload a PDF above. Stark will parse sections, score with a fixed rubric, then coach you."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--stark-muted)" }}>
              Target job description (optional)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              placeholder="Paste a JD for keyword gap analysis. Stark only counts skills you have evidence for."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          <button
            type="button"
            disabled={working || rawText.trim().length < 40}
            onClick={handleSubmit}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "#14B8A6" }}
          >
            {extracting
              ? "Extracting PDF…"
              : busy
                ? "Parsing & scoring…"
                : hasActiveVersion
                  ? "Save as new version & re-score"
                  : "Parse, score & start coaching"}
          </button>
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--stark-muted)" }}>
            PDFs are stored with your resume version. Scanned image-only PDFs may need a text paste.
          </p>
        </div>
      )}
    </div>
  );
}
