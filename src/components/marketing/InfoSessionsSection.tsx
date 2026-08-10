"use client";

import { FormEvent, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { CalendarDays, CheckCircle2, Clock, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { TurnstileWidget } from "./TurnstileWidget";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
  (process.env.NODE_ENV === "development"
    ? "1x00000000000000000000AA"
    : "");

type PublicSession = {
  _id: Id<"infoSessions">;
  title: string;
  description?: string;
  startsAt: number;
  timezone: string;
};

function formatSessionDate(session: PublicSession): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: session.timezone,
    timeZoneName: "short",
  }).format(session.startsAt);
}

export function InfoSessionsSection() {
  const [queryNow] = useState(() => Date.now());
  const sessions = useQuery(api.infoSessions.listPublic, {
    now: queryNow,
  }) as PublicSession[] | undefined;
  const register = useAction(api.infoSessionActions.register);

  const [selectedId, setSelectedId] = useState<Id<"infoSessions"> | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registeredId, setRegisteredId] = useState<Id<"infoSessions"> | null>(null);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;
    if (!turnstileToken) {
      toast.error("Complete the security check before registering.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        sessionId: selectedId,
        name,
        email,
        consentToReminders: consented,
        turnstileToken,
        website,
      });
      setRegisteredId(selectedId);
      toast.success(
        result.alreadyRegistered
          ? "You're already registered for this session."
          : "You're registered! Check your email for confirmation.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to register.",
      );
    } finally {
      setSubmitting(false);
      setTurnstileToken("");
      setChallengeKey((current) => current + 1);
    }
  }

  return (
    <section
      id="info-sessions"
      className="relative z-10 max-w-7xl mx-auto px-6 pb-24 scroll-mt-20"
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#2563EB" }}>
          Live information sessions
        </p>
        <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text)" }}>
          Learn about upcoming training
        </h2>
        <p style={{ color: "var(--text-muted)" }}>
          Meet Cassandra, explore the program, and ask questions before you enroll.
          Register below and we&apos;ll email you a reminder 30 minutes before the session.
        </p>
      </div>

      {!sessions ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[1, 2].map((item) => <div key={item} className="card h-48 animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-10 text-center max-w-2xl mx-auto">
          <CalendarDays size={38} className="mx-auto mb-3" style={{ color: "#2563EB" }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>New dates coming soon</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Check back soon for the next live ComplxSimple information session.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {sessions.map((session) => {
            const selected = selectedId === session._id;
            const registered = registeredId === session._id;
            return (
              <article key={session._id} className="card p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#2563EB15", color: "#2563EB" }}>
                    <CalendarDays size={21} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black" style={{ color: "var(--text)" }}>{session.title}</h3>
                    <p className="text-sm font-semibold mt-2 flex items-start gap-2" style={{ color: "#2563EB" }}>
                      <Clock size={15} className="mt-0.5 flex-shrink-0" />
                      {formatSessionDate(session)}
                    </p>
                    {session.description && (
                      <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-muted)" }}>{session.description}</p>
                    )}
                  </div>
                </div>

                {registered ? (
                  <div className="mt-6 p-4 rounded-xl flex gap-3" style={{ background: "#16A34A12", border: "1px solid #16A34A33" }}>
                    <CheckCircle2 size={20} className="flex-shrink-0" style={{ color: "#16A34A" }} />
                    <div>
                      <p className="font-bold text-sm" style={{ color: "var(--text)" }}>Registration confirmed</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Check your inbox. We&apos;ll remind you again 30 minutes before the session.</p>
                    </div>
                  </div>
                ) : selected ? (
                  <form onSubmit={handleRegister} className="mt-6 space-y-3">
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      maxLength={100}
                      className="w-full px-4 py-2.5 rounded-xl outline-none"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      maxLength={320}
                      className="w-full px-4 py-2.5 rounded-xl outline-none"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                    <label className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      <input
                        type="checkbox"
                        checked={consented}
                        onChange={(event) => setConsented(event.target.checked)}
                        required
                        className="mt-0.5"
                      />
                      I agree to receive confirmation and reminder emails about this info session.
                    </label>
                    <label
                      aria-hidden="true"
                      className="absolute -left-[10000px] h-px w-px overflow-hidden"
                    >
                      Website
                      <input
                        name="website"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        autoComplete="off"
                        tabIndex={-1}
                      />
                    </label>
                    {TURNSTILE_SITE_KEY ? (
                      <TurnstileWidget
                        key={`${session._id}-${challengeKey}`}
                        siteKey={TURNSTILE_SITE_KEY}
                        setToken={setTurnstileToken}
                      />
                    ) : (
                      <p className="text-xs p-3 rounded-xl" style={{ background: "#EF444412", color: "#DC2626" }}>
                        Registration security is not configured yet. Please contact ComplxSimple.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submitting || !turnstileToken || !TURNSTILE_SITE_KEY}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                      >
                        {submitting ? "Registering..." : "Confirm registration"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedId(session._id);
                      setRegisteredId(null);
                      setTurnstileToken("");
                    }}
                    className="mt-6 w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                  >
                    <Mail size={16} /> Register for this session
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
