"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import toast from "react-hot-toast";
import { ArrowRightLeft, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { CohortSummary } from "./CohortContext";

export function TransferMemberDialog({
  userId,
  name,
  fromCohortId,
  role,
  onClose,
}: {
  userId: Id<"users">;
  name: string;
  fromCohortId: Id<"cohorts">;
  role: "student" | "teacher";
  onClose: () => void;
}) {
  const transfer = useMutation(api.cohorts.transferMember);
  const cohorts = useQuery(api.cohorts.list, {}) as CohortSummary[] | undefined;
  const options = (cohorts ?? []).filter(
    (c) => c.cohort.status !== "archived" && c.cohort._id !== fromCohortId,
  );
  const from = cohorts?.find((c) => c.cohort._id === fromCohortId)?.cohort;
  const [toCohortId, setToCohortId] = useState<Id<"cohorts"> | "">(options[0]?.cohort._id ?? "");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!toCohortId) {
      toast.error("Pick a destination cohort");
      return;
    }
    setSaving(true);
    try {
      await transfer({
        userId,
        fromCohortId,
        toCohortId,
        role,
      });
      const dest = options.find((c) => c.cohort._id === toCohortId)?.cohort.name;
      toast.success(dest ? `Moved ${name} to ${dest}` : `Moved ${name}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not transfer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15, 23, 42, 0.45)" }}>
      <div className="card w-full max-w-md p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              Transfer {role === "teacher" ? "instructor" : "student"}
            </p>
            <h3 className="font-serif text-xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Leave {from?.name ?? "this class"} and join another cohort. Homework, the Board, and open tracks follow the new class.
        </p>
        {options.length === 0 ? (
          <p className="text-sm" style={{ color: "#EF4444" }}>There isn&apos;t another cohort to move them into yet.</p>
        ) : (
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Move to</span>
            <select
              value={toCohortId}
              onChange={(e) => setToCohortId(e.target.value as Id<"cohorts">)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {options.map((c) => (
                <option key={c.cohort._id} value={c.cohort._id}>
                  {c.cohort.code ? `${c.cohort.code} · ` : ""}
                  {c.cohort.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text)" }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || options.length === 0}
            onClick={() => void confirm()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <ArrowRightLeft size={14} />
            {saving ? "Moving…" : "Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
