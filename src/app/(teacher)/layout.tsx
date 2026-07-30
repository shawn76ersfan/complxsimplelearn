"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";

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
    if (profile?.role !== "teacher") return;
    void syncDevOpsCurriculum();
  }, [profile?.role, syncDevOpsCurriculum]);

  if (profile === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (profile?.role !== "teacher") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>Access Denied</h1>
            <p style={{ color: "var(--text-muted)" }}>This area is for teachers only.</p>
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
