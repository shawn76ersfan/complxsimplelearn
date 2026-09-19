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
    "Hey — I'm Stark, your ComplxSimple chatbot. Ask me anything: how the site works, study plans across time zones, Linux/AWS/Docker, homework, or a concept you missed on a quiz (I'll teach it, not hand you the answer key). What do you need?",
};

const COACH_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "You're in **Coach Mode**. Paste or upload your resume and I'll score it with Cassandra's rubric, then we can build a rewrite plan, interview prep, and portfolio map.\n\nOptional: paste a job description for honest keyword-gap analysis. I won't invent experience.",
};

const SUGGESTIONS = [
  "Help me plan this week around live class in my timezone",
  "I missed a quiz — walk me through the concept",
  "How do I submit homework?",
  "Explain Docker vs Kubernetes simply",
];

const COACH_SUGGESTIONS = [
  "Build my rewrite plan",
  "Give me interview questions from this resume",
  "What portfolio project should I start?",
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
    "--stark-accent": "#0D9488",
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
    "--stark-accent": "#14B8A6",
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
  const diagnoseImprovement = useAction(api.resumeCoach.diagnoseImprovement);
  const rewriteAffectedBullets = useAction(api.resumeCoach.rewriteAffectedBullets);
  const generateCareerKit = useAction(api.coachKit.generateCareerKit);
  const conversations = useQuery(api.conversations.list);
  const careerTracks = useQuery(api.resumeCoach.listCareerTracks);
  const deleteConvo = useMutation(api.conversations.deleteConversation);

  const [mode, setMode] = useState<StarkMode>("default");
  const [activeConvoId, setActiveConvoId] = useState<Id<"starkConversations"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [diagnosingKey, setDiagnosingKey] = useState<string | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [kitBusy, setKitBusy] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<{
    title: string;
    holdingBack: string;
    evidence: string[];
    recommendations: string[];
    bulletIds: string[];
  } | null>(null);
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
  const careerKit = useQuery(
    api.coachKit.getCareerKit,
    mode === "coach" && activeConvoId ? { conversationId: activeConvoId } : "skip",
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
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
    setMessages((prev) => {
      const prevLast = prev[prev.length - 1];
      const nextLast = mapped[mapped.length - 1];
      if (
        prevLast?.role === "assistant" &&
        nextLast?.role === "assistant" &&
        prevLast.content === nextLast.content &&
        prev.length === mapped.length + 1 &&
        prev[0]?.content === greetingContent
      ) {
        return prev;
      }
      return mapped;
    });
    if (pendingStreamRef.current) {
      pendingStreamRef.current = false;
      const last = dbMessages[dbMessages.length - 1];
      if (last?.role === "assistant") {
        setStreamKey((prev) => prev ?? `${last._id}`);
      }
    }
  }, [dbMessages, greetingContent]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, []);

  useEffect(() => {
    const box = scrollBoxRef.current;
    if (!box) return;
    box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
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
    jobLevel: "internship" | "entry" | "early_career" | "mid" | "senior";
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
        jobLevel: payload.jobLevel,
        jobDescription: payload.jobDescription,
        fileKey: payload.fileKey,
        fileName: payload.fileName,
      });
      // Messages are persisted server-side; hydrate via getMessages query + stream.
      setActiveConvoId(result.conversationId);
      setActiveDiagnosis(null);
    } catch (err) {
      pendingStreamRef.current = false;
      setError(err instanceof Error ? err.message : "Resume review failed. Try again.");
    } finally {
      setReviewing(false);
    }
  }

  async function handleDiagnose(milestone: {
    title: string;
    categoryId?: string;
    bulletIds?: string[];
  }) {
    if (!activeConvoId || diagnosingKey || rewriting) return;
    const key = milestone.categoryId ?? milestone.title;
    setDiagnosingKey(key);
    setError(null);
    pendingStreamRef.current = true;
    try {
      const result = await diagnoseImprovement({
        conversationId: activeConvoId,
        categoryId: milestone.categoryId,
        title: milestone.title,
        bulletIds: milestone.bulletIds,
      });
      setActiveDiagnosis({
        title: result.title,
        holdingBack: result.holdingBack,
        evidence: result.evidence,
        recommendations: result.recommendations,
        bulletIds: result.bulletIds,
      });
    } catch (err) {
      pendingStreamRef.current = false;
      setError(err instanceof Error ? err.message : "Could not diagnose that fix. Try again.");
    } finally {
      setDiagnosingKey(null);
    }
  }

  async function handleRewriteAffected(bulletIds: string[]) {
    if (!activeConvoId || rewriting || diagnosingKey) return;
    setRewriting(true);
    setError(null);
    pendingStreamRef.current = true;
    try {
      await rewriteAffectedBullets({ conversationId: activeConvoId, bulletIds });
      setActiveDiagnosis(null);
    } catch (err) {
      pendingStreamRef.current = false;
      setError(err instanceof Error ? err.message : "Could not rewrite those bullets. Try again.");
    } finally {
      setRewriting(false);
    }
  }

  async function handleGenerateKit() {
    if (!activeConvoId || kitBusy) return;
    setKitBusy(true);
    setError(null);
    try {
      await generateCareerKit({ conversationId: activeConvoId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the career kit. Try again.");
    } finally {
      setKitBusy(false);
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
        setStreamKey((prev) => prev ?? `local-${conversationId}`);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        pendingStreamRef.current = false;
      } else {
        const { reply, conversationId } = await sendMessage({
          conversationId: activeConvoId ?? undefined,
          userText: text,
          history,
        });
        if (!activeConvoId) setActiveConvoId(conversationId);
        setStreamKey((prev) => prev ?? `local-${conversationId}`);
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
        positioningSummary?: string | null;
        milestones: Array<{
          title: string;
          potentialGain: number;
          why?: string;
          bulletIds?: string[];
          currentExample?: string;
          strongerExample?: string;
          categoryId?: string;
          currentScore100?: number;
          potentialScore100?: number;
        }>;
        categoryScores: Array<{
          categoryId?: string;
          label: string;
          score: number;
          weight?: number;
          why?: string;
          toReachNext?: string;
          evidence?: Array<{ sectionId: string; quote: string; note: string }>;
        }>;
        jdMatch?: {
          matchScore: number;
          roleTitle?: string;
          evidenced: string[];
          missingRequired: string[];
        } | null;
        redFlags?: Array<{
          id: string;
          severity: "low" | "medium" | "high";
          message: string;
          bulletIds?: string[];
        }>;
        keepAsIs?: Array<{ bulletId: string; reason: string }>;
        competencies?: Array<{ id: string; label: string; score: number }>;
        scoreExplanation?: {
          narrative: string;
          strengths: Array<{ label: string; score100: number; why?: string }>;
          opportunities: Array<{ label: string; score100: number; why?: string }>;
        } | null;
        pathToTarget?: {
          target: number;
          current: number;
          gap: number;
          steps: Array<{ title: string; potentialGain: number; categoryId?: string }>;
          estimatedResult: number;
        } | null;
        scoreChangeSummary?: string;
        rubricVersion?: string;
        jobLevel?: string | null;
      }
    | null
    | undefined;

  const activeVersionNumber = progress?.versions.find(
    (v) => v._id === progress.activeVersionId,
  )?.versionNumber;

  const careerTrackLabel =
    careerTracks?.find((t) => t.id === progress?.careerTrack)?.label ??
    progress?.careerTrack ??
    null;

  const JOB_LEVEL_LABELS: Record<string, string> = {
    internship: "Internship",
    entry: "Entry-level / full-time",
    early_career: "Early career",
    mid: "Mid-level",
    senior: "Senior / leadership",
  };
  const jobLevelKey = latest?.jobLevel ?? progress?.jobLevel ?? null;
  const jobLevelLabel = jobLevelKey
    ? (JOB_LEVEL_LABELS[jobLevelKey] ?? jobLevelKey)
    : null;

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="stark-logo-dot inline-block w-2 h-2 rounded-full" style={{ background: "var(--stark-accent)" }} />
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
                    style={{ background: "color-mix(in srgb, var(--stark-accent) 20%, transparent)", color: "var(--stark-accent)" }}
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
      className="stark-chat flex overflow-hidden"
      style={{
        ...vars,
        position: "fixed",
        top: "3.5rem",
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 1,
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

      <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ background: "var(--stark-bg)" }}>
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
                      style={{ background: "var(--stark-accent)" }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div ref={scrollBoxRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
            {mode === "coach" && (
              <>
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
                    positioningSummary={latest.positioningSummary}
                    careerTrackLabel={careerTrackLabel}
                    jobLevelLabel={jobLevelLabel}
                    milestones={latest.milestones ?? []}
                    categoryScores={latest.categoryScores ?? []}
                    improvementSummary={progress?.improvementSummary}
                    scoreChangeSummary={latest.scoreChangeSummary}
                    scoreExplanation={latest.scoreExplanation}
                    pathToTarget={latest.pathToTarget}
                    jdMatch={latest.jdMatch}
                    redFlags={latest.redFlags}
                    keepAsIs={latest.keepAsIs}
                    competencies={latest.competencies}
                    versionNumber={activeVersionNumber}
                    rubricVersion={latest.rubricVersion}
                    diagnosingKey={diagnosingKey}
                    rewriting={rewriting}
                    activeDiagnosis={activeDiagnosis}
                    onDiagnose={handleDiagnose}
                    onRewriteAffected={handleRewriteAffected}
                    onGenerateKit={handleGenerateKit}
                    kitBusy={kitBusy}
                    careerKit={careerKit}
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
                  key={isLast && msg.role === "assistant" ? "latest-assistant" : `${msg.role}-${i}`}
                  role={msg.role}
                  content={msg.content}
                  stream={shouldStream}
                  showCopy={msg.role === "assistant" && !isGreeting}
                  onStreamEnd={() => setStreamKey(null)}
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
                        background: "var(--stark-accent)",
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
                        fontFamily: "var(--font-sans), sans-serif",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        display: "inline-block",
                      }}
                      animate={{
                        color: ["#0D9488", "#14B8A6", "#0F766E", "#2DD4BF", "#0D9488"],
                        textShadow: [
                          "0 0 0px rgba(13,148,136,0)",
                          "0 0 10px rgba(20,184,166,0.55)",
                          "0 0 4px rgba(15,118,110,0.35)",
                          "0 0 12px rgba(45,212,191,0.45)",
                          "0 0 0px rgba(13,148,136,0)",
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
                    {mode === "coach" ? "Coach Mode" : "Stark"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading || reviewing}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: input.trim() && !loading && !reviewing ? "var(--stark-accent)" : "var(--stark-border)",
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
                ? "Scores use Cassandra’s weighted rubric. Career kit covers rewrite, interview, and portfolio — still double-check important details."
                : "Stark is a helpful chatbot and can make mistakes. Please double-check responses."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
