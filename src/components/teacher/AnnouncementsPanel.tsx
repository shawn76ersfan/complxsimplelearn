"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import toast from "react-hot-toast";
import { Megaphone, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getInitials, timeAgo } from "@/lib/utils";
import { useCohortScope } from "./CohortContext";
import { CohortPicker } from "./CohortPicker";

const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
} as const;

export function AnnouncementsPanel() {
  const { cohortId: scopeCohortId, isAdmin, cohorts } = useCohortScope();
  const list = useQuery(api.announcements.list, { cohortId: scopeCohortId });
  const post = useMutation(api.announcements.post);
  const setPinned = useMutation(api.announcements.setPinned);
  const remove = useMutation(api.announcements.remove);

  // The "Post to" field follows the header switcher until the author picks
  // something else; switching cohorts in the header resets it again.
  const [override, setOverride] = useState<{ base: Id<"cohorts"> | undefined; id: Id<"cohorts"> | undefined } | null>(null);
  const target = override && override.base === scopeCohortId ? override.id : scopeCohortId;
  const setTarget = (id: Id<"cohorts"> | undefined) => setOverride({ base: scopeCohortId, id });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPin] = useState(false);
  const [emailStudents, setEmailStudents] = useState(false);
  const [posting, setPosting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const targetCohort = cohorts?.find((c) => c.cohort._id === target)?.cohort;
  const audience = target
    ? `${cohorts?.find((c) => c.cohort._id === target)?.activeStudentCount ?? 0} students in ${targetCohort?.name}`
    : isAdmin
      ? "every student"
      : "—";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin && !target) {
      toast.error("Pick a cohort to post to.");
      return;
    }
    setPosting(true);
    try {
      await post({ cohortId: target, title, body, pinned, emailStudents });
      toast.success(`Posted to ${audience}`);
      setTitle("");
      setBody("");
      setPin(false);
      setEmailStudents(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
      <form onSubmit={submit} className="card p-5 space-y-4 lg:sticky lg:top-20">
        <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Megaphone size={16} style={{ color: "#F97316" }} /> New announcement
        </h3>
        <CohortPicker value={target} onChange={setTarget} label="Post to" schoolWideLabel="Whole school" required />
        <input required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. No class Thursday" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-semibold" style={inputStyle} />
        <textarea required minLength={2} rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do students need to know?" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
        <div className="flex flex-col gap-2 text-sm" style={{ color: "var(--text)" }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pinned} onChange={(e) => setPin(e.target.checked)} className="accent-[#2563EB]" />
            Pin to the top of the feed
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={emailStudents} onChange={(e) => setEmailStudents(e.target.checked)} className="accent-[#2563EB]" />
            Also email students (otherwise in-app only)
          </label>
        </div>
        <button type="submit" disabled={posting} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: targetCohort?.color ?? "linear-gradient(135deg, #2563EB, #F97316)" }}>
          <Send size={14} /> {posting ? "Posting…" : `Post to ${audience}`}
        </button>
      </form>

      <div className="space-y-3">
        {!list ? (
          [1, 2].map((i) => <div key={i} className="card h-24 animate-pulse" style={{ background: "var(--surface-2)" }} />)
        ) : list.length === 0 ? (
          <div className="card p-10 text-center">
            <Megaphone size={32} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing posted yet. Announcements show up on students&apos; dashboards and in their notification bell.
            </p>
          </div>
        ) : (
          list.map((a) => (
            <article key={a._id} className="card p-4" style={{ borderLeft: `4px solid ${a.cohortColor ?? "#2563EB"}` }}>
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
                  {a.author.imageUrl ? <img src={a.author.imageUrl} alt="" className="w-full h-full object-cover" /> : getInitials(a.author.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.pinned && <Pin size={12} style={{ color: "#F97316" }} />}
                    <h4 className="font-bold text-sm" style={{ color: "var(--text)" }}>{a.title}</h4>
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${a.cohortColor ?? "#2563EB"}18`, color: a.cohortColor ?? "#2563EB" }}>
                      {a.cohortName ?? "Whole school"}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--text)" }}>{a.body}</p>
                  <p className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                    {a.author.name} · {timeAgo(a.createdAt, now)}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setPinned({ announcementId: a._id, pinned: !a.pinned }).catch((e) => toast.error(e.message))} className="p-1.5 rounded-lg hover:opacity-70" title={a.pinned ? "Unpin" : "Pin"}>
                    {a.pinned ? <PinOff size={14} style={{ color: "var(--text-muted)" }} /> : <Pin size={14} style={{ color: "var(--text-muted)" }} />}
                  </button>
                  {a.canDelete && (
                    <button onClick={() => remove({ announcementId: a._id }).then(() => toast.success("Deleted")).catch((e) => toast.error(e.message))} className="p-1.5 rounded-lg hover:opacity-70" title="Delete">
                      <Trash2 size={14} style={{ color: "#EF4444" }} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
