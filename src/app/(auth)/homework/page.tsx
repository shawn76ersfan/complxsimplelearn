"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  BookOpen,
  ArrowLeft,
  FileText,
  Star,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  complete: { bg: "#0EA5E920", color: "#0EA5E9", label: "Complete", icon: CheckCircle },
  graded: { bg: "#0EA5E920", color: "#0EA5E9", label: "Graded", icon: Star },
  submitted: { bg: "#8B5CF620", color: "#8B5CF6", label: "Submitted", icon: FileText },
  late: { bg: "#EF444420", color: "#EF4444", label: "Late", icon: AlertTriangle },
  pending: { bg: "#2563EB20", color: "#2563EB", label: "Pending", icon: Clock },
  empty: { bg: "#F9731620", color: "#F97316", label: "Empty", icon: X },
  "no-track": { bg: "var(--surface-2)", color: "var(--text-muted)", label: "General", icon: BookOpen },
} as const;

type AssignmentStatus = keyof typeof STATUS_STYLES;

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

function SubmissionForm({
  assignmentId,
  allowFileUpload,
  existingText,
}: {
  assignmentId: Id<"assignments">;
  allowFileUpload: boolean;
  existingText?: string;
}) {
  const submit = useMutation(api.submissions.submit);
  const uploadFile = useUploadFile(api.submissions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(existingText ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!text.trim() && !file) {
      toast.error("Add written work or attach a file");
      return;
    }
    setSaving(true);
    try {
      let fileKey: string | undefined;
      let fileName: string | undefined;
      let contentType: string | undefined;
      let fileSize: number | undefined;

      if (file && allowFileUpload) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error("File must be 25 MB or smaller");
          setSaving(false);
          return;
        }
        fileKey = await uploadFile(file);
        fileName = file.name;
        contentType = file.type;
        fileSize = file.size;
      }

      await submit({
        assignmentId,
        textContent: text.trim() || undefined,
        fileKey,
        fileName,
        contentType,
        fileSize,
      });
      toast.success("Submitted!");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Your submission
      </p>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer, paste a link, or describe your work..."
        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
        style={inputStyle}
      />
      {allowFileUpload && (
        <div className="flex items-center gap-3 flex-wrap">
          <label
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            <Upload size={12} />
            {file ? file.name : "Attach file"}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <button
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs"
              style={{ color: "#EF4444" }}
            >
              Remove
            </button>
          )}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
      >
        {saving ? "Submitting…" : existingText ? "Resubmit" : "Submit work"}
      </button>
    </div>
  );
}

export default function HomeworkPage() {
  const assignments = useQuery(api.assignments.getMyStatus);

  const sorted = assignments
    ? [...assignments].sort(
        (a, b) =>
          (b as { _creationTime: number })._creationTime -
          (a as { _creationTime: number })._creationTime,
      )
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      <h1 className="text-3xl font-black mb-1" style={{ color: "var(--text)" }}>
        All Assignments
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Complete track work or submit homework for grading — most recent first.
      </p>

      {!sorted ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen size={32} className="mx-auto mb-3 opacity-25" />
          <p className="font-semibold" style={{ color: "var(--text)" }}>No assignments yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Cassandra will post assignments here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => {
            const s = STATUS_STYLES[a.status as AssignmentStatus] ?? STATUS_STYLES.pending;
            const Icon = s.icon;
            const now = Date.now();
            const isPast = now > a.dueDate;
            const daysLeft = Math.ceil((a.dueDate - now) / (1000 * 60 * 60 * 24));
            const track = (a as { track?: { name: string; slug: string } }).track;
            const requiresSubmission = !!(a as { requiresSubmission?: boolean }).requiresSubmission;
            const allowFileUpload = !!(a as { allowFileUpload?: boolean }).allowFileUpload;
            const submission = (
              a as {
                submission?: {
                  status: string;
                  grade?: number;
                  feedback?: string;
                  textContent?: string;
                  fileName?: string;
                } | null;
              }
            ).submission;

            return (
              <div
                key={a._id}
                className="card p-5"
                style={{
                  borderColor:
                    a.status === "late" || a.status === "empty"
                      ? "#EF444433"
                      : a.status === "complete" || a.status === "graded"
                        ? "#0EA5E933"
                        : "var(--border)",
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold" style={{ color: "var(--text)" }}>{a.title}</p>
                      {isPast && a.status !== "complete" && a.status !== "graded" && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "#EF444420", color: "#EF4444" }}
                        >
                          Past Due
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-sm mb-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        {a.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>
                        Assigned:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {formatDate((a as { _creationTime: number })._creationTime)}
                        </strong>
                      </span>
                      <span>
                        Due:{" "}
                        <strong
                          style={{
                            color:
                              isPast && a.status !== "complete" && a.status !== "graded"
                                ? "#EF4444"
                                : "var(--text)",
                          }}
                        >
                          {formatDate(a.dueDate)}
                        </strong>
                      </span>
                      {!isPast &&
                        a.status !== "complete" &&
                        a.status !== "graded" &&
                        daysLeft <= 7 && (
                          <span style={{ color: daysLeft <= 2 ? "#EF4444" : "#F59E0B" }}>
                            {daysLeft <= 0
                              ? "Due today!"
                              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                          </span>
                        )}
                      {track && (
                        <Link
                          href={`/learn/${track.slug}`}
                          className="hover:opacity-70 transition-opacity"
                          style={{ color: "#2563EB" }}
                        >
                          → {track.name}
                        </Link>
                      )}
                    </div>

                    {submission && (submission.grade !== undefined || submission.feedback) && (
                      <div
                        className="mt-3 rounded-xl p-3 text-sm"
                        style={{ background: "#0EA5E915", color: "var(--text)" }}
                      >
                        {submission.grade !== undefined && (
                          <p className="font-semibold" style={{ color: "#0EA5E9" }}>
                            Grade: {submission.grade}%
                          </p>
                        )}
                        {submission.feedback && (
                          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
                            {submission.feedback}
                          </p>
                        )}
                      </div>
                    )}

                    {requiresSubmission && (
                      <SubmissionForm
                        assignmentId={a._id}
                        allowFileUpload={allowFileUpload}
                        existingText={submission?.textContent}
                      />
                    )}
                  </div>
                  <span
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    <Icon size={11} /> {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
