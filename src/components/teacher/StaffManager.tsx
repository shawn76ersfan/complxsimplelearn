"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import toast from "react-hot-toast";
import { Mail, Shield, ShieldCheck, UserCog } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getInitials } from "@/lib/utils";
import { useCohortScope } from "./CohortContext";

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
  const setRole = useMutation(api.users.setRole);
  const invite = useAction(api.invitations.inviteStudent);
  const { profile } = useCohortScope();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await invite({ email: email.trim(), displayName: name.trim() || undefined, role: "teacher" });
      toast.success(`Instructor invite sent to ${res.email}`);
      setEmail("");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite");
    } finally {
      setSending(false);
    }
  }

  async function changeRole(userId: Id<"users">, role: "admin" | "teacher" | "student") {
    try {
      await setRole({ userId, role });
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change role");
    }
  }

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <UserCog size={18} style={{ color: "#2563EB" }} /> Staff
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          <strong>Admins</strong> run the school: cohorts, curriculum, info sessions, Stark knowledge, dropping students.{" "}
          <strong>Instructors</strong> teach their assigned cohorts: roster, homework, grades, recordings, calendar, email.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
          {!staff ? (
            <div className="h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ) : (
            staff.map((p) => {
              const me = p._id === profile?._id;
              return (
                <div key={p._id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0" style={{ background: p.role === "admin" ? "linear-gradient(135deg, #111827, #2563EB)" : "linear-gradient(135deg, #2563EB, #F97316)" }}>
                    {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : getInitials(p.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                      {p.name}
                      {me && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>you</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {p.email}
                      {p.role === "teacher" && ` · ${p.cohortCount} cohort${p.cohortCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.role === "admin" ? <ShieldCheck size={14} style={{ color: "#2563EB" }} /> : <Shield size={14} style={{ color: "var(--text-muted)" }} />}
                    <select
                      value={p.role}
                      disabled={me}
                      onChange={(e) => changeRole(p._id, e.target.value as "admin" | "teacher" | "student")}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none disabled:opacity-60"
                      style={inputStyle}
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Instructor</option>
                      <option value="student">Student</option>
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleInvite} className="card p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <Mail size={14} style={{ color: "#2563EB" }} /> Invite an instructor
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              They&apos;ll get a sign-up link and land in the Teacher Hub. Assign them to a cohort afterwards.
            </p>
          </div>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="instructor@email.com" className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          <button type="submit" disabled={sending} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
            {sending ? "Sending…" : "Send instructor invite"}
          </button>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Emails in <code>ADMIN_EMAILS</code> / <code>TEACHER_EMAILS</code> are pinned to their role and don&apos;t need an invite.
          </p>
        </form>
      </div>
    </section>
  );
}
