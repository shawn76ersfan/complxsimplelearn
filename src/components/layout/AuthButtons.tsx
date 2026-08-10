"use client";

import { useClerk } from "@clerk/nextjs";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";

export function SignInBtn({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { openSignIn } = useClerk();
  return (
    <button onClick={() => openSignIn()} className={className} style={style}>
      Sign In
    </button>
  );
}

/** @deprecated Public sign-up is disabled; use SignInBtn or invite flow. */
export function SignUpBtn({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const { openSignIn } = useClerk();
  return (
    <button onClick={() => openSignIn()} className={className} style={style}>
      {children ?? "Sign In"}
    </button>
  );
}

export function HeroButtons() {
  const { openSignIn } = useClerk();
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={() => openSignIn()}
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
      >
        Student Sign In <ArrowRight size={20} />
      </button>
      <a
        href="#info-sessions"
        className="px-8 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-105 active:scale-95 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        View Info Sessions
      </a>
    </div>
  );
}

export function EnrollmentButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link
        href="/sign-in"
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
      >
        Sign In <ArrowRight size={20} />
      </Link>
      <a
        href="#info-sessions"
        className="px-8 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-105 active:scale-95 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        View Info Sessions
      </a>
    </div>
  );
}

export function InviteOnlyNote({ className }: { className?: string }) {
  return (
    <p className={`text-sm flex items-center justify-center gap-2 ${className ?? ""}`} style={{ color: "var(--text-muted)" }}>
      <Mail size={14} />
      New accounts are by invitation only. Ask your instructor for access.
    </p>
  );
}
