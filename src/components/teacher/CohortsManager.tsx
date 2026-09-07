"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Archive,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  Mail,
  Pencil,
  Plus,
  ScrollText,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { COHORT_STATUS_LABEL, CohortSummary, cohortWeek, formatCohortDate, useCohortScope } from "./CohortContext";
import { InviteStudentPanel } from "./InviteStudentPanel";
import { StaffManager } from "./StaffManager";

type Status = CohortSummary["cohort"]["status"];

const STATUS_COLOR: Record<Status, string> = {
  upcoming: "#0EA5E9",
  active: "#10B981",
  completed: "#8B5CF6",
  archived: "#6B7280",
};

const PALETTE = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#E11D48", "#8B5CF6", "#F97316", "#14B8A6"];

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

export function CohortsManager() {
  const cohorts = useQuery(api.cohorts.list, { includeArchived: true }) as CohortSummary[] | undefined;
  const [openId, setOpenId] = useState<Id<"cohorts"> | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (openId) {
    return <CohortDetail cohortId={openId} onBack={() => setOpenId(null)} />;
  }

  const list = (cohorts ?? []).filter((c) => showArchived || c.cohort.status !== "archived");
  const archivedCount = (cohorts ?? []).filter((c) => c.cohort.status === "archived").length;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>The shelves</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Each book is one run of the program: its own roster, instructors, schedule, homework and recordings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <Plus size={15} /> New cohort
          </button>
        </div>

        {creating && (
          <div className="mb-6">
            <CohortForm onClose={() => setCreating(false)} />
          </div>
        )}

        {!cohorts ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="card h-48 animate-pulse" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : list.length === 0 && !creating ? (
          <div className="card p-10 text-center">
            <Layers size={36} className="mx-auto mb-3 opacity-25" />
            <p className="font-semibold" style={{ color: "var(--text)" }}>No cohorts yet</p>
            <p className="text-sm mt-1 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              Right now every student sees everything. Create your first cohort, assign instructors, then move students in.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {list.map((c) => (
              <CohortCard key={c.cohort._id} summary={c} onOpen={() => setOpenId(c.cohort._id)} />
            ))}
          </div>
        )}

        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="mt-4 text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            {showArchived ? "Hide" : "Show"} {archivedCount} archived cohort{archivedCount === 1 ? "" : "s"}
          </button>
        )}
      </section>

      <StaffManager />
    </div>
  );
}

function CohortCard({ summary, onOpen }: { summary: CohortSummary; onOpen: () => void }) {
  const { cohort, activeStudentCount, teachers, pendingInvites } = summary;
  const progress = cohortWeek(cohort.startDate, cohort.endDate);
  const status = cohort.status;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="book-cover text-left w-full hover:-translate-y-1 transition-transform group"
      style={{ ["--book-color" as string]: cohort.color, opacity: status === "archived" ? 0.65 : 1 }}
    >
      <div className="relative flex-1 p-5 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: cohort.color }}>
              {cohort.code ?? "Cohort"}
            </p>
            <p className="font-serif text-xl font-bold leading-tight truncate" style={{ color: "var(--text)" }}>
              {cohort.name}
            </p>
            <p className="text-xs truncate mt-1" style={{ color: "var(--text-muted)" }}>
              {formatCohortDate(cohort.startDate)}
              {cohort.endDate ? ` – ${formatCohortDate(cohort.endDate)}` : " · open-ended"}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        {status === "active" && progress.totalWeeks && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>
              <span>Week {progress.week} of {progress.totalWeeks}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress.pct}%`, background: cohort.color }} />
            </div>
          </div>
        )}
        {status === "upcoming" && (
          <p className="mt-4 text-xs font-medium flex items-center gap-1.5" style={{ color: STATUS_COLOR.upcoming }}>
            <Clock size={12} />
            {progress.daysUntilStart > 0 ? `Starts in ${progress.daysUntilStart} day${progress.daysUntilStart === 1 ? "" : "s"}` : "Start date has passed — mark it active"}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><Users size={12} /> {activeStudentCount} names</span>
            {pendingInvites > 0 && (
              <span className="flex items-center gap-1"><Mail size={12} /> {pendingInvites} invited</span>
            )}
            {cohort.schedule && (
              <span className="hidden sm:flex items-center gap-1 truncate"><CalendarDays size={12} /> {cohort.schedule}</span>
            )}
          </div>
          <AvatarStack people={teachers} emptyLabel="No instructor" />
        </div>
      </div>
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ background: `${color}1a`, color }}
    >
      {status === "active" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {COHORT_STATUS_LABEL[status]}
    </span>
  );
}

function AvatarStack({
  people,
  emptyLabel,
}: {
  people: { _id: string; name: string; imageUrl?: string }[];
  emptyLabel: string;
}) {
  if (people.length === 0) {
    return <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>{emptyLabel}</span>;
  }
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {people.slice(0, 3).map((p) => (
          <span
            key={p._id}
            title={p.name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", ["--tw-ring-color" as string]: "var(--surface)" }}
          >
            {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : getInitials(p.name)}
          </span>
        ))}
      </div>
      <span className="ml-2 text-[11px] truncate max-w-[120px]" style={{ color: "var(--text-muted)" }}>
        {people.length === 1 ? people[0]!.name.split(" ")[0] : `${people.length} instructors`}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create / edit form                                                  */
/* ------------------------------------------------------------------ */

function CohortForm({
  existing,
  onClose,
}: {
  existing?: CohortSummary["cohort"];
  onClose: () => void;
}) {
  const create = useMutation(api.cohorts.create);
  const update = useMutation(api.cohorts.update);
  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [startDate, setStartDate] = useState(existing?.startDate ?? "");
  const [endDate, setEndDate] = useState(existing?.endDate ?? "");
  const [schedule, setSchedule] = useState(existing?.schedule ?? "");
  const [meetingUrl, setMeetingUrl] = useState(existing?.meetingUrl ?? "");
  const [color, setColor] = useState(existing?.color ?? PALETTE[0]!);
  const [status, setStatus] = useState<Status>(existing?.status ?? "upcoming");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (existing) {
        await update({
          cohortId: existing._id,
          name,
          code,
          description,
          startDate,
          endDate,
          schedule,
          meetingUrl,
          color,
          status,
        });
        toast.success("Cohort updated");
      } else {
        await create({
          name,
          code: code || undefined,
          description: description || undefined,
          startDate,
          endDate: endDate || undefined,
          schedule: schedule || undefined,
          meetingUrl: meetingUrl || undefined,
          color,
          status,
        });
        toast.success(`${name} created. Assign instructors and add students next.`);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save cohort");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4" style={{ borderColor: `${color}66` }}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold" style={{ color: "var(--text)" }}>{existing ? "Edit cohort" : "New cohort"}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:opacity-70" aria-label="Close">
          <X size={16} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      <div className="grid sm:grid-cols-[1fr_120px] gap-3">
        <Field label="Name *">
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall 2026 Evening" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Short code">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))} placeholder="C4" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Start date *">
          <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="End date">
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
            {(Object.keys(COHORT_STATUS_LABEL) as Status[]).map((s) => (
              <option key={s} value={s}>{COHORT_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Meeting schedule">
          <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Tue & Thu · 6–8pm ET" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Field>
        <Field label="Class link (Zoom / Meet)">
          <input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/j/…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </Field>
      </div>

      <Field label="Description">
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who this cohort is for, what it covers, anything students should know." className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
      </Field>

      <Field label="Colour">
        <div className="flex gap-2 flex-wrap">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
              style={{ background: c, outline: color === c ? `3px solid ${c}55` : "none", outlineOffset: 2 }}
            >
              {color === c && <Check size={14} className="text-white" />}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={inputStyle}>Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: color }}>
          {saving ? "Saving…" : existing ? "Save changes" : "Create cohort"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function CohortDetail({ cohortId, onBack }: { cohortId: Id<"cohorts">; onBack: () => void }) {
  const data = useQuery(api.cohorts.get, { cohortId });
  const staff = useQuery(api.users.listStaff);
  const unassigned = useQuery(api.cohorts.listUnassignedStudents);
  const addTeacher = useMutation(api.cohorts.addTeacher);
  const removeTeacher = useMutation(api.cohorts.removeTeacher);
  const addStudents = useMutation(api.cohorts.addStudents);
  const removeStudent = useMutation(api.cohorts.removeStudent);
  const update = useMutation(api.cohorts.update);
  const remove = useMutation(api.cohorts.remove);
  const { setCohortId } = useCohortScope();

  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState<Set<Id<"users">>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [release, setRelease] = useState<{ kind: "student" | "teacher"; id: Id<"users">; name: string } | null>(null);

  const teacherIds = useMemo(() => new Set(data?.teachers.map((t) => t._id) ?? []), [data]);

  if (data === undefined) {
    return <div className="card h-64 animate-pulse" style={{ background: "var(--surface-2)" }} />;
  }
  if (data === null) {
    return (
      <div className="card p-8 text-center">
        <p style={{ color: "var(--text-muted)" }}>This cohort no longer exists.</p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold" style={{ color: "#2563EB" }}>Back to cohorts</button>
      </div>
    );
  }

  const { cohort, students, teachers, pendingInvites } = data;
  const departures = data.departures ?? [];
  const progress = cohortWeek(cohort.startDate, cohort.endDate);
  const active = students.filter((s) => s.status !== "dropped");
  const dropped = students.filter((s) => s.status === "dropped");

  async function toggleTeacher(id: Id<"users">, name: string) {
    if (teacherIds.has(id)) {
      setRelease({ kind: "teacher", id, name });
      return;
    }
    try {
      await addTeacher({ cohortId, teacherId: id });
      toast.success(`${name} is now teaching this cohort`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update instructors");
    }
  }

  async function confirmRelease(reason: string) {
    if (!release) return;
    try {
      if (release.kind === "student") {
        await removeStudent({ cohortId, studentId: release.id, reason });
      } else {
        await removeTeacher({ cohortId, teacherId: release.id, reason });
      }
      toast.success(`Released ${release.name} from ${cohort.name}`);
      setRelease(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not release from cohort");
    }
  }

  async function addPicked() {
    if (picking.size === 0) return;
    try {
      const n = await addStudents({ cohortId, studentIds: [...picking] });
      toast.success(`Added ${n} student${n === 1 ? "" : "s"} to ${cohort.name}`);
      setPicking(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add students");
    }
  }

  async function setStatus(status: Status) {
    try {
      await update({ cohortId, status });
      toast.success(`Marked ${COHORT_STATUS_LABEL[status].toLowerCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  async function deleteCohort() {
    try {
      await remove({ cohortId });
      toast.success("Cohort deleted");
      setCohortId(undefined);
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80" style={{ color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> All cohorts
      </button>

      {/* Hero */}
      <div className="book-cover" style={{ ["--book-color" as string]: cohort.color }}>
        <div className="relative flex-1 p-6 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span className="w-14 h-14 rounded-lg flex items-center justify-center text-sm font-black text-white flex-shrink-0 shadow-md" style={{ background: cohort.color }}>
                <BookOpen size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-2xl font-bold truncate" style={{ color: "var(--text)" }}>{cohort.name}</h2>
                  <StatusPill status={cohort.status} />
                </div>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {formatCohortDate(cohort.startDate)}
                  {cohort.endDate ? ` – ${formatCohortDate(cohort.endDate)}` : ""}
                  {cohort.schedule ? ` · ${cohort.schedule}` : ""}
                </p>
                {cohort.description && <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--text)" }}>{cohort.description}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {cohort.meetingUrl && (
                <a href={cohort.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={inputStyle}>
                  <ExternalLink size={12} /> Class link
                </a>
              )}
              <button onClick={() => setEditing((e) => !e)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold" style={inputStyle}>
                <Pencil size={12} /> Edit
              </button>
            </div>
          </div>

          {cohort.status === "active" && progress.totalWeeks && (
            <div className="mt-5">
              <div className="flex justify-between text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                <span>Week {progress.week} of {progress.totalWeeks}</span>
                <span>{progress.pct}% through the program</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress.pct}%`, background: cohort.color }} />
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 sm:grid-cols-4 gap-3">
            <Stat label="Active students" value={active.length} />
            <Stat label="Instructors" value={teachers.length} />
            <Stat label="Invited" value={pendingInvites.length} />
            <Stat label="Avg days in a row" value={active.length ? Math.round(active.reduce((n, s) => n + (s.streak ?? 0), 0) / active.length) : 0} icon={<Flame size={12} style={{ color: "#F97316" }} />} />
          </div>
        </div>
      </div>

      {editing && <CohortForm existing={cohort} onClose={() => setEditing(false)} />}

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Roster */}
        <div className="space-y-8">
          <section>
            <SectionTitle icon={<Users size={16} />} title={`Roster · ${active.length}`} />
            {active.length === 0 ? (
              <p className="text-sm card p-5" style={{ color: "var(--text-muted)" }}>
                No students yet. Invite them below or move students who aren&apos;t in a cohort.
              </p>
            ) : (
              <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
                {active.map((s) => (
                  <div key={s._id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--border)" }}>
                    <Avatar name={s.name} imageUrl={s.imageUrl} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/teacher/students/${s._id}`} className="font-semibold text-sm truncate block hover:underline" style={{ color: "var(--text)" }}>{s.name}</Link>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.email} · joined {formatDate(s.memberSince)}</p>
                    </div>
                    <span className="hidden sm:flex items-center gap-1 text-xs" title="Days in a row they completed a lesson or turned in homework" style={{ color: "var(--text-muted)" }}>
                      <Flame size={11} style={{ color: "#F97316" }} /> {s.streak ?? 0}-day
                    </span>
                    <button
                      onClick={() => setRelease({ kind: "student", id: s._id, name: s.name })}
                      className="p-1.5 rounded-lg hover:opacity-70"
                      title="Release from cohort"
                    >
                      <UserMinus size={14} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {dropped.length > 0 && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                {dropped.length} dropped student{dropped.length === 1 ? "" : "s"} hidden. Reactivate from the Students tab.
              </p>
            )}
          </section>

          <section>
            <SectionTitle icon={<UserPlus size={16} />} title="Invite students to this cohort" />
            <InviteStudentPanel fixedCohortId={cohortId} compact />
          </section>

          {unassigned && unassigned.length > 0 && (
            <section>
              <SectionTitle icon={<Layers size={16} />} title={`Students without a cohort · ${unassigned.length}`} />
              <div className="card p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {unassigned.map((s) => {
                    const on = picking.has(s._id);
                    return (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => setPicking((prev) => { const n = new Set(prev); if (n.has(s._id)) n.delete(s._id); else n.add(s._id); return n; })}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left"
                        style={{ background: on ? `${cohort.color}15` : "var(--surface-2)", border: `1px solid ${on ? cohort.color : "var(--border)"}` }}
                      >
                        <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: on ? cohort.color : "var(--text-muted)" }}>
                          {on ? <Check size={12} /> : getInitials(s.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate" style={{ color: "var(--text)" }}>{s.name}</span>
                          <span className="block text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{s.email}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={addPicked} disabled={picking.size === 0} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: cohort.color }}>
                  Add {picking.size || ""} to {cohort.name}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="card p-4">
            <SectionTitle icon={<Shield size={15} />} title="Instructors" small />
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Instructors only see this cohort&apos;s students, homework and recordings.</p>
            {!staff ? (
              <div className="h-16 animate-pulse rounded-xl" style={{ background: "var(--surface-2)" }} />
            ) : (
              <div className="space-y-1.5">
                {staff.map((p) => {
                  const on = teacherIds.has(p._id);
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => toggleTeacher(p._id, p.name)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left"
                      style={{ background: on ? `${cohort.color}15` : "transparent", border: `1px solid ${on ? cohort.color : "var(--border)"}` }}
                    >
                      <Avatar name={p.name} imageUrl={p.imageUrl} size={7} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate" style={{ color: "var(--text)" }}>{p.name}</span>
                        <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>{p.role === "admin" ? "Admin · sees everything" : `Instructor · ${p.cohortCount} cohort${p.cohortCount === 1 ? "" : "s"}`}</span>
                      </span>
                      {on && <Check size={14} style={{ color: cohort.color }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card p-4">
            <SectionTitle icon={<Archive size={15} />} title="Lifecycle" small />
            <div className="flex flex-wrap gap-1.5">
              {(["upcoming", "active", "completed", "archived"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={cohort.status === s}
                  className={cn("px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:cursor-default")}
                  style={{ background: cohort.status === s ? `${STATUS_COLOR[s]}22` : "var(--surface-2)", color: cohort.status === s ? STATUS_COLOR[s] : "var(--text)", border: "1px solid var(--border)" }}
                >
                  {COHORT_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {departures.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <SectionTitle icon={<ScrollText size={15} />} title="Released from class" small />
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {departures.map((d) => (
                    <div key={d._id} className="rounded-lg px-2.5 py-2" style={{ background: "var(--surface-2)" }}>
                      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>
                        {d.name}{" "}
                        <span className="font-medium" style={{ color: "var(--text-muted)" }}>
                          · {d.role === "teacher" ? "instructor" : "student"}
                        </span>
                      </p>
                      <p className="text-[11px] italic mt-0.5" style={{ color: "var(--text)" }}>&ldquo;{d.reason}&rdquo;</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {formatDate(d.removedAt)} · {d.removedByName}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#EF4444" }}>
                  <Trash2 size={12} /> Delete cohort
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Removes the roster. Homework, recordings and events tagged to it become school-wide. Students keep their accounts.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={deleteCohort} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#EF4444" }}>Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={inputStyle}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {release && (
        <ReleaseDialog
          name={release.name}
          kind={release.kind}
          onCancel={() => setRelease(null)}
          onConfirm={confirmRelease}
        />
      )}
    </div>
  );
}

const STUDENT_RELEASE_REASONS = [
  "Withdrew from the program",
  "Transferred to another cohort",
  "Inactive / stopped attending",
  "Schedule conflict",
  "Other",
];

const TEACHER_RELEASE_REASONS = [
  "No longer teaching this cohort",
  "Transferred to another cohort",
  "Left the school",
  "Other",
];

function ReleaseDialog({
  name,
  kind,
  onCancel,
  onConfirm,
}: {
  name: string;
  kind: "student" | "teacher";
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const presets = kind === "teacher" ? TEACHER_RELEASE_REASONS : STUDENT_RELEASE_REASONS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) {
      toast.error("Add a short reason for the record.");
      return;
    }
    setSaving(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
      <form onSubmit={submit} className="card w-full max-w-md p-5 space-y-4">
        <div>
          <h3 className="font-serif text-lg font-bold" style={{ color: "var(--text)" }}>
            Release {name} from this class
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            They keep their account. This only removes them from the cohort roster, and stores your reason in the class record.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r === "Other" ? "" : r)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{
                background: reason === r ? "#EF444415" : "var(--surface-2)",
                color: reason === r ? "#EF4444" : "var(--text)",
                border: `1px solid ${reason === r ? "#EF444466" : "var(--border)"}`,
              }}
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          required
          minLength={3}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for release (required)"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={inputStyle}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-medium" style={inputStyle}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "#EF4444" }}>
            {saving ? "Releasing…" : "Release from cohort"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ icon, title, small }: { icon: React.ReactNode; title: string; small?: boolean }) {
  return (
    <h3 className={cn("font-bold flex items-center gap-2 mb-3", small ? "text-sm" : "text-base")} style={{ color: "var(--text)" }}>
      <span style={{ color: "#2563EB" }}>{icon}</span> {title}
    </h3>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
      <p className="text-lg font-black flex items-center gap-1" style={{ color: "var(--text)" }}>{icon}{value}</p>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

export function Avatar({ name, imageUrl, size = 9 }: { name: string; imageUrl?: string; size?: 7 | 9 | 10 }) {
  const cls = size === 7 ? "w-7 h-7 text-[10px]" : size === 10 ? "w-10 h-10 text-sm" : "w-9 h-9 text-xs";
  return (
    <span className={cn(cls, "rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 overflow-hidden")} style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
      {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover" /> : getInitials(name)}
    </span>
  );
}
