"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Bell, CheckCheck } from "lucide-react";
import { NotificationGlyph, notificationAccent } from "@/components/notifications/NotificationGlyph";
import { timeAgo } from "@/lib/utils";

const PREVIEW_LIMIT = 8;

export function NotificationBell() {
  const router = useRouter();
  const unread = useQuery(api.notifications.unreadCount) ?? 0;
  const items = useQuery(api.notifications.listMine, { limit: PREVIEW_LIMIT });
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(id: Id<"notifications">, href?: string, isRead?: boolean) {
    if (!isRead) void markRead({ notificationId: id });
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: open ? "var(--surface-2)" : "transparent",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold leading-none flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#fff", fontVariantNumeric: "tabular-nums" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden shadow-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>
                Notifications
              </span>
              {unread > 0 && (
                <span className="text-[11px] font-semibold" style={{ color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items === undefined ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={22} className="mx-auto mb-2 opacity-25" />
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>You&apos;re all caught up</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  New assignments, grades, recordings, and events land here.
                </p>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const accent = notificationAccent(n.type);
                  return (
                    <li key={n._id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <button
                        type="button"
                        onClick={() => openItem(n._id, n.href, n.isRead)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <span className="mt-0.5 relative flex-shrink-0">
                          <NotificationGlyph type={n.type} size={16} />
                          {!n.isRead && (
                            <span
                              className="absolute -top-1 -left-1 w-2 h-2 rounded-full"
                              style={{ background: accent }}
                            />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span
                            className="block text-sm leading-snug truncate"
                            style={{ color: "var(--text)", fontWeight: n.isRead ? 500 : 700 }}
                          >
                            {n.title}
                          </span>
                          {n.body && (
                            <span className="block text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                              {n.body}
                            </span>
                          )}
                        </span>
                        <span
                          className="text-[11px] flex-shrink-0 mt-0.5"
                          style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}
                        >
                          {timeAgo(n.createdAt)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-semibold py-3 hover:opacity-80 transition-opacity"
            style={{ color: "var(--primary)", background: "var(--surface-2)" }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
