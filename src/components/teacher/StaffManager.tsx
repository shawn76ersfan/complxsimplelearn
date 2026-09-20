"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import toast from "react-hot-toast";
import { ArrowRightLeft, Mail, RefreshCw, Shield, ShieldCheck, UserCog, XCircle } from "lucide-react";
import { TransferMemberDialog } from "./TransferMemberDialog";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatDate, getInitials } from "@/lib/utils";
import { useCohortScope } from "./CohortContext";
import { CohortPicker } from "./CohortPicker";

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

/**
 * Admin-only: who runs the school. Admins see every cohort and all school-wide
 * settings; instructors only see the cohorts they're assigned to.
 */
export function StaffManager() {
  const staff = useQuery(api.users.listStaff);
  const pending = useQuery(api.enrollments.listPendingInvites, {});
  const setRole = useMutation(api.users.setRole);
  const invite = useAction(api.invitations.inviteStudent);
  const resendInvite = useAction(api.invitations.resendInvite);
  const revokeInvite = useAction(api.invitations.revokeInvite);
  const { profile, cohorts } = useCohortScope();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [cohortId, setCohortId] = useState<Id<"cohorts"> | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [pendingRole, setPendingRole] = useState<{
    userId: Id<"users">;
    name: string;
    from: "admin" | "teacher" | "student";
    to: "admin" | "teacher" | "student";
  } | null>(null);
  const [seatCohortId, setSeatCohortId] = useState<Id<"cohorts"> | undefined>(undefined);
  const [savingRole, setSavingRole] = useState(false);
  const [transfer, setTransfer] = useState<{
    userId: Id<"users">;
    name: string;
    fromCohortId: Id<"cohorts">;
  } | null>(null);

  const teacherInvites = (pending ?? []).filter((i) => i.role === "teacher");
  const cohortName = (id: Id<"cohorts"> | undefined) => cohorts?.find((c) => c.cohort._id === id)?.cohort;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await invite({
        email: email.trim(),
        displayName: name.trim() || undefined,
        role: "teacher",
        cohortId,
      });
      const target = cohortName(cohortId);
      if (res.alreadyInCohort) {
        toast.success(`${res.email} is already teaching${target ? ` ${target.name}` : ""}`);
      } else if (res.alreadyHadAccount) {
        toast.success(
          target
            ? `Added ${res.email} to ${target.name}. They already had an instructor account.`
            : `${res.email} already has an instructor account. Assign them to a cohort below.`,
        );
      } else {
        toast.success(`Instructor invite sent to ${res.email}${target ? ` · ${target.name}` : ""}`);
      }
      setEmail("");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setSending(false);
    }
  }

  function startRoleChange(
    person: { _id: Id<"users">; name: string; role: "admin" | "teacher" | "student" },
    next: "admin" | "teacher" | "student",
  ) {
    if (person.role === next) return;
    setPendingRole({ userId: person._id, name: person.name, from: person.role, to: next });
    setSeatCohortId(undefined);
  }

  async function confirmRole() {
    if (!pendingRole) return;
    const needsSeat = pendingRole.to !== "admin";
    if (needsSeat && !seatCohortId) {
      toast.error(pendingRole.to === "student" ? "Pick the cohort they should sit in" : "Pick the cohort they'll teach");
      return;
    }
    setSavingRole(true);
    try {
      await setRole({
        userId: pendingRole.userId,
        role: pendingRole.to,
        cohortId: needsSeat ? seatCohortId : undefined,
      });
      const dest = cohortName(seatCohortId);
      toast.success(
        dest
          ? `${pendingRole.name} is now ${pendingRole.to === "admin" ? "an admin" : pendingRole.to === "teacher" ? "an instructor" : "a student"} · ${dest.name}`
          : `${pendingRole.name}'s role is updated`,
      );
      setPendingRole(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change role");
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <UserCog size={18} style={{ color: "#2563EB" }} /> Staff
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Invite a new instructor here — they get a sign-up email and land in the Teacher Hub.
          If they already have an account, they&apos;re added immediately. Then assign them to a cohort.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {!staff ? (
            <div className="h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ) : (
            staff.map((p) => {
              const me = p._id === profile?._id;
              const editing = pendingRole?.userId === p._id;
              return (
                <div key={p._id} className="px-4 py-3 space-y-2.5" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0" style={{ background: p.role === "admin" ? "linear-gradient(135deg, #111827, #2563EB)" : "linear-gradient(135deg, #2563EB, #F97316)" }}>
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : getInitials(p.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                        {p.name}
                        {me && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>you</span>}
                        {p.role === "admin" ? <ShieldCheck size={13} style={{ color: "#2563EB" }} /> : <Shield size={13} style={{ color: "var(--text-muted)" }} />}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{p.email}</p>
                      {p.cohorts.length > 0 && (
                        <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                          {p.cohorts.map((c) => c.name).join(" · ")}
                        </p>
                      )}
                    </div>
                    {p.cohorts[0] && !me && (
                      <button
                        type="button"
                        title="Transfer to another cohort"
                        onClick={() => setTransfer({ userId: p._id, name: p.name, fromCohortId: p.cohorts[0]!._id })}
                        className="p-1.5 rounded-lg hover:opacity-70"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(["admin", "teacher", "student"] as const).map((role) => {
                      const active = p.role === role;
                      const label = role === "admin" ? "Admin" : role === "teacher" ? "Instructor" : "Student";
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={me}
                          onClick={() => startRoleChange(p, role)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold disabled:opacity-50"
                          style={{
                            background: active ? "#2563EB" : "var(--surface-2)",
                            color: active ? "#fff" : "var(--text)",
                            border: `1px solid ${active ? "#2563EB" : "var(--border)"}`,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {editing && (
                    <div className="rounded-xl p-3 space-y-2.5" style={{ background: "var(--surface-2)" }}>
                      <p className="text-xs" style={{ color: "var(--text)" }}>
                        {pendingRole.to === "admin" && `Make ${p.name} an admin. They keep any classes they already teach.`}
                        {pendingRole.to === "teacher" && `Make ${p.name} an instructor and seat them on a class.`}
                        {pendingRole.to === "student" && `Make ${p.name} a student. They leave the Teacher Hub and join a roster.`}
                      </p>
                      {pendingRole.to !== "admin" && (
                        <CohortPicker
                          value={seatCohortId}
                          onChange={setSeatCohortId}
                          label={pendingRole.to === "student" ? "Student roster" : "They'll teach"}
                          allowSchoolWide={false}
                          required
                        />
                      )}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setPendingRole(null)} className="flex-1 py-1.5 rounded-lg text-xs font-medium" style={inputStyle}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingRole}
                          onClick={() => void confirmRole()}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40"
                          style={{ background: "#2563EB" }}
                        >
                          {savingRole ? "Saving…" : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <form onSubmit={handleInvite} className="card p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                <Mail size={14} style={{ color: "#2563EB" }} /> Invite an instructor
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                New instructors get a sign-up link. Existing accounts skip the email and can be dropped straight into a cohort.
              </p>
            </div>
            <CohortPicker
              value={cohortId}
              onChange={setCohortId}
              label="Assign to cohort"
              schoolWideLabel="No cohort yet (assign later)"
            />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="instructor@email.com" className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <button type="submit" disabled={sending} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
              {sending ? "Sending…" : "Send instructor invite"}
            </button>
          </form>

          {teacherInvites.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Pending instructor invites
              </h3>
              <div className="space-y-2">
                {teacherInvites.map((inviteRow) => {
                  const c = cohortName(inviteRow.cohortId);
                  return (
                    <div key={inviteRow._id} className="card p-3">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
                        {inviteRow.displayName ? `${inviteRow.displayName} · ` : ""}
                        {inviteRow.email}
                      </p>
                      <p className="text-[11px] mb-2" style={{ color: "var(--text-muted)" }}>
                        Invited {formatDate(inviteRow.invitedAt)}
                        {c ? ` · ${c.name}` : " · no cohort yet"}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => resendInvite({ enrollmentId: inviteRow._id }).then((r) => toast.success(`Resent to ${r.email}`)).catch((e) => toast.error(e instanceof Error ? e.message : "Could not resend"))}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                          style={inputStyle}
                        >
                          <RefreshCw size={11} /> Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite({ enrollmentId: inviteRow._id }).then(() => toast.success("Invite revoked")).catch((e) => toast.error(e instanceof Error ? e.message : "Could not revoke"))}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                          style={{ background: "#EF444415", color: "#EF4444" }}
                        >
                          <XCircle size={11} /> Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {transfer && (
        <TransferMemberDialog
          userId={transfer.userId}
          name={transfer.name}
          fromCohortId={transfer.fromCohortId}
          role="teacher"
          onClose={() => setTransfer(null)}
        />
      )}
    </section>
  );
}
