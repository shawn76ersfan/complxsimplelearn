"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import { useCohortScope } from "./CohortContext";
import { TrackIcon } from "@/lib/trackIcons";

export function TrackUnlockPanel() {
  const { cohortId, selected } = useCohortScope();
  const tracks = useQuery(api.trackReleases.listForHub, { cohortId });
  const setOpen = useMutation(api.trackReleases.setOpen);
  const confine = useMutation(api.trackReleases.confineSchoolWideOpens);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void confine().catch(() => undefined);
  }, [confine]);

  async function toggle(trackId: Id<"tracks">, open: boolean) {
    if (!cohortId) return;
    setBusy(String(trackId));
    try {
      await setOpen({ trackId, open, cohortId });
      toast.success(open ? "Track opened for this cohort" : "Track closed for this cohort");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update track");
    } finally {
      setBusy(null);
    }
  }

  if (!cohortId) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Pick a cohort above, then open tracks for that class only. Upcoming cohorts will not see this class&apos;s quizzes or tests.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Students in {selected?.cohort.name ?? "this cohort"} only see tracks you open here — including quizzes and Mandatory Work.
        Curriculum publish in CMS is separate; this is class pacing.
      </p>

      {!tracks ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-16 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No published tracks yet. Publish them in Curriculum first.</p>
      ) : (
        <div className="card overflow-hidden">
          {tracks.map((track, i) => {
            const open = track.cohortOpen;
            return (
              <div
                key={track._id}
                className="flex items-center gap-4 px-5 py-4"
                style={{ borderBottom: i < tracks.length - 1 ? "1px solid var(--border)" : undefined }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${track.color}1a`, border: `1px solid ${track.color}44` }}
                >
                  <TrackIcon slug={track.slug} icon={track.icon} size={18} style={{ color: track.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: "var(--text)" }}>{track.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {open ? "Open for this cohort" : "Closed for this cohort"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === String(track._id)}
                  onClick={() => void toggle(track._id, !open)}
                  className="btn-paper btn-sm"
                >
                  {open ? <Lock size={14} /> : <Unlock size={14} />}
                  {open ? "Close" : "Open"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
