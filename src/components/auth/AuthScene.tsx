"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { BookMarked, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const SHELF = [
  { title: "Linux Administration", color: "#F59E0B", size: "tall" },
  { title: "AWS Cloud", color: "#FF9900", size: "" },
  { title: "Microsoft Azure", color: "#0078D4", size: "short" },
  { title: "Docker", color: "#2496ED", size: "wide" },
  { title: "Kubernetes", color: "#326CE5", size: "" },
  { title: "Terraform", color: "#7B42BC", size: "tall" },
  { title: "CI/CD", color: "#D33833", size: "short lean" },
];

/* Colours come from the --clerk-color-* custom properties in globals.css, so light/dark just works. */
export function AuthScene({ mode }: { mode: "sign-in" | "sign-up" }) {
  const appearance = {
    variables: {
      fontFamily: "var(--font-geist-sans), Arial, sans-serif",
    },
    elements: {
      rootBox: "w-full",
      cardBox: "w-full shadow-none",
      card: "shadow-none border-0 p-0 bg-transparent",
      headerTitle: "hidden",
      headerSubtitle: "hidden",
      footer: "bg-transparent",
    },
  };

  const isSignUp = mode === "sign-up";

  return (
    <div className="min-h-screen relative flex flex-col">
      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-md flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(160deg, #2563EB, #1e40af)",
              boxShadow: "3px 3px 0 var(--accent)",
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
            }}
          >
            <BookMarked size={18} />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            ComplxSimple
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/#info-sessions" className="text-sm font-semibold hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
            Info sessions
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 pb-16 grid lg:grid-cols-[1fr_minmax(360px,440px)] gap-12 items-center">
        {/* Left — the library */}
        <section className="hidden lg:block">
          <p className="eyebrow mb-6">{isSignUp ? "Enrollment desk" : "Front desk"}</p>
          <h1 className="font-serif text-5xl font-bold tracking-tight leading-[1.05] mb-6" style={{ color: "var(--text)" }}>
            {isSignUp ? (
              <>Your seat is <span className="highlighter">reserved</span>.</>
            ) : (
              <>Welcome back to <span className="highlighter">class</span>.</>
            )}
          </h1>
          <p className="text-lg max-w-md leading-relaxed mb-10" style={{ color: "var(--text-muted)" }}>
            {isSignUp
              ? "Set your name and password to accept the invitation from your instructor. Your cohort, lessons, and homework are waiting on the other side."
              : "Pick up where you left off — your tracks, homework, class announcements, and Stark are all one sign-in away."}
          </p>

          <div className="relative max-w-lg">
            <div
              className="sticky-note absolute -top-6 right-0 z-20 w-44 p-4"
              style={{ ["--tilt" as string]: "3deg" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-1">Note to self</p>
              <p className="font-serif text-base font-bold leading-snug">
                {isSignUp ? "Use the same email the invite was sent to." : "Ask Stark if a lesson gets fuzzy."}
              </p>
            </div>
            <div className="bookshelf pt-10">
              {SHELF.map((b) => (
                <span key={b.title} className={`book-spine ${b.size}`} style={{ ["--book-color" as string]: b.color }} title={b.title}>
                  <span className="spine-badge text-[10px] font-black">CS</span>
                  <span className="spine-title">{b.title}</span>
                  <span className="text-[9px] font-bold tracking-widest opacity-80">I</span>
                </span>
              ))}
            </div>
          </div>

          <ul className="mt-10 space-y-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
            {[
              "Live lessons, recordings, and hands-on labs",
              "Homework, grades, and instructor feedback in one place",
              "Stark — your course-aware AI teaching assistant",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <CheckCircle2 size={16} style={{ color: "#16A34A" }} />
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* Right — the library card */}
        <section className="w-full">
          <div className="index-card plain p-6 sm:p-8 pt-0 relative">
            <span className="washi-tape" />
            <div className="index-card-title justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                Library card · {isSignUp ? "New member" : "Member sign-in"}
              </span>
              {isSignUp ? <Sparkles size={15} style={{ color: "var(--accent)" }} /> : <Mail size={15} style={{ color: "var(--primary)" }} />}
            </div>

            <div className="mt-3 mb-6 lg:hidden">
              <h1 className="font-serif text-3xl font-bold leading-tight" style={{ color: "var(--text)" }}>
                {isSignUp ? "Your seat is reserved." : "Welcome back to class."}
              </h1>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                {isSignUp ? "Set your name and password to accept your invitation." : "Sign in to continue learning."}
              </p>
            </div>
            <div className="hidden lg:block mt-3 mb-6">
              <h2 className="font-serif text-2xl font-bold leading-tight" style={{ color: "var(--text)" }}>
                {isSignUp ? "Accept your invitation" : "Sign in"}
              </h2>
              <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
                {isSignUp ? "Set your name and password to join." : "Use the email your instructor invited."}
              </p>
            </div>

            {isSignUp ? <SignUp appearance={appearance} /> : <SignIn appearance={appearance} />}

            <p className="text-xs mt-6 pt-4 flex items-start gap-2 leading-relaxed" style={{ color: "var(--text-muted)", borderTop: "1px dashed var(--border)" }}>
              <Mail size={13} className="mt-0.5 flex-shrink-0" />
              New accounts are by invitation only. Ask your instructor for access if you don&apos;t have an invite yet.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
