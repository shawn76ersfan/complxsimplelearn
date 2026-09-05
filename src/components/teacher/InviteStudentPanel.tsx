"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import { Mail, RefreshCw, UserPlus, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useCohortScope } from "./CohortContext";
import { CohortPicker } from "./CohortPicker";

/**
 * Invite students. When `fixedCohortId` is set (cohort detail page) the invite
 * is pinned to that cohort; otherwise it defaults to the hub's current cohort.
 * Teachers must pick one of their cohorts; admins may invite school-wide.
 */
export function InviteStudentPanel({
  fixedCohortId,
  compact,
}: {
  fixedCohortId?: Id<"cohorts">;
  compact?: boolean;
}) {
  const { cohortId: scopeCohortId, cohorts, isAdmin } = useCohortScope();
  // Follows the pinned/header cohort until the inviter picks another; a header
  // switch resets the choice.
  const base = fixedCohortId ?? scopeCohortId;
  const [override, setOverride] = useState<{ base: Id<"cohorts"> | undefined; id: Id<"cohorts"> | undefined } | null>(null);
  const cohortId = fixedCohortId ?? (override && override.base === base ? override.id : base);
  const setCohortId = (id: Id<"cohorts"> | undefined) => setOverride({ base, id });

  const pending = useQuery(api.enrollments.listPendingInvites, { cohortId: fixedCohortId ?? scopeCohortId });
  const inviteStudent = useAction(api.invitations.inviteStudent);
  const resendInvite = useAction(api.invitations.resendInvite);
  const revokeInvite = useAction(api.invitations.revokeInvite);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sending, setSending] = useState(false);

  const cohortName = (id: Id<"cohorts"> | undefined) => cohorts?.find((c) => c.cohort._id === id)?.cohort;
  const needsCohort = !isAdmin && !cohortId;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (needsCohort) {
      toast.error("Pick a cohort to invite this student into.");
      return;
    }
    setSending(true);
    try {
      const result = await inviteStudent({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        cohortId,
      });
      const target = cohortName(cohortId);
      toast.success(`Invitation sent to ${result.email}${target ? ` · ${target.name}` : ""}`);
      setEmail("");
      setDisplayName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invitation");
    } finally {
      setSending(false);
    }
  }

  async function handleResend(enrollmentId: Id<"enrollments">) {
    try {
      const result = await resendInvite({ enrollmentId });
      toast.success(`Invitation resent to ${result.email}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend invitation");
    }
  }

  async function handleRevoke(enrollmentId: Id<"enrollments">) {
    try {
      await revokeInvite({ enrollmentId });
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke invitation");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        {!compact && (
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <UserPlus size={18} style={{ color: "#2563EB" }} />
              Invite a student
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Sends a sign-up email. The student lands in the chosen cohort the moment they finish creating their account.
            </p>
          </div>
        )}
        <form onSubmit={handleInvite} className="space-y-3">
          {!fixedCohortId && (
            <CohortPicker
              value={cohortId}
              onChange={setCohortId}
              label="Invite into"
              schoolWideLabel="No cohort yet (assign later)"
              required
            />
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@email.com"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Name (optional)"
              className="sm:w-44 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
            <button
              type="submit"
              disabled={sending || needsCohort}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: cohortName(cohortId)?.color ?? "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              <Mail size={14} />
              {sending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
          Pending invitations
        </h3>
        {!pending ? (
          <div className="card h-16 animate-pulse" style={{ background: "var(--surface-2)" }} />
        ) : pending.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No pending invitations.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((invite) => {
              const c = cohortName(invite.cohortId);
              return (
                <div
                  key={invite._id}
                  className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-2" style={{ color: "var(--text)" }}>
                      {invite.displayName ? `${invite.displayName} · ` : ""}
                      {invite.email}
                      {invite.role === "teacher" && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: "#2563EB15", color: "#2563EB" }}>instructor</span>
                      )}
                    </p>
                    <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      Invited {formatDate(invite.invitedAt)}
                      {c && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.name}
                          </span>
                        </>
                      )}
                      {!c && invite.role !== "teacher" && <span>· no cohort</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResend(invite._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <RefreshCw size={12} /> Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRevoke(invite._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                      style={{ background: "#EF444415", color: "#EF4444", border: "1px solid #EF444433" }}
                    >
                      <XCircle size={12} /> Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
