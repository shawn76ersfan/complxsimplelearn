"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { isAdmin, isStaff } from "@/lib/roles";
import { useSyncAppUser } from "@/lib/useSyncAppUser";

/**
 * Lives on the /teacher segment directly. A route group named (teacher)
 * next to this folder makes Next register /teacher/dashboard twice and
 * answer with 404.
 */
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { profile, isBootstrapping, syncState, retry } = useSyncAppUser();
  const syncDevOpsCurriculum = useMutation(api.curriculum.syncDevOpsCurriculum);

  useEffect(() => {
    // Curriculum sync is a school-wide write; only admins trigger it.
    if (!isAdmin(profile?.role)) return;
    void syncDevOpsCurriculum();
  }, [profile?.role, syncDevOpsCurriculum]);

  if (isBootstrapping || (syncState === "ok" && profile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (syncState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="index-card p-8 max-w-md w-full space-y-4 text-center">
          <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>
            Couldn&apos;t open the lounge
          </h1>
          <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            Sign-in finished, but the classroom data connection didn&apos;t catch up. Try again — no need to refresh the whole page.
          </p>
          <button type="button" onClick={retry} className="btn-ink w-full">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!isStaff(profile?.role)) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="index-card p-8 pt-0 max-w-sm w-full text-center">
            <div className="index-card-title justify-center">
              <span className="stamp">Staff only</span>
            </div>
            <div className="text-5xl mb-3 mt-2">🔒</div>
            <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Teacher&apos;s lounge</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>This area is for instructors only.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
