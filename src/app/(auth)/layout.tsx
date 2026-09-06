"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { LogOut, AlertTriangle, Mail } from "lucide-react";

function DroppedLockoutPage({ reason }: { reason?: string }) {
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="index-card p-8 sm:p-10 pt-0 max-w-md w-full space-y-5">
        <div className="index-card-title justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Office notice</span>
          <span className="stamp">Withdrawn</span>
        </div>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "#EF444420" }}>
          <AlertTriangle size={26} style={{ color: "#EF4444" }} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
            You&apos;ve been removed from this course
          </h1>
          <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            Your access to ComplxSimple has been revoked by your instructor.
          </p>
        </div>
        {reason && (
          <div className="sticky-note p-4 text-sm" style={{ ["--tilt" as string]: "-1deg" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-1">Reason noted</p>
            <p className="font-serif font-semibold leading-snug">{reason}</p>
          </div>
        )}
        <div className="rounded-lg p-4 text-sm" style={{ background: "var(--surface-2)", border: "1px dashed var(--border)" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "var(--text-muted)" }}>
            Need help?
          </p>
          <p className="flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Mail size={14} />
            Contact your instructor: <strong>Cassandra Carter</strong>
          </p>
        </div>
        <button onClick={() => signOut({ redirectUrl: "/" })} className="btn-paper w-full">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

function NotEnrolledPage() {
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="index-card p-8 sm:p-10 pt-0 max-w-md w-full space-y-5">
        <div className="index-card-title justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>Front desk</span>
          <span className="stamp ink">Not on roster</span>
        </div>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "#F9731620" }}>
          <Mail size={26} style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
            Invitation required
          </h1>
          <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            ComplxSimple is invite-only. Your email is not on the roster yet, or your invitation was revoked.
          </p>
        </div>
        <div className="sticky-note blue p-4 text-sm" style={{ ["--tilt" as string]: "1deg" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-1">What to do</p>
          <p className="leading-snug">
            Ask your instructor <strong>Cassandra Carter</strong> to send you an invitation email, then use the link in that message to finish setting up your account.
          </p>
        </div>
        <button onClick={() => signOut({ redirectUrl: "/" })} className="btn-paper w-full">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}

function needsDisplayName(name: string | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return trimmed.length === 0 || trimmed.toLowerCase() === "student";
}

function NameSetupPage({ initialName }: { initialName?: string }) {
  const { user } = useUser();
  const updateProfile = useMutation(api.users.updateProfile);
  const [name, setName] = useState(initialName && !needsDisplayName(initialName) ? initialName : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (needsDisplayName(trimmed)) {
      setError("Please enter your real name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Best-effort sync to Clerk (requires First/last name enabled in Dashboard)
      if (user) {
        const parts = trimmed.split(/\s+/);
        const firstName = parts[0] ?? trimmed;
        const lastName = parts.slice(1).join(" ");
        try {
          await user.update({
            firstName,
            ...(lastName ? { lastName } : {}),
          });
        } catch {
          // Convex profile is the source of truth for the roster
        }
      }
      await updateProfile({ name: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="index-card p-8 sm:p-10 pt-0 max-w-md w-full space-y-5">
        <div className="index-card-title">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
            Attendance sheet · First day
          </span>
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
            What should we call you?
          </h1>
          <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            Your name shows on your profile and in your instructor&apos;s roll book.
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--text-muted)" }}>
            Full name
          </label>
          <input
            type="text"
            autoFocus
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shawn Holmes"
            className="w-full px-4 py-3 rounded-lg text-base font-serif outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderBottom: "2px solid var(--ink)", color: "var(--text)" }}
          />
        </div>
        {error && (
          <p className="text-sm" style={{ color: "#EF4444" }}>{error}</p>
        )}
        <button type="submit" disabled={saving} className="btn-ink w-full">
          {saving ? "Saving…" : "Sign the sheet"}
        </button>
      </form>
    </div>
  );
}

type SyncState = "idle" | "syncing" | "ok" | "not_enrolled" | "error";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStark = pathname.startsWith("/stark");
  const { user, isLoaded } = useUser();
  const storeUser = useMutation(api.users.store);
  const ensureSeeded = useMutation(api.init.ensureSeeded);
  const addLinuxTrack = useMutation(api.init.addLinuxTrack);
  const addHardwareCrossword = useMutation(api.init.addHardwareCrossword);
  const addAICrossword = useMutation(api.init.addAICrossword);
  const reorderTracksLinuxFirst = useMutation(api.init.reorderTracksLinuxFirst);
  const patchCrosswordsToMandatory = useMutation(api.init.patchCrosswordsToMandatory);
  const profile = useQuery(api.users.getMyProfile);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    if (!isLoaded || !user) {
      setSyncState("idle");
      return;
    }
    setSyncState("syncing");
    storeUser({
      clerkId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name: user.fullName ?? user.firstName ?? "Student",
      imageUrl: user.imageUrl,
    })
      .then(() => setSyncState("ok"))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("NOT_ENROLLED")) {
          setSyncState("not_enrolled");
        } else {
          setSyncState("error");
          console.error("Failed to sync user profile:", err);
        }
      });
    void ensureSeeded();
    void addLinuxTrack();
    void addHardwareCrossword();
    void addAICrossword();
    void reorderTracksLinuxFirst();
    void patchCrosswordsToMandatory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id]);

  if (!isLoaded || syncState === "syncing" || (user && profile === undefined && syncState !== "not_enrolled")) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2563EB", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (syncState === "not_enrolled" || (user && profile === null)) {
    return <NotEnrolledPage />;
  }

  // Gate: dropped student (only checked once profile has actually loaded)
  if (profile !== undefined && profile?.status === "dropped") {
    return <DroppedLockoutPage reason={profile.droppedReason} />;
  }

  // Gate: collect a real display name (covers invites before Clerk name fields were required)
  if (profile && needsDisplayName(profile.name)) {
    const clerkName = user?.fullName ?? user?.firstName ?? "";
    return <NameSetupPage initialName={!needsDisplayName(clerkName) ? clerkName : undefined} />;
  }

  return (
    <div
      className={isStark ? "h-dvh overflow-hidden" : "min-h-screen flex flex-col"}
      style={{ background: "var(--bg)" }}
    >
      <Navbar />
      <main className={isStark ? "" : "flex-1"}>{children}</main>
    </div>
  );
}
