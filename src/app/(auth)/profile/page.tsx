"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Edit3, Save, X, BookOpen, Trophy, GraduationCap, Mail, User, Volume2, VolumeX } from "lucide-react";
import { cn, percentageColor, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { CalendarWidget } from "@/components/teacher/CalendarWidget";

export default function ProfilePage() {
  const { user } = useUser();
  const profile = useQuery(api.users.getMyProfile);
  const scores = useQuery(api.attempts.getMyScoreSummary);
  const tracks = useQuery(api.tracks.list);
  const updateProfile = useMutation(api.users.updateProfile);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    setSoundOn(localStorage.getItem("sound-feedback") === "on");
  }, []);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("sound-feedback", next ? "on" : "off");
    toast.success(next ? "Sound feedback on 🔊" : "Sound feedback off 🔇");
  }

  function startEdit() {
    setName(profile?.name ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    await updateProfile({ name: name.trim() });
    toast.success("Profile updated!");
    setEditing(false);
  }

  const testAvg = scores?.testAvg ?? null;
  const isTeacher = profile?.role === "teacher";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Profile card */}
      <div className="card p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ border: "3px solid #2563EB44" }}>
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={profile?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
                  {profile?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1">
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "w-0 h-0 opacity-0", userButtonTrigger: "w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center" } }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 rounded-xl text-lg font-bold outline-none transition-all"
                  style={{ background: "var(--surface-2)", border: "2px solid #2563EB", color: "var(--text)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                />
                <button onClick={handleSave} className="w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500 text-white hover:opacity-80 transition-opacity">
                  <Save size={16} />
                </button>
                <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-70 transition-opacity" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>{profile?.name ?? user?.fullName}</h1>
                <button onClick={startEdit} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <Edit3 size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            )}

            {/* Role badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: isTeacher ? "#2563EB22" : "#0EA5E922", color: isTeacher ? "#2563EB" : "#0EA5E9" }}>
                {isTeacher ? <GraduationCap size={12} /> : <BookOpen size={12} />}
                {isTeacher ? "Teacher" : "Student"}
              </span>
            </div>

            {/* Email & join date */}
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-center gap-1.5">
                <Mail size={13} />
                {profile?.email ?? user?.emailAddresses[0]?.emailAddress}
              </div>
              <div className="flex items-center gap-1.5">
                <User size={13} />
                Joined {profile ? formatDate(profile.createdAt) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row (students only) */}
      {!isTeacher && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Test avg", value: testAvg === null ? "—" : `${testAvg}%`, icon: Trophy, color: "#2563EB" },
            { label: "Lessons Done", value: scores?.completedLessons ?? 0, icon: BookOpen, color: "#0EA5E9" },
            { label: "Tracks Enrolled", value: tracks?.length ?? 0, icon: GraduationCap, color: "#F59E0B" },
          ].map((stat) => (
            <div key={stat.label} className="card p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}22` }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <p className={cn("text-2xl font-black", stat.label === "Test avg" && testAvg !== null ? percentageColor(testAvg) : "")} style={{ color: stat.label !== "Test avg" ? "var(--text)" : undefined }}>
                  {stat.value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preferences */}
      <div className="card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {soundOn ? <Volume2 size={18} style={{ color: "#2563EB" }} /> : <VolumeX size={18} style={{ color: "var(--text-muted)" }} />}
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>Sound Feedback</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Play sounds on correct answers and lesson completion</p>
          </div>
        </div>
        <button
          onClick={toggleSound}
          className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
          style={{ background: soundOn ? "linear-gradient(135deg, #2563EB, #F97316)" : "var(--border)" }}
          aria-label="Toggle sound feedback"
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: soundOn ? "calc(100% - 20px)" : "4px" }}
          />
        </button>
      </div>

      {/* Calendar visible to all */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>
          {isTeacher ? "Class Calendar" : "Upcoming Events"}
        </h2>
        <CalendarWidget isTeacher={isTeacher} />
      </div>
    </div>
  );
}
