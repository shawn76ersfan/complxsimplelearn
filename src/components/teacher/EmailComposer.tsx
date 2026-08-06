"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Send, Users, Check, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Student {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
}

export function EmailComposer() {
  const students = useQuery(api.users.listStudents) as Student[] | undefined;
  const sendEmail = useAction(api.email.sendEmail);
  const sendTestEmail = useAction(api.email.sendTestEmail);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sent, setSent] = useState(false);

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }
    const recipientIds = sendToAll
      ? []
      : Array.from(selectedIds).map((id) => id as Id<"users">);

    if (!sendToAll && recipientIds.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    setSending(true);
    try {
      const result = await sendEmail({ subject: subject.trim(), body: body.trim(), recipientIds });
      toast.success(`Email sent to ${(result as { sent: number }).sent} student${(result as { sent: number }).sent !== 1 ? "s" : ""}!`);
      setSent(true);
      setSubject("");
      setBody("");
      setSelectedIds(new Set());
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      const result = await sendTestEmail({});
      toast.success(`Test sent to ${result.email} through ${result.provider}.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send test email.";
      toast.error(message);
    } finally {
      setSendingTest(false);
    }
  }

  const recipientCount = sendToAll ? (students?.length ?? 0) : selectedIds.size;

  return (
    <div className="space-y-6">
      {/* Recipient selector */}
      <div className="card p-5">
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setSendToAll(true)}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2")}
            style={{
              background: sendToAll ? "#2563EB" : "var(--surface-2)",
              color: sendToAll ? "white" : "var(--text)",
              border: `1px solid ${sendToAll ? "#2563EB" : "var(--border)"}`,
            }}
          >
            <Users size={14} /> All Students ({students?.length ?? 0})
          </button>
          <button
            onClick={() => setSendToAll(false)}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2")}
            style={{
              background: !sendToAll ? "#2563EB" : "var(--surface-2)",
              color: !sendToAll ? "white" : "var(--text)",
              border: `1px solid ${!sendToAll ? "#2563EB" : "var(--border)"}`,
            }}
          >
            <Mail size={14} /> Select Students
          </button>
        </div>

        {!sendToAll && (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {!students ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading students...</p>
            ) : students.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No students yet.</p>
            ) : (
              students.map((student) => {
                const isSelected = selectedIds.has(student._id);
                return (
                  <button
                    key={student._id}
                    onClick={() => toggleStudent(student._id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected ? "#2563EB15" : "var(--surface-2)",
                      border: `1px solid ${isSelected ? "#2563EB66" : "var(--border)"}`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-all"
                      style={{ background: isSelected ? "#2563EB" : "var(--surface)", color: isSelected ? "white" : "var(--text-muted)" }}
                    >
                      {isSelected ? <Check size={12} /> : student.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{student.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{student.email}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Email form */}
      <div className="card p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Subject</label>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              To: {recipientCount} {recipientCount === 1 ? "student" : "students"}
            </span>
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important: Quiz this Friday!"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message to students here..."
            rows={6}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-all font-[var(--font-sans)]"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: sent ? "#0EA5E9" : "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          {sent ? (
            <><Check size={16} /> Sent!</>
          ) : sending ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
          ) : (
            <><Send size={16} /> Send to {recipientCount} {recipientCount === 1 ? "Student" : "Students"}</>
          )}
        </button>
        <button
          onClick={handleSendTest}
          disabled={sendingTest}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          {sendingTest ? (
            <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Sending test...</>
          ) : (
            <><Mail size={15} /> Send test to my account</>
          )}
        </button>
      </div>
    </div>
  );
}
