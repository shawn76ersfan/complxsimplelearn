"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { isAdmin, isStaff } from "@/lib/roles";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const storeUser = useMutation(api.users.store);
  const ensureSeeded = useMutation(api.init.ensureSeeded);
  const syncDevOpsCurriculum = useMutation(api.curriculum.syncDevOpsCurriculum);
  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    if (isLoaded && user) {
      storeUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        name: user.fullName ?? user.firstName ?? "Student",
        imageUrl: user.imageUrl,
      });
      ensureSeeded();
    }
  }, [isLoaded, user, storeUser, ensureSeeded]);

  useEffect(() => {
    // Curriculum sync is a school-wide write; only admins trigger it.
    if (!isAdmin(profile?.role)) return;
    void syncDevOpsCurriculum();
  }, [profile?.role, syncDevOpsCurriculum]);

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
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
