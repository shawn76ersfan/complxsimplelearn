"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowRight, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

export function FeedbackPreviewCard() {
  const feedback = useQuery(api.feedback.getMyFeedback);
  const unread = useQuery(api.feedback.getUnreadCount);

  const messages = feedback
    ? [...feedback].sort((a, b) => b.createdAt - a.createdAt)
    : undefined;
  const latest = messages?.[0];
  const unreadCount = unread ?? 0;

  function typeLabel(type?: string) {
    if (type === "warning") return "Warning";
    if (type === "notice") return "Notice";
    return "Feedback";
  }

  return (
    <Link
      href="/feedback"
      className="card p-5 block transition-all hover:scale-[1.01] group"
      style={{
        border:
          unreadCount > 0
            ? "1px solid rgba(37,99,235,0.45)"
            : "1px solid var(--border)",
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
          style={{ background: unreadCount > 0 ? "#2563EB18" : "var(--surface-2)" }}
        >
          <MessageSquare size={18} style={{ color: unreadCount > 0 ? "#2563EB" : "var(--text-muted)" }} />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h2 className="font-bold text-sm" style={{ color: "var(--text)" }}>
              Messages from Cassandra
            </h2>
            <span
              className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 group-hover:gap-1.5 transition-all"
              style={{ color: "#2563EB" }}
            >
              Open <ArrowRight size={12} />
            </span>
          </div>

          {!messages ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading messages…</p>
          ) : !latest ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No messages yet — feedback, notices, and warnings will show up here.
            </p>
          ) : (
            <>
              <p className="text-sm line-clamp-2" style={{ color: "var(--text)" }}>
                <span className="font-semibold">{typeLabel(latest.type)} · </span>
                {latest.message}
              </p>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                {latest.isRead ? "Latest" : "Unread"} · {formatDate(latest.createdAt)}
                {messages.length > 1 ? ` · ${messages.length} total` : ""}
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
