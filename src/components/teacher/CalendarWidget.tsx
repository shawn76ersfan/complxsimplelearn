"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Calendar,
  Send,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from "date-fns";
import toast from "react-hot-toast";

const EVENT_COLORS = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#E11D48", "#8B5CF6"];

interface CalendarEvent {
  _id: Id<"calendarEvents">;
  date: string;
  title: string;
  description?: string;
  color?: string;
}

function EventModal({
  date,
  onClose,
  onSave,
  isTeacher,
}: {
  date: string;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; color: string }) => void;
  isTeacher: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563EB");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md shadow-2xl" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg" style={{ color: "var(--text)" }}>Add Event — {date}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ background: "var(--surface-2)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quiz Day, Office Hours..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Color</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => title.trim() && onSave({ title: title.trim(), description: description.trim() || undefined, color })}
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  );
}

export function CalendarWidget({ isTeacher = false }: { isTeacher?: boolean }) {
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sendingSchedule, setSendingSchedule] = useState(false);

  const yearMonth = format(current, "yyyy-MM");
  const monthLabel = format(current, "MMMM yyyy");
  const events = useQuery(api.calendar.listByMonth, { yearMonth }) as CalendarEvent[] | undefined;
  const createEvent = useMutation(api.calendar.create);
  const removeEvent = useMutation(api.calendar.remove);
  const sendEmail = useAction(api.email.sendEmail);

  async function handleSendSchedule() {
    if (!events || events.length === 0) {
      toast.error("No events this month to send.");
      return;
    }
    setSendingSchedule(true);
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    const lines = sorted.map((e) => `📅 ${e.date} — ${e.title}${e.description ? `: ${e.description}` : ""}`).join("\n");
    const body = `Hi,\n\nHere is your schedule for ${monthLabel}:\n\n${lines}\n\nSee you soon!\n— Cassandra Carter`;
    await sendEmail({ subject: `Your Schedule for ${monthLabel}`, body, recipientIds: [] });
    toast.success(`Schedule for ${monthLabel} sent to all students!`);
    setSendingSchedule(false);
  }

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekDay = getDay(monthStart);

  function getEventsForDay(day: Date): CalendarEvent[] {
    const dateStr = format(day, "yyyy-MM-dd");
    return events?.filter((e) => e.date === dateStr) ?? [];
  }

  async function handleSave(data: { title: string; description?: string; color: string }) {
    if (!selectedDate) return;
    await createEvent({ date: selectedDate, ...data });
    toast.success("Event added!");
    setShowModal(false);
    setSelectedDate(null);
  }

  async function handleDelete(id: Id<"calendarEvents">) {
    await removeEvent({ id });
    toast.success("Event removed");
  }

  const selectedEvents = selectedDate ? events?.filter((e) => e.date === selectedDate) ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
          {format(current, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 h-8 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Today
          </button>
          <button
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <ChevronRight size={14} />
          </button>
          {isTeacher && (
            <button
              onClick={handleSendSchedule}
              disabled={sendingSchedule}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              <Send size={12} /> {sendingSchedule ? "Sending…" : "Send Schedule"}
            </button>
          )}
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startWeekDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEvents = getEventsForDay(day);
          const isSelected = selectedDate === dateStr;
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => {
                setSelectedDate(isSelected ? null : dateStr);
                if (isTeacher && !isSelected) setSelectedDate(dateStr);
              }}
              className="relative aspect-square flex flex-col items-center justify-start pt-1.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
              style={{
                background: isSelected ? "#2563EB" : today ? "#2563EB22" : "var(--surface-2)",
                color: isSelected ? "white" : today ? "#2563EB" : "var(--text)",
                border: today && !isSelected ? "1px solid #2563EB44" : "1px solid transparent",
              }}
            >
              {day.getDate()}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: isSelected ? "white" : (e.color ?? "#2563EB") }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="card p-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {format(new Date(selectedDate + "T12:00:00"), "MMMM d, yyyy")}
              </span>
            </div>
            {isTeacher && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-90 transition-all"
              >
                <Plus size={12} /> Add Event
              </button>
            )}
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No events. {isTeacher ? "Click 'Add Event' to create one." : "Nothing scheduled."}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: `${event.color ?? "#2563EB"}15`, border: `1px solid ${event.color ?? "#2563EB"}33` }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: event.color ?? "#2563EB" }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{event.title}</p>
                    {event.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{event.description}</p>}
                  </div>
                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(event._id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity flex-shrink-0"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <Trash2 size={12} style={{ color: "#EF4444" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && selectedDate && isTeacher && (
        <EventModal
          date={format(new Date(selectedDate + "T12:00:00"), "MMMM d, yyyy")}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          isTeacher={isTeacher}
        />
      )}
    </div>
  );
}
