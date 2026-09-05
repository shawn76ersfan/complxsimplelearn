"use client";

import { BookMarked, Calendar, ClipboardCheck, Clock, Inbox, Megaphone, Video } from "lucide-react";

export type NotificationType =
  | "assignment_posted"
  | "assignment_due_soon"
  | "submission_graded"
  | "submission_received"
  | "video_posted"
  | "calendar_event"
  | "announcement";

const META: Record<NotificationType, { icon: React.ElementType; accent: string; label: string }> = {
  assignment_posted:   { icon: BookMarked,     accent: "#2563EB", label: "Assignment" },
  assignment_due_soon: { icon: Clock,          accent: "#F59E0B", label: "Due soon" },
  submission_graded:   { icon: ClipboardCheck, accent: "#0EA5E9", label: "Graded" },
  submission_received: { icon: Inbox,          accent: "#8B5CF6", label: "Submission" },
  video_posted:        { icon: Video,          accent: "#E11D48", label: "Recording" },
  calendar_event:      { icon: Calendar,       accent: "#10B981", label: "Event" },
  announcement:        { icon: Megaphone,      accent: "#F97316", label: "Announcement" },
};

export function notificationAccent(type: string): string {
  return META[type as NotificationType]?.accent ?? "var(--primary)";
}

export function notificationLabel(type: string): string {
  return META[type as NotificationType]?.label ?? "Update";
}

export function NotificationGlyph({ type, size = 16 }: { type: string; size?: number }) {
  const meta = META[type as NotificationType] ?? META.announcement;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg"
      style={{
        width: size + 14,
        height: size + 14,
        background: `${meta.accent}1a`,
        color: meta.accent,
      }}
    >
      <Icon size={size} />
    </span>
  );
}
