"use client";

import { useEffect, useRef, useState } from "react";
import { ScoresDashboard } from "@/components/teacher/ScoresDashboard";
import { CalendarWidget } from "@/components/teacher/CalendarWidget";
import { EmailComposer } from "@/components/teacher/EmailComposer";
import { HomeworkTab } from "@/components/teacher/HomeworkTab";
import { CurriculumManager } from "@/components/teacher/CurriculumManager";
import { KnowledgeManager } from "@/components/teacher/KnowledgeManager";
import { VideoManager } from "@/components/teacher/VideoManager";
import { InfoSessionManager } from "@/components/teacher/InfoSessionManager";
import { InviteStudentPanel } from "@/components/teacher/InviteStudentPanel";
import { BarChart3, Calendar, CalendarClock, Mail, GraduationCap, Quote, Save, Users, UserX, UserCheck, BookMarked, Sparkles, Video, Library, ChevronDown } from "lucide-react";
import { cn, formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const PRIMARY_TABS = [
  { id: "scores", label: "Scores", icon: BarChart3 },
  { id: "students", label: "Students", icon: Users },
  { id: "curriculum", label: "Curriculum", icon: Library },
  { id: "homework", label: "Homework", icon: BookMarked },
] as const;

const MORE_TABS = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "info-sessions", label: "Info Sessions", icon: CalendarClock },
  { id: "videos", label: "Videos", icon: Video },
  { id: "email", label: "Email Students", icon: Mail },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "knowledge", label: "Stark Knowledge", icon: Sparkles },
] as const;

type TabId = (typeof PRIMARY_TABS)[number]["id"] | (typeof MORE_TABS)[number]["id"];

function QuoteEditor() {
  const current = useQuery(api.quotes.getCurrent);
  const upsert = useMutation(api.quotes.upsert);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [saved, setSaved] = useState(false);

  const displayText  = text  || current?.text   || "";
  const displayAuthor = author || current?.author || "";

  async function handleSave() {
    if (!displayText.trim()) return;
    await upsert({ text: displayText.trim(), author: displayAuthor.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Quote text *</label>
          <textarea
            rows={4}
            value={text || current?.text || ""}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter an inspiring quote for your students this week..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>Author (optional)</label>
          <input
            type="text"
            value={author || current?.author || ""}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Grace Hopper, Anonymous..."
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            onFocus={(e) => (e.target.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!displayText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: saved ? "#0EA5E9" : "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Save size={14} /> {saved ? "Saved!" : "Save Quote"}
        </button>
      </div>

      {/* Preview */}
      {displayText && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>Preview (as students see it)</p>
          <div
            className="card p-6 relative overflow-hidden"
            style={{ border: "2px solid transparent", backgroundImage: "linear-gradient(var(--surface), var(--surface)), linear-gradient(135deg, #2563EB, #F97316)", backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" }}
          >
            <Quote size={40} className="absolute -top-1 -left-1 opacity-10" style={{ color: "#2563EB" }} />
            <div className="relative">
              <p className="text-sm font-semibold mb-2" style={{ color: "#2563EB" }}>Quote of the Week</p>
              <p className="text-base leading-relaxed italic font-medium" style={{ color: "var(--text)" }}>
                &ldquo;{displayText}&rdquo;
              </p>
              {displayAuthor && (
                <p className="text-xs mt-2 font-semibold" style={{ color: "var(--text-muted)" }}>— {displayAuthor}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentManagementTab() {
  const activeStudents = useQuery(api.users.listActive);
  const droppedStudents = useQuery(api.users.listDropped);
  const reactivate = useMutation(api.users.reactivateStudent);

  return (
    <div className="space-y-8">
      <InviteStudentPanel />

      {/* Active students */}
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text)" }}>Active Students</h2>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Click any student to view their progress and send feedback.</p>
        {!activeStudents ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse" style={{ background: "var(--surface-2)" }} />)}
          </div>
        ) : activeStudents.length === 0 ? (
          <div className="card p-8 text-center">
            <Users size={32} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active students yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeStudents.map((s) => (
              <Link
                key={s._id}
                href={`/teacher/students/${s._id}`}
                className="card p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
                  {s.imageUrl ? <img src={s.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                </div>
                <UserCheck size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: "#2563EB" }} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Dropped students */}
      {!!droppedStudents && droppedStudents.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
            <UserX size={18} style={{ color: "#EF4444" }} /> Dropped Students
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>These students have been removed and cannot access the platform.</p>
          <div className="space-y-3">
            {droppedStudents.map((s) => (
              <div key={s._id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: "#EF444433" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ background: "#EF444422", color: "#EF4444" }}>
                  {getInitials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{s.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                  {s.droppedReason && (
                    <p className="text-xs mt-1 italic" style={{ color: "#EF4444" }}>Reason: {s.droppedReason}</p>
                  )}
                  {s.droppedAt && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dropped: {formatDate(s.droppedAt)}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    href={`/teacher/students/${s._id}`}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                  >
                    View
                  </Link>
                  <button
                    onClick={() => reactivate({ studentId: s._id })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: "#10B981" }}
                  >
                    <UserCheck size={12} /> Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("scores");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const activeMoreTab = MORE_TABS.find((tab) => tab.id === activeTab);
  const moreActive = Boolean(activeMoreTab);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [moreOpen]);

  function tabStyle(active: boolean) {
    return {
      background: active ? "linear-gradient(135deg, var(--primary), var(--accent))" : "var(--surface-2)",
      color: active ? "white" : "var(--text)",
      border: `1px solid ${active ? "transparent" : "var(--border)"}`,
      boxShadow: active ? "0 4px 15px rgba(37,99,235,0.3)" : "none",
    } as const;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}>
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black" style={{ color: "var(--text)" }}>Teacher Hub</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Welcome back, Cassandra</p>
          </div>
        </div>
      </div>

      {/* Tabs: primary + More */}
      <div className="flex gap-2 mb-8 flex-wrap items-center">
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn("flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90")}
            style={tabStyle(activeTab === tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={tabStyle(moreActive)}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
          >
            {activeMoreTab ? (
              <>
                <activeMoreTab.icon size={15} />
                {activeMoreTab.label}
              </>
            ) : (
              <>More</>
            )}
            <ChevronDown size={14} className={cn("transition-transform", moreOpen && "rotate-180")} />
          </button>

          {moreOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-2 z-30 min-w-[220px] rounded-xl py-1 shadow-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {MORE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMoreOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-left transition-colors hover:opacity-90"
                  style={{
                    color: activeTab === tab.id ? "var(--primary)" : "var(--text)",
                    background: activeTab === tab.id ? "var(--surface-2)" : "transparent",
                  }}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === "students" && (
        <StudentManagementTab />
      )}

      {activeTab === "scores" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Student Scores</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>View individual and track-based performance for all students</p>
          </div>
          <ScoresDashboard />
        </div>
      )}

      {activeTab === "curriculum" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Curriculum CMS</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Create and edit learning tracks and lessons — publish when ready for students.
            </p>
          </div>
          <CurriculumManager />
        </div>
      )}

      {activeTab === "homework" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Homework & Assignments</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Assign work with deadlines, collect submissions, and grade with feedback.
            </p>
          </div>
          <HomeworkTab />
        </div>
      )}

      {activeTab === "calendar" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Class Calendar</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Add events, quiz dates, and announcements for students to see</p>
          </div>
          <div className="card p-6"><CalendarWidget isTeacher={true} /></div>
        </div>
      )}

      {activeTab === "info-sessions" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Info Sessions</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Publish signup dates and automatically remind registrants 30 minutes before each session.
            </p>
          </div>
          <InfoSessionManager />
        </div>
      )}

      {activeTab === "videos" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Class Videos</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Upload recorded classes (e.g. Zoom recordings). Add a title and the class date — students can watch them anytime.
            </p>
          </div>
          <VideoManager />
        </div>
      )}

      {activeTab === "email" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Send Email</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Send messages to all students or specific individuals</p>
          </div>
          <EmailComposer />
        </div>
      )}

      {activeTab === "quote" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Quote of the Week</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Set an inspiring quote that all students see at the top of their dashboard.
            </p>
          </div>
          <QuoteEditor />
        </div>
      )}

      {activeTab === "knowledge" && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Stark Knowledge</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Add info sheets that teach Stark about anything — your bio, schedules, policies, resource links, or extra tech notes. Stark uses these to answer student questions.
            </p>
          </div>
          <KnowledgeManager />
        </div>
      )}
    </div>
  );
}
