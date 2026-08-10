"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { FeedbackInbox } from "@/components/teacher/FeedbackInbox";
import { MessageSquare } from "lucide-react";

export default function FeedbackPage() {
  const unread = useQuery(api.feedback.getUnreadCount);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>
              Messages from Cassandra
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Feedback, notices, and warnings from your instructor.
            </p>
          </div>
        </div>
        {!!unread && unread > 0 && (
          <p className="text-sm font-semibold mt-3" style={{ color: "#2563EB" }}>
            {unread} unread message{unread !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <FeedbackInbox />
    </div>
  );
}
