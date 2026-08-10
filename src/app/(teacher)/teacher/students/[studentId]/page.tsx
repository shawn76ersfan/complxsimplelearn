"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, CheckCircle, Clock, Flame,
  Star, Trophy, Cpu, Brain, Shield, TrendingUp,
  Terminal, Send, MessageSquare, AlertTriangle, UserX,
  UserCheck, Bell, AlertCircle, RotateCcw, Cloud, Container,
  Boxes, GitBranch, Layers, Wrench, Workflow, Gauge,
} from "lucide-react";
import { cn, percentageColor, percentageBg, getInitials, formatDate } from "@/lib/utils";
import { QuizDetailAccordion } from "@/components/teacher/QuizDetailAccordion";

const TRACK_ICONS: Record<string, React.ElementType> = {
  hardware: Cpu,
  ai: Brain,
  cybersecurity: Shield,
  linux: Terminal,
  aws: Cloud,
  azure: Cloud,
  "version-control": GitBranch,
  docker: Container,
  kubernetes: Boxes,
  terraform: Layers,
  ansible: Wrench,
  cicd: Workflow,
  monitoring: Gauge,
};

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
}

export default function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const data = useQuery(api.attempts.getStudentDetailForTeacher, {
    studentId: studentId as Id<"users">,
  });
  const progress = useQuery(api.assignments.getProgressForStudent, {
    studentId: studentId as Id<"users">,
  });
  const tracks = useQuery(api.tracks.list);
  const sendFeedback = useMutation(api.feedback.send);
  const previousFeedback = useQuery(api.feedback.getForStudent, { studentId: studentId as Id<"users"> });

  const dropStudent = useMutation(api.users.dropStudent);
  const reactivateStudent = useMutation(api.users.reactivateStudent);

  const [dropReason, setDropReason] = useState("");
  const [showDropForm, setShowDropForm] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [dropConfirm, setDropConfirm] = useState(false);

  const [warnMsg, setWarnMsg] = useState("");
  const [sendingWarn, setSendingWarn] = useState(false);
  const [warnSent, setWarnSent] = useState(false);

  const [noticeMsg, setNoticeMsg] = useState("");
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);

  async function handleDrop() {
    if (!dropReason.trim()) return;
    setDropping(true);
    await dropStudent({ studentId: studentId as Id<"users">, reason: dropReason.trim() });
    setDropping(false);
    setShowDropForm(false);
    setDropReason("");
    setDropConfirm(false);
  }

  async function handleReactivate() {
    await reactivateStudent({ studentId: studentId as Id<"users"> });
  }

  async function handleSendWarning() {
    if (!warnMsg.trim()) return;
    setSendingWarn(true);
    await sendFeedback({ studentId: studentId as Id<"users">, message: warnMsg.trim(), type: "warning" });
    setWarnMsg("");
    setSendingWarn(false);
    setWarnSent(true);
    setTimeout(() => setWarnSent(false), 3000);
  }

  async function handleSendNotice() {
    if (!noticeMsg.trim()) return;
    setSendingNotice(true);
    await sendFeedback({ studentId: studentId as Id<"users">, message: noticeMsg.trim(), type: "notice" });
    setNoticeMsg("");
    setSendingNotice(false);
    setNoticeSent(true);
    setTimeout(() => setNoticeSent(false), 3000);
  }

  const isDropped = data?.student.status === "dropped";

  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendFeedback() {
    if (!feedbackMsg.trim()) return;
    setSending(true);
    await sendFeedback({
      studentId: studentId as Id<"users">,
      message: feedbackMsg.trim(),
      trackId: selectedTrack ? selectedTrack as Id<"tracks"> : undefined,
    });
    setFeedbackMsg("");
    setSelectedTrack("");
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  }

  if (data === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded-xl w-48" style={{ background: "var(--surface-2)" }} />
          <div className="card h-40" style={{ background: "var(--surface-2)" }} />
          {[1, 2].map((i) => <div key={i} className="card h-48" style={{ background: "var(--surface-2)" }} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>Student not found</p>
        <Link href="/teacher/dashboard" className="text-sm mt-2 block hover:opacity-70" style={{ color: "var(--text-muted)" }}>
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const { student, trackDetails, overall, totalAttempts } = data;
  const level = progress?.level ?? 0;
  const completedAssignments = progress?.completedCount ?? 0;
  const totalAssignments = progress?.totalCount ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Back */}
      <Link
        href="/teacher/dashboard"
        className="flex items-center gap-2 text-sm hover:opacity-70 transition-opacity w-fit"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Student header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            {student.imageUrl ? (
              <img src={student.imageUrl} alt="" className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              getInitials(student.name)
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>{student.name}</h1>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{student.email}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium" style={{ background: "#2563EB22", color: "#2563EB" }}>
                <BookOpen size={11} /> Student
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium" style={{ background: "#F59E0B22", color: "#F59E0B" }}>
              <Clock size={11} /> Joined {formatDate(student.createdAt)}
                </span>
              {isDropped && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs" style={{ background: "#EF444422", color: "#EF4444" }}>
                  <UserX size={11} /> Dropped
                </span>
              )}
              {student.lastActivityDate && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  Last active {student.lastActivityDate}
                </span>
              )}
            </div>
          </div>

          {/* Overall score ring */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <ScoreRing pct={overall} color={overall >= 80 ? "#0EA5E9" : overall >= 60 ? "#F59E0B" : "#EF4444"} />
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Overall</p>
          </div>
        </div>

        {/* Level = completed homework assignments */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
          {[
            { icon: Star, label: "Assignments done", value: `${completedAssignments}/${totalAssignments}`, color: "#F97316" },
            { icon: TrendingUp, label: "Level", value: level, color: "#2563EB" },
            { icon: Flame, label: "Day Streak", value: student.streak ?? 0, color: "#F97316" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: `${s.color}10` }}>
              <s.icon size={16} style={{ color: s.color }} />
              <div>
                <p className="font-black text-lg leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions card */}
      <div className="card p-6 space-y-5">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <AlertCircle size={16} style={{ color: "#2563EB" }} /> Student Actions
        </h2>

        {/* Drop / Reactivate */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
                {isDropped ? "Student is Dropped" : "Drop Student"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {isDropped
                  ? `Dropped: ${data?.student.droppedAt ? formatDate(data.student.droppedAt) : "—"}`
                  : "Removes all access immediately"}
              </p>
            </div>
            {isDropped ? (
              <button
                onClick={handleReactivate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "#10B981" }}
              >
                <UserCheck size={14} /> Reactivate
              </button>
            ) : (
              <button
                onClick={() => setShowDropForm(!showDropForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "#EF4444" }}
              >
                <UserX size={14} /> Drop Student
              </button>
            )}
          </div>
          {isDropped && data?.student.droppedReason && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#EF444415", color: "#EF4444" }}>
              Reason: {data.student.droppedReason}
            </p>
          )}
          {showDropForm && !isDropped && (
            <div className="space-y-3 pt-1">
              <textarea
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="Reason for dropping (required — kept for your records)..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: "var(--surface)", border: "2px solid #EF4444", color: "var(--text)" }}
              />
              {!dropConfirm ? (
                <button
                  onClick={() => dropReason.trim() && setDropConfirm(true)}
                  disabled={!dropReason.trim()}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#EF4444" }}
                >
                  Continue →
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-center font-semibold" style={{ color: "#EF4444" }}>
                    This will lock {data?.student.name?.split(" ")[0]} out immediately. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { setDropConfirm(false); setShowDropForm(false); setDropReason(""); }} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
                      Cancel
                    </button>
                    <button onClick={handleDrop} disabled={dropping} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "#EF4444" }}>
                      {dropping ? "Dropping..." : "Confirm Drop"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Issue Warning */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
            <AlertTriangle size={14} style={{ color: "#F59E0B" }} /> Issue Warning
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Shows as a prominent amber banner on the student&apos;s dashboard until they acknowledge it.</p>
          <textarea
            value={warnMsg}
            onChange={(e) => setWarnMsg(e.target.value)}
            placeholder="e.g. Your last assignment was late. Please stay on schedule."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--surface)", border: "1px solid #F59E0B88", color: "var(--text)" }}
          />
          <button
            onClick={handleSendWarning}
            disabled={!warnMsg.trim() || sendingWarn}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: warnSent ? "#10B981" : "#F59E0B" }}
          >
            <AlertTriangle size={13} /> {warnSent ? "Warning sent!" : "Send Warning"}
          </button>
        </div>

        {/* Send Notice */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Bell size={14} style={{ color: "#06B6D4" }} /> Send Notice
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>A formal informational notice shown in the student&apos;s feedback inbox (teal styling).</p>
          <textarea
            value={noticeMsg}
            onChange={(e) => setNoticeMsg(e.target.value)}
            placeholder="e.g. Reminder: quiz next Thursday. Review the Hardware track."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--surface)", border: "1px solid #06B6D488", color: "var(--text)" }}
          />
          <button
            onClick={handleSendNotice}
            disabled={!noticeMsg.trim() || sendingNotice}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: noticeSent ? "#10B981" : "#06B6D4" }}
          >
            <Bell size={13} /> {noticeSent ? "Notice sent!" : "Send Notice"}
          </button>
        </div>
      </div>

      {/* Per-track breakdown */}
      <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Track Progress</h2>

      <div className="space-y-4">
        {trackDetails.map((track) => {
          const Icon = TRACK_ICONS[track.trackSlug] ?? BookOpen;
          const completedLessons = track.lessons.filter((l) => l.completed);
          return (
            <div key={track.trackId} className="card overflow-hidden">
              {/* Track header */}
              <div className="p-5 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${track.trackColor}22`, border: `1px solid ${track.trackColor}44` }}
                >
                  <Icon size={20} style={{ color: track.trackColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold" style={{ color: "var(--text)" }}>{track.trackName}</h3>
                    <span className="text-sm font-black ml-3 flex-shrink-0" style={{ color: track.trackColor }}>
                      {track.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${track.percentage}%`, background: track.trackColor }}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                    {track.completedLessons} of {track.totalLessons} lessons completed
                  </p>
                </div>
              </div>

              {/* Lesson list */}
              {track.lessons.length > 0 && (
                <div className="border-t" style={{ borderColor: "var(--border)" }}>
                  {track.lessons.map((lesson, i) => {
                    const lessonPct = lesson.completed
                      ? Math.round((lesson.bestScore / lesson.bestMax) * 100)
                      : 0;
                    return (
                      <div key={lesson.lessonId}>
                        <div
                          className={cn("flex items-center gap-4 px-5 py-3", i < track.lessons.length - 1 && "border-b")}
                          style={{ borderColor: "var(--border)" }}
                        >
                          {/* Status icon */}
                          <div className="flex-shrink-0">
                            {lesson.completed ? (
                              <CheckCircle size={16} style={{ color: "#0EA5E9" }} />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "var(--border)" }} />
                            )}
                          </div>

                          {/* Lesson info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: lesson.completed ? "var(--text)" : "var(--text-muted)" }}>
                              {lesson.title}
                            </p>
                            {lesson.completed && lesson.completedAt && (
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                Completed {formatDate(lesson.completedAt)}
                              </p>
                            )}
                          </div>

                          {/* Score badge */}
                          {lesson.completed && (
                            <span className={cn("text-sm font-bold flex-shrink-0", percentageColor(lessonPct))}>
                              {lessonPct}%
                            </span>
                          )}

                          {/* Type badge */}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                            style={{ background: `${track.trackColor}15`, color: track.trackColor }}
                          >
                            {lesson.type}
                          </span>
                        </div>

                        {/* Quiz breakdown accordion — only for quiz-type lessons the student attempted */}
                        {lesson.type === "quiz" && lesson.completed && (
                          <div className="px-5 pb-3">
                            <QuizDetailAccordion
                              studentId={data!.student._id}
                              lessonId={lesson.lessonId}
                              lessonTitle={`${lesson.title} — Question Breakdown`}
                              trackColor={track.trackColor}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Send feedback */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} style={{ color: "#2563EB" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>Send Feedback</h2>
        </div>

        {/* Previous feedback */}
        {previousFeedback && previousFeedback.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              Previous messages ({previousFeedback.length})
            </p>
            {previousFeedback.slice(0, 5).map((f) => (
              <div key={f._id} className="px-4 py-3 rounded-xl text-sm" style={{
                background: "var(--surface-2)",
                borderLeft: `3px solid ${f.type === "warning" ? "#F59E0B" : f.type === "notice" ? "#06B6D4" : "#2563EB"}`,
              }}>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize" style={{ color: f.type === "warning" ? "#F59E0B" : f.type === "notice" ? "#06B6D4" : "#2563EB" }}>
                      {f.type ?? "feedback"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                    {!f.isRead && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: "#2563EB22", color: "#2563EB" }}>unread</span>
                    )}
                  </div>
                  {(f as { acknowledgedAt?: number }).acknowledgedAt && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#10B98122", color: "#10B981" }}>
                      ✓ Acknowledged {new Date((f as { acknowledgedAt: number }).acknowledgedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p style={{ color: "var(--text)" }}>{f.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Optional track context */}
        {tracks && tracks.length > 0 && (
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
              Relate to track (optional)
            </label>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <option value="">General feedback</option>
              {tracks.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        <textarea
          value={feedbackMsg}
          onChange={(e) => setFeedbackMsg(e.target.value)}
          placeholder={`Write feedback for ${data?.student.name?.split(" ")[0] ?? "this student"}...`}
          rows={4}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-3 transition-all"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={handleSendFeedback}
          disabled={!feedbackMsg.trim() || sending}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: sent ? "#0EA5E9" : "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          {sent ? (
            <>✓ Feedback sent!</>
          ) : sending ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
          ) : (
            <><Send size={14} /> Send Feedback</>
          )}
        </button>
      </div>

      {/* Footer stat */}
      <p className="text-center text-sm pb-4" style={{ color: "var(--text-muted)" }}>
        {totalAttempts} total attempt{totalAttempts !== 1 ? "s" : ""} across all lessons
      </p>
    </div>
  );
}
