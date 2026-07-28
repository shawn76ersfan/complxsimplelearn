"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { SquarePen, Trash2, Menu, X, ArrowUp, PanelLeftClose, PanelLeft } from "lucide-react";
import { StarkMessage } from "@/components/stark/StarkMessage";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hey! I'm Stark — your AI learning assistant for ComplxSimple. Ask me anything about your lessons, the crosswords, homework, or any tech concept in Hardware, AI, Cybersecurity, HTML, or Linux. What can I help you with?",
};

const SUGGESTIONS = [
  "What tracks can I learn?",
  "How do the crosswords work?",
  "Explain what a CPU does",
  "What is the CIA triad?",
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
  const conversations = useQuery(api.conversations.list);
  const deleteConvo = useMutation(api.conversations.deleteConversation);

  const [activeConvoId, setActiveConvoId] = useState<Id<"starkConversations"> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"starkConversations"> | null>(null);

  const dbMessages = useQuery(
    api.conversations.getMessages,
    activeConvoId ? { conversationId: activeConvoId } : "skip"
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!dbMessages) return;
    if (dbMessages.length === 0) {
      setMessages([GREETING]);
    } else {
      setMessages(dbMessages.map((m) => ({ role: m.role, content: m.content })));
    }
  }, [dbMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "24px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const startNewChat = useCallback(() => {
    setActiveConvoId(null);
    setMessages([GREETING]);
    setInput("");
    setError(null);
    setMobileSidebarOpen(false);
  }, []);

  const loadConversation = useCallback((id: Id<"starkConversations">) => {
    setActiveConvoId(id);
    setError(null);
    setMobileSidebarOpen(false);
  }, []);

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

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const history = messages.filter((m) => m.content !== GREETING.content);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const { reply, conversationId } = await sendMessage({
        conversationId: activeConvoId ?? undefined,
        userText: text,
        history,
      });
      if (!activeConvoId) setActiveConvoId(conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
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
  const isFreshChat = messages.length === 1 && messages[0]?.content === GREETING.content;

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
      {/* Desktop sidebar (animated collapse) */}
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

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="relative z-10 flex flex-col h-full"
            style={{
              width: "280px",
              background: "var(--stark-sidebar)",
              borderRight: "1px solid var(--stark-border)",
            }}
          >
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--stark-bg)" }}>
        {/* Top bar */}
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
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
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: "var(--stark-muted)" }}
          >
            <Menu size={16} />
          </button>
          <h1 className="text-sm font-medium truncate" style={{ color: "var(--stark-text)" }}>
            {activeTitle ?? "New chat"}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {messages.map((msg, i) => (
              <StarkMessage
                key={i}
                role={msg.role}
                content={msg.content}
                showCopy={msg.role === "assistant" && msg.content !== GREETING.content}
              />
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-4 rounded-sm animate-pulse"
                  style={{ background: "var(--stark-accent)" }}
                />
                <span className="text-sm" style={{ color: "var(--stark-muted)" }}>
                  Stark is thinking…
                </span>
              </div>
            )}

            {isFreshChat && !loading && (
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

            {error && (
              <p className="text-sm" style={{ color: "#ef4444" }}>
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
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
                  placeholder="Write a message..."
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
                    <span style={{ fontFamily: "var(--font-stark), sans-serif", fontWeight: 900, color: "#14B8A6" }}>S</span>
                    Stark v1
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: input.trim() && !loading ? "#14B8A6" : "var(--stark-border)",
                      color: input.trim() && !loading ? "#fff" : "var(--stark-muted)",
                    }}
                    aria-label="Send message"
                  >
                    <ArrowUp size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-xs mt-3" style={{ color: "var(--stark-muted)" }}>
              Stark is AI and can make mistakes. Please double-check responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
