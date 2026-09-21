"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { LogOut, AlertTriangle, Mail } from "lucide-react";
import { US_STATES } from "@/lib/usStates";
import { US_TIMEZONES, guessTimezone } from "@/lib/timezones";
import { useSyncAppUser } from "@/lib/useSyncAppUser";

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

function splitInitialName(initialName?: string): { first: string; last: string } {
  if (!initialName || needsDisplayName(initialName)) return { first: "", last: "" };
  const parts = initialName.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function NameSetupPage({
  initialName,
  initialFirst,
  initialLast,
  initialState,
  initialTimezone,
  requireState,
}: {
  initialName?: string;
  initialFirst?: string;
  initialLast?: string;
  initialState?: string;
  initialTimezone?: string;
  requireState: boolean;
}) {
  const { user } = useUser();
  const updateProfile = useMutation(api.users.updateProfile);
  const split = splitInitialName(initialName);
  const [firstName, setFirstName] = useState(initialFirst || split.first);
  const [lastName, setLastName] = useState(initialLast || split.last);
  const [state, setState] = useState(initialState ?? "");
  const [timezone, setTimezone] = useState(initialTimezone || guessTimezone());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (first.length < 1 || last.length < 1) {
      setError("Please enter your first and last name.");
      return;
    }
    if (needsDisplayName(first) || needsDisplayName(`${first} ${last}`)) {
      setError("Please enter your real name.");
      return;
    }
    if (requireState && !state) {
      setError("Please pick the state you attend from.");
      return;
    }
    if (requireState && !timezone) {
      setError("Please pick the timezone you attend from.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (user) {
        try {
          await user.update({
            firstName: first,
            lastName: last,
          });
        } catch {
          // Convex profile is the source of truth for the roster
        }
      }
      await updateProfile({
        firstName: first,
        lastName: last,
        ...(requireState || state ? { state } : {}),
        ...(requireState || timezone ? { timezone } : {}),
      });
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
            First and last name show on the Board and roll book
            {requireState ? ", along with the state and timezone you join class from." : "."}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--text-muted)" }}>
              First name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Shawn"
              className="w-full px-4 py-3 rounded-lg text-base font-serif outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderBottom: "2px solid var(--ink)", color: "var(--text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--text-muted)" }}>
              Last name
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Holmes"
              className="w-full px-4 py-3 rounded-lg text-base font-serif outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderBottom: "2px solid var(--ink)", color: "var(--text)" }}
            />
          </div>
        </div>
        {requireState && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                State
              </label>
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-base outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderBottom: "2px solid var(--ink)", color: "var(--text)" }}
              >
                <option value="">Where you join class from</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                Timezone
              </label>
              <select
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-base outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderBottom: "2px solid var(--ink)", color: "var(--text)" }}
              >
                <option value="">Your local clock</option>
                {US_TIMEZONES.map((z) => (
                  <option key={z.id} value={z.id}>{z.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
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

function AuthSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#2563EB", borderTopColor: "transparent" }} />
    </div>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStark = pathname.startsWith("/stark");
  const { user, profile, syncState, isBootstrapping, retry } = useSyncAppUser();

  if (isBootstrapping) {
    return <AuthSpinner />;
  }

  if (syncState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="index-card p-8 max-w-md w-full space-y-4 text-center">
          <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>
            Couldn&apos;t open your locker
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

  if (syncState === "not_enrolled") {
    return <NotEnrolledPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="index-card p-8 max-w-md w-full space-y-4 text-center">
          <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--text)" }}>
            Couldn&apos;t open your locker
          </h1>
          <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
            Sign-in finished, but your roster row hasn&apos;t shown up yet. Try again — no need to refresh the whole page.
          </p>
          <button type="button" onClick={retry} className="btn-ink w-full">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Gate: dropped student (only checked once profile has actually loaded)
  if (profile !== undefined && profile?.status === "dropped") {
    return <DroppedLockoutPage reason={profile.droppedReason} />;
  }

  // Gate: first + last (and state for students) for the Board and roll book
  const missingIdentity = Boolean(
    profile &&
    (
      !profile.firstName?.trim() ||
      !profile.lastName?.trim() ||
      (profile.role === "student" && !profile.state?.trim()) ||
      (profile.role === "student" && !profile.timezone?.trim()) ||
      needsDisplayName(profile.name)
    ),
  );
  if (profile && missingIdentity) {
    const clerkName = user?.fullName ?? user?.firstName ?? "";
    return (
      <NameSetupPage
        initialName={!needsDisplayName(clerkName) ? clerkName : undefined}
        initialFirst={profile.firstName}
        initialLast={profile.lastName}
        initialState={profile.state}
        initialTimezone={profile.timezone}
        requireState={profile.role === "student"}
      />
    );
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
