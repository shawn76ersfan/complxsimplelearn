"use client";

import { useClerk } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

export function SignInBtn({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { openSignIn } = useClerk();
  return (
    <button onClick={() => openSignIn()} className={className} style={style}>
      Sign In
    </button>
  );
}

export function SignUpBtn({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const { openSignUp } = useClerk();
  return (
    <button onClick={() => openSignUp()} className={className} style={style}>
      {children ?? "Get Started Free"}
    </button>
  );
}

export function HeroButtons() {
  const { openSignIn, openSignUp } = useClerk();
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={() => openSignUp()}
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
      >
        Start Learning Free <ArrowRight size={20} />
      </button>
      <button
        onClick={() => openSignIn()}
        className="px-8 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-105 active:scale-95"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        Sign In
      </button>
    </div>
  );
}

export function EnrollmentButtons() {
  const { openSignUp } = useClerk();

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        onClick={() => openSignUp()}
        className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold text-white hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-lg"
        style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", boxShadow: "0 8px 24px rgba(37,99,235,0.35)" }}
      >
        Enroll Now <ArrowRight size={20} />
      </button>
      <a
        href="#info-sessions"
        className="px-8 py-4 rounded-2xl text-lg font-medium transition-all hover:scale-105 active:scale-95"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        View Info Sessions
      </a>
    </div>
  );
}
