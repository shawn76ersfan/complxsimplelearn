"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import toast from "react-hot-toast";
import { Mail, RefreshCw, UserPlus, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function InviteStudentPanel() {
  const pending = useQuery(api.enrollments.listPendingInvites);
  const inviteStudent = useAction(api.invitations.inviteStudent);
  const resendInvite = useAction(api.invitations.resendInvite);
  const revokeInvite = useAction(api.invitations.revokeInvite);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sending, setSending] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const result = await inviteStudent({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
      });
      toast.success(`Invitation sent to ${result.email}`);
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
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <UserPlus size={18} style={{ color: "#2563EB" }} />
            Invite a student
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Sends a Clerk invitation email. Only invited emails can create an account.
          </p>
        </div>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
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
            disabled={sending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <Mail size={14} />
            {sending ? "Sending…" : "Send invite"}
          </button>
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
            {pending.map((invite) => (
              <div
                key={invite._id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>
                    {invite.displayName ? `${invite.displayName} · ` : ""}
                    {invite.email}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Invited {formatDate(invite.invitedAt)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
