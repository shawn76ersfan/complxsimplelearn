"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import { useCohortScope } from "./CohortContext";
import { TrackIcon } from "@/lib/trackIcons";

export function TrackUnlockPanel() {
  const { cohortId, isAdmin, selected } = useCohortScope();
  const tracks = useQuery(api.trackReleases.listForHub, { cohortId });
  const setOpen = useMutation(api.trackReleases.setOpen);
  const [busy, setBusy] = useState<string | null>(null);

  const schoolWide = isAdmin && !cohortId;
  const needsCohort = !isAdmin && !cohortId;

  async function toggle(trackId: Id<"tracks">, open: boolean) {
    setBusy(String(trackId));
    try {
      await setOpen({
        trackId,
        open,
        cohortId: schoolWide ? undefined : cohortId,
      });
      toast.success(open ? "Track opened for students" : "Track closed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update track");
    } finally {
      setBusy(null);
    }
  }

  if (needsCohort) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Pick a cohort above, then open one learning track at a time so students cannot rush the whole catalog.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {schoolWide
          ? "Opening a track here releases it to every student in the program. Use a specific cohort in the switcher to pace one class at a time."
          : `Students in ${selected?.cohort.name ?? "this cohort"} only see tracks you open. Curriculum publish in CMS is separate — this is class pacing.`}
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
            const open = schoolWide ? track.schoolWideOpen : track.cohortOpen;
            const extra = !schoolWide && track.schoolWideOpen;
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
                    {open ? "Open for students" : "Closed"}
                    {extra ? " · also open program-wide" : ""}
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
