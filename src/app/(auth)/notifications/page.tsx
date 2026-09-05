"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Bell, CheckCheck, Trash2, Mail, MailX, ArrowUpRight } from "lucide-react";
import {
  NotificationGlyph,
  notificationAccent,
  notificationLabel,
} from "@/components/notifications/NotificationGlyph";
import { timeAgo, formatDate } from "@/lib/utils";

type Filter = "all" | "unread";

function dayBucket(ts: number, now: number): string {
  const d = new Date(ts);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return "Today";
  if (ts >= startOfToday - 86400000) return "Yesterday";
  if (ts >= startOfToday - 6 * 86400000) return "This week";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

export default function NotificationsPage() {
  const items = useQuery(api.notifications.listMine, { limit: 200 });
  const unread = useQuery(api.notifications.unreadCount) ?? 0;
  const emailOn = useQuery(api.notifications.getEmailPreference);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const remove = useMutation(api.notifications.remove);
  const setEmailPreference = useMutation(api.notifications.setEmailPreference);
  const [filter, setFilter] = useState<Filter>("all");

  // Clock for relative timestamps; ticks once a minute so "5m" ages naturally.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const visible = (items ?? []).filter((n) => (filter === "unread" ? !n.isRead : true));

  const groups: Array<{ label: string; rows: typeof visible }> = [];
  for (const n of visible) {
    const label = dayBucket(n.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(n);
    else groups.push({ label, rows: [n] });
  }

  async function handleOpen(id: Id<"notifications">, isRead: boolean) {
    if (!isRead) await markRead({ notificationId: id });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: "var(--text-muted)" }}>
            Activity
          </p>
          <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: "var(--text)" }}>
            Notifications
            {unread > 0 && (
              <span
                className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "var(--accent)", color: "#fff", fontVariantNumeric: "tabular-nums" }}
              >
                {unread}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            {(["all", "unread"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-[10px] text-xs font-semibold capitalize transition-colors"
                style={{
                  background: filter === f ? "var(--surface)" : "transparent",
                  color: filter === f ? "var(--text)" : "var(--text-muted)",
                  boxShadow: filter === f ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Email preference strip */}
      <div
        className="card px-4 py-3 mb-6 flex items-center justify-between gap-4"
        style={{ borderRadius: 12 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {emailOn === false ? (
            <MailX size={16} style={{ color: "var(--text-muted)" }} />
          ) : (
            <Mail size={16} style={{ color: "var(--primary)" }} />
          )}
          <p className="text-sm truncate" style={{ color: "var(--text)" }}>
            Email copies are{" "}
            <strong>{emailOn === false ? "off" : "on"}</strong>
            <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>
              {" "}· assignments, grades, and recordings also go to your inbox
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={emailOn === undefined}
          onClick={() => void setEmailPreference({ enabled: emailOn === false })}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          Turn {emailOn === false ? "on" : "off"}
        </button>
      </div>

      {items === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-16 animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={28} className="mx-auto mb-3 opacity-25" />
          <p className="font-semibold" style={{ color: "var(--text)" }}>
            {filter === "unread" ? "Nothing unread" : "No notifications yet"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            New assignments, grades, class recordings, and calendar events show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2
                className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2 px-1"
                style={{ color: "var(--text-muted)" }}
              >
                {group.label}
              </h2>
              <div className="card overflow-hidden" style={{ borderRadius: 14 }}>
                {group.rows.map((n, idx) => {
                  const accent = notificationAccent(n.type);
                  const inner = (
                    <div className="flex items-start gap-3 px-4 py-3.5">
                      <span className="relative flex-shrink-0 mt-0.5">
                        <NotificationGlyph type={n.type} size={16} />
                        {!n.isRead && (
                          <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full" style={{ background: accent }} />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                            {notificationLabel(n.type)}
                          </span>
                          <span className="text-[11px]" style={{ color: "var(--text-muted)" }} title={formatDate(n.createdAt)}>
                            {timeAgo(n.createdAt, now)}
                          </span>
                        </div>
                        <p
                          className="text-sm leading-snug"
                          style={{ color: "var(--text)", fontWeight: n.isRead ? 500 : 700 }}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {n.body}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {n.href && <ArrowUpRight size={14} style={{ color: "var(--text-muted)" }} />}
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void remove({ notificationId: n._id });
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                  const rowStyle = {
                    borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                    background: n.isRead ? "transparent" : `${accent}08`,
                  } as const;
                  return n.href ? (
                    <Link
                      key={n._id}
                      href={n.href}
                      onClick={() => void handleOpen(n._id, n.isRead)}
                      className="block transition-colors hover:bg-[var(--surface-2)]"
                      style={rowStyle}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      key={n._id}
                      onClick={() => void handleOpen(n._id, n.isRead)}
                      className="cursor-default"
                      style={rowStyle}
                    >
                      {inner}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
