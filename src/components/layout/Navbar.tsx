"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BookOpen, LayoutDashboard, GraduationCap, Menu, X, Bot, Video, MessageSquare } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const profile = useQuery(api.users.getMyProfile);
  const unreadFeedback = useQuery(api.feedback.getUnreadCount);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTeacher = profile?.role === "teacher";
  const unreadCount = !isTeacher ? (unreadFeedback ?? 0) : 0;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/learn",     label: "Learn",     icon: BookOpen },
    { href: "/videos",    label: "Videos",    icon: Video },
    ...(!isTeacher
      ? [{ href: "/feedback", label: "Messages", icon: MessageSquare, badge: unreadCount }]
      : []),
    ...(isTeacher ? [{ href: "/teacher/dashboard", label: "Teacher Hub", icon: GraduationCap }] : []),
    { href: "/stark",     label: "Stark",     icon: Bot, stark: true },
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black"
              style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
            >
              C
            </span>
            <span
              className="hidden sm:block text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, #2563EB, #F97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ComplxSimple
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              const isStark = "stark" in link && link.stark;
              const badge = "badge" in link ? (link.badge as number) : 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={
                    isStark
                      ? {
                          background: active ? "linear-gradient(135deg, #0d4f4a, #14B8A6)" : "#14B8A610",
                          color: active ? "#fff" : "#14B8A6",
                          border: "1px solid #14B8A630",
                        }
                      : {
                          background: active ? "linear-gradient(135deg, #2563EB, #F97316)" : "transparent",
                          color: active ? "#fff" : "var(--text)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active && !isStark) e.currentTarget.style.background = "var(--surface-2)";
                    if (!active && isStark) e.currentTarget.style.background = "#14B8A620";
                  }}
                  onMouseLeave={(e) => {
                    if (!active && !isStark) e.currentTarget.style.background = "transparent";
                    if (!active && isStark) e.currentTarget.style.background = "#14B8A610";
                  }}
                >
                  <link.icon size={14} />
                  {link.label}
                  {badge > 0 && (
                    <span
                      className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{
                        background: active ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg, #2563EB, #F97316)",
                      }}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right: theme + profile */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              {profile?.name?.split(" ")[0] ?? ""}
            </Link>
            <UserButton
              appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg" } }}
            />
            {/* Mobile toggle */}
            <button
              className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={15} style={{ color: "var(--text-muted)" }} /> : <Menu size={15} style={{ color: "var(--text-muted)" }} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 flex flex-col gap-1"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const isStark = "stark" in link && link.stark;
            const badge = "badge" in link ? (link.badge as number) : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={
                  isStark
                    ? {
                        background: active ? "linear-gradient(135deg, #0d4f4a, #14B8A6)" : "#14B8A610",
                        color: active ? "#fff" : "#14B8A6",
                        border: "1px solid #14B8A630",
                      }
                    : {
                        background: active ? "linear-gradient(135deg, #2563EB, #F97316)" : "var(--surface-2)",
                        color: active ? "#fff" : "var(--text)",
                      }
                }
              >
                <link.icon size={15} />
                <span className="flex-1">{link.label}</span>
                {badge > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                    style={{
                      background: active ? "rgba(255,255,255,0.25)" : "linear-gradient(135deg, #2563EB, #F97316)",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
