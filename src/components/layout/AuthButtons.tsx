"use client";

import { useClerk } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, Mail } from "lucide-react";
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
      <button onClick={() => openSignIn()} className="btn-ink text-base">
        Student Sign In <ArrowRight size={18} />
      </button>
      <a href="#info-sessions" className="btn-paper text-base">
        View Info Sessions
      </a>
    </div>
  );
}

export function EnrollmentButtons({ align = "start" }: { align?: "start" | "center" }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${align === "center" ? "justify-center items-center" : "items-start"}`}>
      <Link href="/sign-in" className="btn-ink text-base">
        Take your seat <ArrowRight size={18} />
      </Link>
      <a href="#info-sessions" className="btn-paper text-base">
        <CalendarDays size={17} /> Attend an info session
      </a>
    </div>
  );
}

export function InviteOnlyNote({ className }: { className?: string }) {
  return (
    <p className={`text-sm flex items-center gap-2 ${className ?? ""}`} style={{ color: "var(--text-muted)" }}>
      <Mail size={14} />
      Enrollment is by invitation. Your instructor sends the link that unlocks your seat.
    </p>
  );
}
