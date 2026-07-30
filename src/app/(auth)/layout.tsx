"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LogOut, AlertTriangle, Mail } from "lucide-react";

function DroppedLockoutPage({ reason }: { reason?: string }) {
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)" }}>
      <div className="card p-10 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#EF444420" }}>
          <AlertTriangle size={28} style={{ color: "#EF4444" }} />
        </div>
        <div>
          <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text)" }}>
            You&apos;ve been removed from this course
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your access to ComplxSimple has been revoked by your instructor.
          </p>
        </div>
        {reason && (
          <div className="rounded-xl p-4 text-sm text-left" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
              Reason noted
            </p>
            <p style={{ color: "var(--text)" }}>{reason}</p>
          </div>
        )}
        <div className="rounded-xl p-4 text-sm text-left" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
            Need help?
          </p>
          <p className="flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Mail size={14} />
            Contact your instructor: <strong>Cassandra Carter</strong>
          </p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const storeUser = useMutation(api.users.store);
  const ensureSeeded = useMutation(api.init.ensureSeeded);
  const addLinuxTrack = useMutation(api.init.addLinuxTrack);
  const addHardwareCrossword = useMutation(api.init.addHardwareCrossword);
  const addAICrossword = useMutation(api.init.addAICrossword);
  const reorderTracksLinuxFirst = useMutation(api.init.reorderTracksLinuxFirst);
  const patchCrosswordsToMandatory = useMutation(api.init.patchCrosswordsToMandatory);
  const profile = useQuery(api.users.getMyProfile);

  useEffect(() => {
    if (!isLoaded || !user) return;
    storeUser({
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name: user.fullName ?? user.firstName ?? "Student",
      imageUrl: user.imageUrl,
    });
    // Idempotent seed mutations — safe to call on every mount
    void ensureSeeded();
    void addLinuxTrack();
    void addHardwareCrossword();
    void addAICrossword();
    void reorderTracksLinuxFirst();
    void patchCrosswordsToMandatory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  // Gate: Clerk not loaded yet
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2563EB", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Gate: dropped student (only checked once profile has actually loaded)
  if (profile !== undefined && profile?.status === "dropped") {
    return <DroppedLockoutPage reason={profile.droppedReason} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
