"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { BoardChat } from "@/components/board/BoardChat";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function BoardPage() {
  const boards = useQuery(api.board.myBoards);
  const [cohortId, setCohortId] = useState<Id<"cohorts"> | null>(null);

  useEffect(() => {
    if (!boards?.length) return;
    if (!cohortId || !boards.some((b) => b.cohortId === cohortId)) {
      setCohortId(boards[0]?.cohortId ?? null);
    }
  }, [boards, cohortId]);

  const selected = boards?.find((b) => b.cohortId === cohortId);

  if (boards === undefined) {
    return <div className="max-w-3xl mx-auto px-4 py-10"><div className="card h-80 animate-pulse" style={{ background: "var(--surface-2)" }} /></div>;
  }

  if (boards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <MessageSquare size={28} className="mx-auto mb-3 opacity-40" />
        <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>No Board yet</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          You&apos;ll see your class Board once you&apos;re seated in a cohort.
        </p>
        <Link href="/cohort" className="inline-block mt-4 text-sm font-semibold" style={{ color: "var(--primary)" }}>
          Back to My Class
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <p className="eyebrow mb-2">Class thread</p>
      <h1 className="font-serif text-3xl font-bold mb-2" style={{ color: "var(--text)" }}>The Board</h1>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        One live chat for your cohort — students and instructors. Updates, questions, links, and photos stay in this room.
      </p>

      {boards.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {boards.map((b) => (
            <button
              key={b.cohortId}
              type="button"
              onClick={() => setCohortId(b.cohortId)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{
                background: cohortId === b.cohortId ? b.color : "var(--surface-2)",
                color: cohortId === b.cohortId ? "#fff" : "var(--text)",
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <BoardChat cohortId={selected.cohortId} cohortName={selected.name} cohortColor={selected.color} />
      )}
    </div>
  );
}
