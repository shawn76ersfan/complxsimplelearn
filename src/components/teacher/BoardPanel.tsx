"use client";

import { BoardChat } from "@/components/board/BoardChat";
import { useCohortScope } from "./CohortContext";
import { MessageSquare } from "lucide-react";

export function BoardPanel() {
  const { cohortId, selected } = useCohortScope();

  if (!cohortId || !selected) {
    return (
      <div className="card p-8 text-center">
        <MessageSquare className="mx-auto mb-3 opacity-40" />
        <p className="font-semibold" style={{ color: "var(--text)" }}>Pick a cohort</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Each cohort has its own Board. Students in other classes cannot see this thread.
        </p>
      </div>
    );
  }

  return (
    <BoardChat
      cohortId={cohortId}
      cohortName={selected.cohort.name}
      cohortColor={selected.cohort.color}
    />
  );
}
