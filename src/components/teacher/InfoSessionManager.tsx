"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, Check, Edit3, Eye, EyeOff, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ManagedSession = {
  _id: Id<"infoSessions">;
  title: string;
  description?: string;
  startsAt: number;
  timezone: string;
  meetingUrl?: string;
  published: boolean;
  registrationCount: number;
};

function toLocalInput(timestamp: number): string {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function formatSessionDate(session: ManagedSession): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: session.timezone,
  }).format(session.startsAt);
}

export function InfoSessionManager() {
  const sessions = useQuery(api.infoSessions.listForTeacher) as
    | ManagedSession[]
    | undefined;
  const createSession = useMutation(api.infoSessions.create);
  const updateSession = useMutation(api.infoSessions.update);
  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  const [editingId, setEditingId] = useState<Id<"infoSessions"> | null>(null);
  const [title, setTitle] = useState("ComplxSimple Training Info Session");
  const [description, setDescription] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEditingId(null);
    setTitle("ComplxSimple Training Info Session");
    setDescription("");
    setStartsLocal("");
    setMeetingUrl("");
    setPublished(true);
  }

  function editSession(session: ManagedSession) {
    setEditingId(session._id);
    setTitle(session.title);
    setDescription(session.description ?? "");
    setStartsLocal(toLocalInput(session.startsAt));
    setMeetingUrl(session.meetingUrl ?? "");
    setPublished(session.published);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSession() {
    const startsAt = new Date(startsLocal).getTime();
    if (!title.trim() || !Number.isFinite(startsAt)) {
      toast.error("Add a title, date, and time.");
      return;
    }
    setSaving(true);
    try {
      const values = {
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt,
        timezone: browserTimezone,
        meetingUrl: meetingUrl.trim() || undefined,
        published,
      };
      if (editingId) {
        await updateSession({ id: editingId, ...values });
        toast.success("Info session updated.");
      } else {
        await createSession(values);
        toast.success("Info session created.");
      }
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save info session.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(session: ManagedSession) {
    try {
      await updateSession({
        id: session._id,
        title: session.title,
        description: session.description,
        startsAt: session.startsAt,
        timezone: session.timezone,
        meetingUrl: session.meetingUrl,
        published: !session.published,
      });
      toast.success(session.published ? "Session hidden." : "Session published.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update session.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <div>
          <h3 className="font-bold" style={{ color: "var(--text)" }}>
            {editingId ? "Edit info session" : "Create an info session"}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Times are entered in {browserTimezone}. Registrants receive a
            confirmation and a reminder 30 minutes before the session.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
          <label className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Date and time
            <input
              type="datetime-local"
              value={startsLocal}
              onChange={(event) => setStartsLocal(event.target.value)}
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </label>
        </div>
        <label className="block text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1.5 w-full px-4 py-2.5 rounded-xl outline-none resize-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </label>
        <label className="block text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          Meeting URL
          <input
            type="url"
            value={meetingUrl}
            onChange={(event) => setMeetingUrl(event.target.value)}
            placeholder="https://zoom.us/j/..."
            className="mt-1.5 w-full px-4 py-2.5 rounded-xl outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
          />
          Show this date on the public homepage
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={saveSession}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Create session"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {!sessions ? (
          <div className="card h-28 animate-pulse" />
        ) : sessions.length === 0 ? (
          <div className="card p-8 text-center">
            <CalendarDays size={30} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No info sessions have been created yet.
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session._id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#2563EB15", color: "#2563EB" }}>
                <CalendarDays size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold" style={{ color: "var(--text)" }}>{session.title}</h4>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full" style={{ background: session.published ? "#16A34A15" : "#6B728015", color: session.published ? "#16A34A" : "#6B7280" }}>
                    {session.published ? "Published" : "Hidden"}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{formatSessionDate(session)}</p>
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Users size={12} /> {session.registrationCount} registered
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editSession(session)}
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  aria-label="Edit info session"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => togglePublished(session)}
                  className="p-2.5 rounded-xl"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  aria-label={session.published ? "Hide info session" : "Publish info session"}
                >
                  {session.published ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                {session.published && <Check size={18} style={{ color: "#16A34A" }} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
