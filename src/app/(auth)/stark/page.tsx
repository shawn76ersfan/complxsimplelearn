"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { SquarePen, Trash2, Menu, X, ArrowUp, PanelLeftClose, PanelLeft } from "lucide-react";
import { StarkMessage } from "@/components/stark/StarkMessage";
import { CoachProgressCard } from "@/components/stark/CoachProgressCard";
import { CoachSetupPanel } from "@/components/stark/CoachSetupPanel";

type ChatMessage = { role: "user" | "assistant"; content: string };
type StarkMode = "default" | "coach";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hey! I'm Stark — your AI learning assistant for ComplxSimple. Ask me about your lessons, crosswords, homework, Linux, AWS, Azure, Git, Docker, Kubernetes, Terraform, Ansible, CI/CD, Prometheus, Grafana, or any other tech concept. What can I help you with?",
};

const COACH_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "You're in **Coach Mode (Beta)** — still being built, with more capabilities coming soon.\n\nPaste or upload your resume below. I'll parse it, score it with Cassandra's structured rubric (not a made-up number), then coach you bullet-by-bullet. Optional: paste a job description for honest keyword gap analysis.\n\nThanks for trying it early — feedback helps us improve!",
};

const SUGGESTIONS = [
  "What is the DevOps learning roadmap?",
  "Explain AWS VPCs in simple terms",
  "What is the difference between Docker and Kubernetes?",
  "Help me understand my current homework",
];

const COACH_SUGGESTIONS = [
  "Improve my weakest bullet",
  "Make this shorter",
  "Make it ATS-friendly",
  "Make this sound more technical",
  "Tailor this to the job description",
];

const STARK_VARS = {
  light: {
    "--stark-bg": "#f5f3ef",
    "--stark-sidebar": "#ebe8e3",
    "--stark-surface": "#ffffff",
    "--stark-border": "#d4d0c8",
    "--stark-text": "#1a1a1a",
    "--stark-muted": "#6b6560",
    "--stark-accent": "#c96442",
    "--stark-hover": "#e0dcd4",
    "--stark-active": "#d8d3cb",
  },
  dark: {
    "--stark-bg": "#212121",
    "--stark-sidebar": "#171717",
    "--stark-surface": "#2f2f2f",
    "--stark-border": "#3a3a3a",
    "--stark-text": "#ececec",
    "--stark-muted": "#9b9b9b",
    "--stark-accent": "#d97757",
    "--stark-hover": "#2a2a2a",
    "--stark-active": "#333333",
  },
} as const;

function useStarkTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export default function StarkPage() {
  const theme = useStarkTheme();
  const vars = STARK_VARS[theme];

  const sendMessage = useAction(api.chat.sendMessage);
  const reviewResume = useAction(api.resumeCoach.reviewResume);
  const coachMessage = useAction(api.resumeCoach.coachMessage);
  const conversations = useQuery(api.conversations.list);
  const careerTracks = useQuery(api.resumeCoach.listCareerTracks);
  const deleteConvo = useMutation(api.conversations.deleteConversation);

  const [mode, setMode] = useState<StarkMode>("default");
  const [activeConvoId, setActiveConvoId] = useState<Id<"starkConversations"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"starkConversations"> | null>(null);
  /** When set, the last assistant message streams in with a typewriter animation */
  const [streamKey, setStreamKey] = useState<string | null>(null);
  const pendingStreamRef = useRef(false);

  const dbMessages = useQuery(
    api.conversations.getMessages,
    activeConvoId ? { conversationId: activeConvoId } : "skip",
  );

  const progress = useQuery(
    api.resumeCoach.getProgress,
    mode === "coach" && activeConvoId ? { conversationId: activeConvoId } : "skip",
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const greetingContent = mode === "coach" ? COACH_GREETING.content : GREETING.content;

  /* eslint-disable react-hooks/set-state-in-effect -- Convex query results hydrate the selected conversation. */
  useEffect(() => {
    if (!dbMessages) return;
    if (dbMessages.length === 0) {
      setMessages([{ role: "assistant", content: greetingContent }]);
      return;
    }
    const mapped = dbMessages.map((m) => ({ role: m.role, content: m.content }));
    setMessages(mapped);
    if (pendingStreamRef.current) {
      pendingStreamRef.current = false;
      const last = dbMessages[dbMessages.length - 1];
      if (last?.role === "assistant") {
        setStreamKey(`${last._id}`);
      }
    }
  }, [dbMessages, greetingContent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, reviewing]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "24px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const startNewChat = useCallback(() => {
    pendingStreamRef.current = false;
    setStreamKey(null);
    setActiveConvoId(null);
    setMessages([
      {
        role: "assistant",
        content: mode === "coach" ? COACH_GREETING.content : GREETING.content,
      },
    ]);
    setInput("");
    setError(null);
    setMobileSidebarOpen(false);
  }, [mode]);

  const switchMode = useCallback((next: StarkMode) => {
    pendingStreamRef.current = false;
    setStreamKey(null);
    setMode(next);
    setActiveConvoId(null);
    setMessages([
      {
        role: "assistant",
        content: next === "coach" ? COACH_GREETING.content : GREETING.content,
      },
    ]);
    setInput("");
    setError(null);
  }, []);

  const loadConversation = useCallback(
    (id: Id<"starkConversations">) => {
      pendingStreamRef.current = false;
      setStreamKey(null);
      const convo = conversations?.find((c) => c._id === id);
      if (convo?.mode === "coach") setMode("coach");
      else setMode("default");
      setActiveConvoId(id);
      setError(null);
      setMobileSidebarOpen(false);
    },
    [conversations],
  );

  async function handleDelete(id: Id<"starkConversations">, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConvo({ conversationId: id });
      if (activeConvoId === id) startNewChat();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReview(payload: {
    rawText: string;
    careerTrack: "devops" | "software" | "it_support" | "data" | "consulting";
    jobDescription?: string;
    fileKey?: string;
    fileName?: string;
  }) {
    setReviewing(true);
    setError(null);
    pendingStreamRef.current = true;
    try {
      const result = await reviewResume({
        conversationId: activeConvoId ?? undefined,
        rawText: payload.rawText,
        careerTrack: payload.careerTrack,
        jobDescription: payload.jobDescription,
        fileKey: payload.fileKey,
        fileName: payload.fileName,
      });
      // Messages are persisted server-side; hydrate via getMessages query + stream.
      setActiveConvoId(result.conversationId);
    } catch (err) {
      pendingStreamRef.current = false;
      setError(err instanceof Error ? err.message : "Resume review failed. Try again.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading || reviewing) return;

    const history = messages.filter(
      (m) => m.content !== GREETING.content && m.content !== COACH_GREETING.content,
    );
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setError(null);
    setLoading(true);
    pendingStreamRef.current = true;

    try {
      if (mode === "coach") {
        if (!activeConvoId) {
          pendingStreamRef.current = false;
          setError("Paste and score your resume first, then ask coaching questions.");
          setMessages((prev) => prev.slice(0, -1));
          setLoading(false);
          return;
        }
        const { reply, conversationId } = await coachMessage({
          conversationId: activeConvoId,
          userText: text,
          history,
        });
        if (!activeConvoId) setActiveConvoId(conversationId);
        setStreamKey(`local-${Date.now()}`);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        pendingStreamRef.current = false;
      } else {
        const { reply, conversationId } = await sendMessage({
          conversationId: activeConvoId ?? undefined,
          userText: text,
          history,
        });
        if (!activeConvoId) setActiveConvoId(conversationId);
        setStreamKey(`local-${Date.now()}`);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        pendingStreamRef.current = false;
      }
    } catch {
      pendingStreamRef.current = false;
      setError("Stark had trouble responding. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const activeTitle = conversations?.find((c) => c._id === activeConvoId)?.title;
  const isFreshChat =
    messages.length === 1 &&
    (messages[0]?.content === GREETING.content ||
      messages[0]?.content === COACH_GREETING.content);

  const latest = progress?.latestReview as
    | {
        strengthLabel: string;
        overallScore: number;
        readinessLabel: string;
        milestones: Array<{ title: string; potentialGain: number }>;
        categoryScores: Array<{ label: string; score: number }>;
        jdMatch?: {
          matchScore: number;
          evidenced: string[];
          missingRequired: string[];
        } | null;
        scoreChangeSummary?: string;
        rubricVersion?: string;
      }
    | null
    | undefined;

  const activeVersionNumber = progress?.versions.find(
    (v) => v._id === progress.activeVersionId,
  )?.versionNumber;

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="stark-logo-dot inline-block w-2 h-2 rounded-full" style={{ background: "#14B8A6" }} />
          <span className="stark-logo-text text-xl">STARK</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center transition-colors"
            style={{ color: "var(--stark-muted)" }}
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--stark-muted)" }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={startNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ color: "var(--stark-text)", background: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--stark-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <SquarePen size={16} />
          New chat
        </button>
      </div>

      <div className="px-4 pt-2 pb-1">
        <p className="text-xs font-medium" style={{ color: "var(--stark-muted)" }}>
          Recents
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {!conversations || conversations.length === 0 ? (
          <p className="text-xs text-center py-6 px-3" style={{ color: "var(--stark-muted)" }}>
            No conversations yet
          </p>
        ) : (
          conversations.map((convo) => {
            const isActive = convo._id === activeConvoId;
            return (
              <div
                key={convo._id}
                onClick={() => loadConversation(convo._id)}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                style={{
                  background: isActive ? "var(--stark-active)" : "transparent",
                  color: isActive ? "var(--stark-text)" : "var(--stark-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "var(--stark-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span className="flex-1 text-sm truncate">{convo.title}</span>
                {convo.mode === "coach" && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                    style={{ background: "rgba(20,184,166,0.2)", color: "#14B8A6" }}
                  >
                    Coach β
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleDelete(convo._id, e)}
                  disabled={deletingId === convo._id}
                  className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--stark-muted)" }}
                  aria-label="Delete conversation"
                >
                  {deletingId === convo._id ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div
      className="stark-chat flex"
      style={{
        ...vars,
        height: "calc(100vh - 56px)",
        overflow: "hidden",
        background: "var(--stark-bg)",
        color: "var(--stark-text)",
      } as React.CSSProperties}
    >
      <aside
        className="hidden md:flex flex-col flex-shrink-0 h-full overflow-hidden"
        style={{
          width: sidebarOpen ? "260px" : "0px",
          background: "var(--stark-sidebar)",
          borderRight: sidebarOpen ? "1px solid var(--stark-border)" : "1px solid transparent",
          transition: "width 0.22s ease, border-color 0.22s ease",
        }}
      >
        <div className="flex flex-col h-full" style={{ width: "260px" }}>
          {SidebarContent}
        </div>
      </aside>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              className="absolute inset-0"
              style={{ background: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              className="relative z-10 flex flex-col h-full"
              style={{
                width: "280px",
                background: "var(--stark-sidebar)",
                borderRight: "1px solid var(--stark-border)",
              }}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              {SidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--stark-bg)" }}>
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{ borderBottom: "1px solid var(--stark-border)" }}
        >
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center transition-colors"
              style={{ color: "var(--stark-muted)" }}
              aria-label="Open sidebar"
            >
              <PanelLeft size={16} />
            </button>
          )}
          <motion.button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--stark-muted)" }}
            whileTap={{ scale: 0.88, rotate: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            aria-label="Open menu"
          >
            <Menu size={16} />
          </motion.button>
          <h1 className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: "var(--stark-text)" }}>
            {activeTitle ?? (mode === "coach" ? "Resume Coach" : "New chat")}
          </h1>
          <div
            className="relative flex rounded-xl p-0.5 flex-shrink-0"
            style={{ background: "var(--stark-surface)", border: "1px solid var(--stark-border)" }}
          >
            {(
              [
                ["default", "Ask Stark"],
                ["coach", "Coach Mode"],
              ] as const
            ).map(([id, label]) => {
              const active = mode === id;
              return (
                <motion.button
                  key={id}
                  type="button"
                  onClick={() => switchMode(id)}
                  className="relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: active ? "#fff" : "var(--stark-muted)" }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 520, damping: 28 }}
                >
                  {active && (
                    <motion.span
                      layoutId="stark-mode-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: "#14B8A6" }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                  {id === "coach" && (
                    <span
                      className="relative text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded"
                      style={{
                        background: active ? "rgba(255,255,255,0.22)" : "rgba(20,184,166,0.18)",
                        color: active ? "#fff" : "#14B8A6",
                      }}
                    >
                      Beta
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {mode === "coach" && (
              <>
                <div
                  className="rounded-2xl px-4 py-3 flex items-start gap-3"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(20,184,166,0.14), rgba(45,212,191,0.06))",
                    border: "1px solid rgba(20,184,166,0.35)",
                  }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0 mt-0.5"
                    style={{ background: "#14B8A6", color: "#fff" }}
                  >
                    Beta
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--stark-text)" }}>
                      Coach Mode is in beta
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--stark-muted)" }}>
                      We&apos;re actively improving scoring, PDF parsing, and coaching flows.
                      More capabilities coming soon — thanks for testing early!
                    </p>
                  </div>
                </div>

                <CoachSetupPanel
                  tracks={careerTracks}
                  busy={reviewing}
                  hasActiveVersion={!!progress?.activeVersionId}
                  onReview={handleReview}
                />

                {latest && (
                  <CoachProgressCard
                    strengthLabel={latest.strengthLabel}
                    overallScore={latest.overallScore}
                    readinessLabel={latest.readinessLabel}
                    milestones={latest.milestones ?? []}
                    categoryScores={latest.categoryScores ?? []}
                    improvementSummary={progress?.improvementSummary}
                    scoreChangeSummary={latest.scoreChangeSummary}
                    jdMatch={latest.jdMatch}
                    versionNumber={activeVersionNumber}
                    rubricVersion={latest.rubricVersion}
                  />
                )}

                {progress && progress.versions.length > 1 && (
                  <div
                    className="flex flex-wrap items-center gap-2 text-xs"
                    style={{ color: "var(--stark-muted)" }}
                  >
                    <span className="font-semibold" style={{ color: "var(--stark-text)" }}>
                      Versions
                    </span>
                    {progress.versions.map((v, i) => (
                      <span key={v._id} className="flex items-center gap-2">
                        {i > 0 && <span>→</span>}
                        <span
                          className="px-2 py-1 rounded-lg"
                          style={{
                            background: "var(--stark-surface)",
                            border: "1px solid var(--stark-border)",
                            color: "var(--stark-text)",
                          }}
                        >
                          v{v.versionNumber}
                          {v.overallScore != null ? ` · ${v.overallScore}` : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {messages.map((msg, i) => {
              const isLast = i === messages.length - 1;
              const isGreeting =
                msg.content === GREETING.content || msg.content === COACH_GREETING.content;
              const shouldStream =
                !!streamKey &&
                isLast &&
                msg.role === "assistant" &&
                !isGreeting;

              return (
                <StarkMessage
                  key={shouldStream ? streamKey : `${i}-${msg.role}`}
                  role={msg.role}
                  content={msg.content}
                  stream={shouldStream}
                  showCopy={msg.role === "assistant" && !isGreeting}
                />
              );
            })}

            {(loading || reviewing) && (
              <div className="flex items-center gap-3 py-1">
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="inline-block w-2 h-2 rounded-full"
                      style={{
                        background: "#14B8A6",
                        animation: `stark-bounce 1s ease-in-out ${d * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm" style={{ color: "var(--stark-muted)" }}>
                  {reviewing ? "Parsing resume & scoring rubric…" : "Stark is crafting a reply…"}
                </span>
                <style>{`
                  @keyframes stark-bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
                    40% { transform: translateY(-5px); opacity: 1; }
                  }
                `}</style>
              </div>
            )}

            {isFreshChat && !loading && !reviewing && mode === "default" && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="text-sm px-4 py-2 rounded-full transition-colors"
                    style={{
                      background: "var(--stark-surface)",
                      color: "var(--stark-text)",
                      border: "1px solid var(--stark-border)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {mode === "coach" && !!progress?.activeVersionId && !loading && !reviewing && (
              <div className="flex flex-wrap gap-2 pt-1">
                {COACH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="text-sm px-4 py-2 rounded-full transition-colors"
                    style={{
                      background: "var(--stark-surface)",
                      color: "var(--stark-text)",
                      border: "1px solid var(--stark-border)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="flex-shrink-0 px-4 sm:px-6 pb-5 pt-2">
          <div className="max-w-3xl mx-auto">
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "var(--stark-surface)",
                border: "1px solid var(--stark-border)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              }}
            >
              <div className="px-4 pt-3 pb-2.5">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === "coach"
                      ? "Ask to improve a bullet, shorten it, make it ATS-friendly…"
                      : "Write a message..."
                  }
                  rows={1}
                  className="w-full resize-none bg-transparent outline-none text-sm"
                  style={{ color: "var(--stark-text)", lineHeight: "1.5", minHeight: "24px", maxHeight: "160px" }}
                />
                <div className="flex items-center justify-between pt-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      background: "var(--stark-bg)",
                      color: "var(--stark-muted)",
                      border: "1px solid var(--stark-border)",
                    }}
                  >
                    <motion.span
                      style={{
                        fontFamily: "var(--font-stark), sans-serif",
                        fontWeight: 900,
                        display: "inline-block",
                      }}
                      animate={{
                        color: ["#14B8A6", "#2DD4BF", "#0D9488", "#5EEAD4", "#14B8A6"],
                        textShadow: [
                          "0 0 0px rgba(20,184,166,0)",
                          "0 0 10px rgba(45,212,191,0.65)",
                          "0 0 4px rgba(13,148,136,0.35)",
                          "0 0 12px rgba(94,234,212,0.55)",
                          "0 0 0px rgba(20,184,166,0)",
                        ],
                        scale: [1, 1.08, 1, 1.06, 1],
                      }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      S
                    </motion.span>
                    {mode === "coach" ? "Coach Mode · Beta" : "Stark v1"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading || reviewing}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: input.trim() && !loading && !reviewing ? "#14B8A6" : "var(--stark-border)",
                      color: input.trim() && !loading && !reviewing ? "#fff" : "var(--stark-muted)",
                    }}
                    aria-label="Send message"
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-xs mt-3" style={{ color: "var(--stark-muted)" }}>
              {mode === "coach"
                ? "Coach Mode is in beta — scores use a weighted rubric; more capabilities coming soon. Double-check important details."
                : "Stark is AI and can make mistakes. Please double-check responses."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
