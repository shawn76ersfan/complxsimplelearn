"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  FileText,
  Star,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  complete: { bg: "#0EA5E920", color: "#0EA5E9", label: "Complete", icon: CheckCircle },
  graded: { bg: "#0EA5E920", color: "#0EA5E9", label: "Graded", icon: Star },
  submitted: { bg: "#8B5CF620", color: "#8B5CF6", label: "Submitted", icon: FileText },
  late: { bg: "#EF444420", color: "#EF4444", label: "Late", icon: AlertTriangle },
  pending: { bg: "#2563EB20", color: "#2563EB", label: "Pending", icon: Clock },
  empty: { bg: "#F9731620", color: "#F97316", label: "Empty", icon: X },
  "no-track": { bg: "var(--surface-2)", color: "var(--text-muted)", label: "N/A", icon: Clock },
} as const;

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

function CreateForm({ onClose }: { onClose: () => void }) {
  const tracks = useQuery(api.curriculumAdmin.listTracks);
  const create = useMutation(api.assignments.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackId, setTrackId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requiresSubmission, setRequiresSubmission] = useState(true);
  const [allowFileUpload, setAllowFileUpload] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !dueDate) return;
    setSaving(true);
    try {
      await create({
        title: title.trim(),
        description: description.trim() || undefined,
        trackId: trackId ? (trackId as Id<"tracks">) : undefined,
        dueDate: new Date(dueDate).getTime(),
        assignedToAll: true,
        requiresSubmission,
        allowFileUpload: requiresSubmission ? allowFileUpload : false,
      });
      toast.success("Assignment created!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-bold" style={{ color: "var(--text)" }}>New Assignment</h3>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputStyle}
          placeholder="e.g. Write a Bash script that..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Description / instructions</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={inputStyle}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Linked track (optional)</label>
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={inputStyle}
          >
            <option value="">None</option>
            {tracks?.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Due date & time *</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={requiresSubmission}
            onChange={(e) => setRequiresSubmission(e.target.checked)}
          />
          Require student submission (text / file) + grading
        </label>
        {requiresSubmission && (
          <label className="flex items-center gap-2 text-sm cursor-pointer ml-6" style={{ color: "var(--text)" }}>
            <input
              type="checkbox"
              checked={allowFileUpload}
              onChange={(e) => setAllowFileUpload(e.target.checked)}
            />
            Allow file attachments (PDF, docs, images — max 25 MB)
          </label>
        )}
        {!requiresSubmission && (
          <p className="text-xs ml-6" style={{ color: "var(--text-muted)" }}>
            Status will be inferred from linked track lesson completion (legacy mode).
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm font-medium"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || !dueDate || saving}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          {saving ? "Creating..." : "Create Assignment"}
        </button>
      </div>
    </div>
  );
}

function GradePanel({
  assignmentId,
  onClose,
}: {
  assignmentId: Id<"assignments">;
  onClose: () => void;
}) {
  const rows = useQuery(api.submissions.listForAssignment, { assignmentId });
  const gradeMutation = useMutation(api.submissions.grade);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleGrade(submissionId: Id<"assignmentSubmissions">) {
    const raw = grades[submissionId] ?? "";
    const grade = Number(raw);
    if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
      toast.error("Enter a grade from 0–100");
      return;
    }
    setSavingId(submissionId);
    try {
      await gradeMutation({
        submissionId,
        grade,
        feedback: feedbacks[submissionId]?.trim() || undefined,
      });
      toast.success("Graded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grade");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="border-t" style={{ borderColor: "var(--border)" }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--surface-2)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Submissions & grading</p>
        <button onClick={onClose} className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
          Close
        </button>
      </div>
      {!rows ? (
        <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>No submissions yet.</p>
      ) : (
        rows.map(({ submission, student }) => (
          <div
            key={submission._id}
            className="px-5 py-4 border-b space-y-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{student.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Submitted {formatDate(submission.submittedAt)}
                  {submission.grade !== undefined && ` · Grade ${submission.grade}%`}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: submission.status === "graded" ? "#0EA5E920" : "#8B5CF620",
                  color: submission.status === "graded" ? "#0EA5E9" : "#8B5CF6",
                }}
              >
                {submission.status}
              </span>
            </div>

            {submission.textContent && (
              <div
                className="rounded-xl p-3 text-sm whitespace-pre-wrap"
                style={{ background: "var(--surface-2)", color: "var(--text)" }}
              >
                {submission.textContent}
              </div>
            )}

            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:opacity-70"
                style={{ color: "#2563EB" }}
              >
                Download {submission.fileName || "attachment"}
              </a>
            )}

            <div className="grid sm:grid-cols-[100px_1fr_auto] gap-2 items-start">
              <input
                type="number"
                min={0}
                max={100}
                placeholder="0–100"
                value={grades[submission._id] ?? (submission.grade?.toString() ?? "")}
                onChange={(e) =>
                  setGrades((prev) => ({ ...prev, [submission._id]: e.target.value }))
                }
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
              <input
                placeholder="Feedback (optional)"
                value={feedbacks[submission._id] ?? submission.feedback ?? ""}
                onChange={(e) =>
                  setFeedbacks((prev) => ({ ...prev, [submission._id]: e.target.value }))
                }
                className="px-3 py-2 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
              <button
                onClick={() => handleGrade(submission._id)}
                disabled={savingId === submission._id}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "#2563EB" }}
              >
                {savingId === submission._id ? "Saving…" : "Grade"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function HomeworkTab() {
  const data = useQuery(api.assignments.getAllStudentStatuses);
  const remove = useMutation(api.assignments.remove);
  const [creating, setCreating] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Id<"assignments"> | null>(null);
  const [showAll, setShowAll] = useState(false);

  const VISIBLE_LIMIT = 5;

  if (!data) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ))}
      </div>
    );
  }

  const sorted = [...data].sort(
    (a, b) =>
      (b.assignment as { _creationTime: number })._creationTime -
      (a.assignment as { _creationTime: number })._creationTime,
  );

  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hidden = sorted.length - VISIBLE_LIMIT;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Plus size={14} /> New Assignment
        </button>
      </div>

      {creating && <CreateForm onClose={() => setCreating(false)} />}

      {data.length === 0 && !creating && (
        <div className="card p-10 text-center">
          <p className="font-semibold" style={{ color: "var(--text)" }}>No assignments yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Create a submission-based assignment to collect and grade student work.
          </p>
        </div>
      )}

      {visible.map(({ assignment, studentStatuses }) => {
        const isExpanded = expandedAssignment === assignment._id;
        const isGrading = gradingAssignment === assignment._id;
        const now = Date.now();
        const isPast = now > assignment.dueDate;
        const doneCount = studentStatuses.filter((s) =>
          ["complete", "graded", "submitted", "late"].includes(s.status),
        ).length;
        const total = studentStatuses.length;
        const requiresSubmission = !!(assignment as { requiresSubmission?: boolean }).requiresSubmission;

        return (
          <div key={assignment._id} className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold" style={{ color: "var(--text)" }}>{assignment.title}</h3>
                    {requiresSubmission && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "#8B5CF620", color: "#8B5CF6" }}
                      >
                        Submissions
                      </span>
                    )}
                    {isPast && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "#EF444420", color: "#EF4444" }}
                      >
                        Past Due
                      </span>
                    )}
                  </div>
                  {assignment.description && (
                    <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                      {assignment.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>
                      Assigned:{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {formatDate((assignment as { _creationTime: number })._creationTime)}
                      </strong>
                    </span>
                    <span>
                      Due:{" "}
                      <strong style={{ color: isPast ? "#EF4444" : "var(--text)" }}>
                        {formatDate(assignment.dueDate)}
                      </strong>
                    </span>
                    {(assignment as { track?: { name: string } }).track && (
                      <span>
                        Track:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {(assignment as { track: { name: string } }).track.name}
                        </strong>
                      </span>
                    )}
                    <span
                      style={{
                        color: doneCount === total && total > 0 ? "#0EA5E9" : "var(--text-muted)",
                      }}
                    >
                      {doneCount}/{total} turned in
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {requiresSubmission && (
                    <button
                      onClick={() =>
                        setGradingAssignment(isGrading ? null : assignment._id)
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: isGrading ? "#8B5CF620" : "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: isGrading ? "#8B5CF6" : "var(--text)",
                      }}
                    >
                      {isGrading ? "Hide grading" : "Grade"}
                    </button>
                  )}
                  <button
                    onClick={() =>
                      setExpandedAssignment(isExpanded ? null : assignment._id)
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {isExpanded ? "Hide" : "View Students"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this assignment and all submissions?")) return;
                      await remove({ id: assignment._id });
                      toast.success("Deleted");
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{ background: "#EF444415" }}
                  >
                    <Trash2 size={13} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              </div>

              <div
                className="mt-3 w-full rounded-full overflow-hidden"
                style={{ height: "4px", background: "var(--surface-2)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
                    background: "#0EA5E9",
                  }}
                />
              </div>
            </div>

            {isGrading && (
              <GradePanel
                assignmentId={assignment._id}
                onClose={() => setGradingAssignment(null)}
              />
            )}

            {isExpanded && (
              <div className="border-t" style={{ borderColor: "var(--border)" }}>
                {studentStatuses.length === 0 ? (
                  <p className="p-4 text-sm" style={{ color: "var(--text-muted)" }}>
                    No active students.
                  </p>
                ) : (
                  studentStatuses.map(({ student, status, submission }) => {
                    const s = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.pending;
                    const Icon = s.icon;
                    return (
                      <div
                        key={student._id}
                        className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                        >
                          {student.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                            {student.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                            {student.email}
                            {submission?.grade !== undefined && ` · ${submission.grade}%`}
                          </p>
                        </div>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                          style={{ background: s.bg, color: s.color }}
                        >
                          <Icon size={11} /> {s.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      {sorted.length > VISIBLE_LIMIT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {showAll
            ? `Show less ↑`
            : `See all ${sorted.length} assignments (${hidden} more) ↓`}
        </button>
      )}
    </div>
  );
}
