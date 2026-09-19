"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Code2, ImagePlus, Pin, Reply, Send, ThumbsUp, Trash2, X } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { linkifyText } from "@/lib/linkify";
import { isStaff } from "@/lib/roles";
import toast from "react-hot-toast";

function roleLabel(role: string): string {
  if (role === "admin") return "Lead";
  if (role === "teacher") return "Instructor";
  return "Student";
}

function typingLine(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names[0]} and ${names.length - 1} others are typing`;
}

function renderBoardBody(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
      return (
        <pre
          key={i}
          className="mt-2 mb-1 overflow-x-auto rounded-lg px-3 py-2 text-[12px] leading-relaxed"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          <code>{inner || " "}</code>
        </pre>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {linkifyText(part)}
      </span>
    );
  });
}

export function BoardChat({
  cohortId,
  cohortName,
  cohortColor,
}: {
  cohortId: Id<"cohorts">;
  cohortName: string;
  cohortColor: string;
}) {
  const me = useQuery(api.users.getMyProfile);
  const [limit, setLimit] = useState(40);
  const [now, setNow] = useState(() => Date.now());
  const page = useQuery(api.board.list, { cohortId, limit });
  const boardReady = page !== undefined;
  const typers = useQuery(
    api.board.listTyping,
    boardReady ? { cohortId, now } : "skip",
  );
  const post = useMutation(api.board.post);
  const remove = useMutation(api.board.remove);
  const setPinned = useMutation(api.board.setPinned);
  const toggleLike = useMutation(api.board.toggleLike);
  const setTyping = useMutation(api.board.setTyping);
  const markBoardRead = useMutation(api.notifications.markTypeRead);
  const uploadFile = useUploadFile(api.board);
  const fileRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const pinAfterSend = useRef(false);
  const lastBottomId = useRef<string | null>(null);
  const prevLimit = useRef(limit);
  const prevHeight = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    _id: Id<"boardMessages">;
    authorName: string;
    preview: string;
  } | null>(null);
  const staff = isStaff(me?.role);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    stickToBottom.current = true;
    pinAfterSend.current = false;
    lastBottomId.current = null;
    prevLimit.current = 40;
    prevHeight.current = 0;
  }, [cohortId]);

  useEffect(() => {
    const el = scroller.current;
    if (!el || page === undefined) return;

    const latestId = page.messages.at(-1)?._id ?? null;

    if (limit !== prevLimit.current) {
      const delta = el.scrollHeight - prevHeight.current;
      if (delta > 0) el.scrollTop += delta;
      prevLimit.current = limit;
      prevHeight.current = el.scrollHeight;
      lastBottomId.current = latestId;
      return;
    }

    const shouldFollow =
      pinAfterSend.current ||
      lastBottomId.current === null ||
      (stickToBottom.current && latestId !== lastBottomId.current);

    lastBottomId.current = latestId;
    prevHeight.current = el.scrollHeight;
    if (shouldFollow) {
      el.scrollTop = el.scrollHeight;
      pinAfterSend.current = false;
    }
  }, [page, limit]);

  useEffect(() => {
    void markBoardRead({ type: "board_post" }).catch(() => undefined);
  }, [cohortId, markBoardRead]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (!boardReady) return;
      void setTyping({ cohortId, typing: false }).catch(() => undefined);
    };
  }, [boardReady, cohortId, setTyping]);

  function bumpTyping() {
    if (!boardReady) return;
    const t = Date.now();
    if (t - lastTypingSent.current > 2000) {
      lastTypingSent.current = t;
      void setTyping({ cohortId, typing: true }).catch(() => undefined);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void setTyping({ cohortId, typing: false }).catch(() => undefined);
    }, 2800);
  }

  async function handleSend() {
    if (sending) return;
    if (!body.trim() && !file) return;
    setSending(true);
    try {
      let imageKey: string | undefined;
      let imageContentType: string | undefined;
      let imageSize: number | undefined;
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Photos must be 5 MB or smaller");
          setSending(false);
          return;
        }
        if (!file.type.startsWith("image/")) {
          toast.error("Only photos can be attached");
          setSending(false);
          return;
        }
        imageKey = await uploadFile(file);
        imageContentType = file.type;
        imageSize = file.size;
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      pinAfterSend.current = true;
      stickToBottom.current = true;
      await post({
        cohortId,
        body: body.trim(),
        imageKey,
        imageContentType,
        imageSize,
        parentId: replyTo?._id,
      });
      setBody("");
      setFile(null);
      setReplyTo(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setSending(false);
    }
  }

  function insertCodeFence() {
    setBody((prev) => (prev ? `${prev}\n\`\`\`\n\n\`\`\`\n` : "```\n\n```"));
  }

  function PinnedNote({
    m,
  }: {
    m: {
      _id: Id<"boardMessages">;
      body: string;
      imageUrl: string | null;
      createdAt: number;
      author: { name: string; imageUrl?: string };
      likeCount: number;
      likedByMe: boolean;
    };
  }) {
    return (
      <div
        className="flex gap-2.5 items-start rounded-xl px-2.5 py-2"
        style={{ background: "color-mix(in srgb, var(--surface) 70%, transparent)" }}
      >
        <div
          className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          {m.author.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.author.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(m.author.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-tight">
            <span className="font-semibold" style={{ color: "var(--text)" }}>{m.author.name}</span>
            <span className="ml-1.5" style={{ color: "var(--text-muted)" }}>
              {new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
          </p>
          {m.body ? (
            <p className="text-[13px] leading-snug mt-0.5 line-clamp-3 whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {linkifyText(m.body.replace(/```[\s\S]*?```/g, "[code]"))}
            </p>
          ) : null}
          {m.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt="" className="mt-1.5 rounded-lg max-h-20 w-auto" />
          )}
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <button
              type="button"
              onClick={() =>
                toggleLike({ messageId: m._id }).catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : "Could not react"),
                )
              }
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: m.likedByMe ? cohortColor : "var(--text-muted)" }}
            >
              <ThumbsUp size={11} fill={m.likedByMe ? "currentColor" : "none"} />
              {m.likeCount > 0 ? m.likeCount : null}
            </button>
            <button
              type="button"
              onClick={() =>
                setReplyTo({
                  _id: m._id,
                  authorName: m.author.name,
                  preview: m.body.trim().slice(0, 80) || (m.imageUrl ? "Photo" : ""),
                })
              }
              className="text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              Reply
            </button>
            {staff && (
              <button
                type="button"
                onClick={() =>
                  setPinned({ messageId: m._id, pinned: false }).catch((err: unknown) =>
                    toast.error(err instanceof Error ? err.message : "Could not unpin"),
                  )
                }
                className="text-[11px]"
                style={{ color: "var(--text-muted)" }}
              >
                Unpin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function MessageCard({
    m,
  }: {
    m: {
      _id: Id<"boardMessages">;
      authorId: string;
      body: string;
      imageUrl: string | null;
      createdAt: number;
      pinned: boolean;
      replyTo: { _id: Id<"boardMessages">; authorName: string; preview: string } | null;
      author: {
        name: string;
        state?: string;
        imageUrl?: string;
        role: string;
      };
      likeCount: number;
      likedByMe: boolean;
    };
  }) {
    const mine = me?._id === m.authorId;
    const canDelete = mine || staff;
    return (
      <article className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
        <div
          className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          {m.author.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.author.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(m.author.name)
          )}
        </div>
        <div className={`max-w-[min(100%,28rem)] ${mine ? "items-end" : ""} flex flex-col gap-1`}>
          <div
            className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs ${mine ? "flex-row-reverse" : ""}`}
            style={{ color: "var(--text-muted)" }}
          >
            <span className="font-semibold" style={{ color: "var(--text)" }}>{m.author.name}</span>
            {m.author.state && <span>{m.author.state}</span>}
            <span>{roleLabel(m.author.role)}</span>
            {m.pinned && (
              <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: cohortColor }}>
                <Pin size={10} /> Pinned
              </span>
            )}
            <span>{new Date(m.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          </div>
          {m.replyTo && (
            <p className="text-[11px] px-2 py-1 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
              Replying to <span className="font-semibold">{m.replyTo.authorName}</span>
              {m.replyTo.preview ? ` — ${m.replyTo.preview}` : ""}
            </p>
          )}
          <div
            className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
            style={{
              background: mine ? "color-mix(in srgb, var(--primary) 14%, var(--surface))" : "var(--surface-2)",
              border: m.pinned ? `1.5px solid ${cohortColor}` : "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            {m.body ? renderBoardBody(m.body) : null}
            {m.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.imageUrl}
                alt=""
                className={`rounded-xl max-h-64 w-auto ${m.body ? "mt-2" : ""}`}
              />
            )}
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${mine ? "flex-row-reverse" : ""}`}>
            <button
              type="button"
              onClick={() =>
                toggleLike({ messageId: m._id }).catch((err: unknown) =>
                  toast.error(err instanceof Error ? err.message : "Could not react"),
                )
              }
              className="inline-flex items-center gap-1 text-[11px] hover:opacity-100"
              style={{ color: m.likedByMe ? cohortColor : "var(--text-muted)", opacity: m.likedByMe || m.likeCount > 0 ? 1 : 0.6 }}
              title={m.likedByMe ? "Remove thumbs up" : "Thumbs up"}
            >
              <ThumbsUp size={11} fill={m.likedByMe ? "currentColor" : "none"} />
              {m.likeCount > 0 ? m.likeCount : "Like"}
            </button>
            <button
              type="button"
              onClick={() => setReplyTo({ _id: m._id, authorName: m.author.name, preview: m.body.trim().slice(0, 80) || (m.imageUrl ? "Photo" : "") })}
              className="inline-flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100"
              style={{ color: "var(--text-muted)" }}
            >
              <Reply size={11} /> Reply
            </button>
            {staff && (
              <button
                type="button"
                onClick={() =>
                  setPinned({ messageId: m._id, pinned: !m.pinned }).catch((err: unknown) =>
                    toast.error(err instanceof Error ? err.message : "Could not pin"),
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                <Pin size={11} /> {m.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => remove({ messageId: m._id }).catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not remove"))}
                className="inline-flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const messages = page?.messages;
  const pinned = page?.pinned ?? [];
  const pinnedIds = new Set(pinned.map((m) => m._id));
  const thread = (messages ?? []).filter((m) => !pinnedIds.has(m._id));
  const typerNames = (typers ?? []).map((t) => t.name);

  return (
    <div className="card overflow-hidden flex flex-col" style={{ minHeight: "28rem", maxHeight: "min(72vh, 760px)" }}>
      <div className="px-5 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--text-muted)" }}>The Board</p>
          <h2 className="font-serif font-bold" style={{ color: "var(--text)" }}>{cohortName}</h2>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ background: `${cohortColor}22`, color: cohortColor }}>
          Cohort only
        </span>
      </div>

      {pinned.length > 0 && (
        <div
          className="flex-shrink-0 px-3 py-2 space-y-1.5"
          style={{
            borderBottom: "1px solid var(--border)",
            background: `color-mix(in srgb, ${cohortColor} 6%, var(--surface))`,
            maxHeight: "30%",
            overflowY: "auto",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] px-1 inline-flex items-center gap-1" style={{ color: cohortColor }}>
            <Pin size={10} /> Pinned
          </p>
          {pinned.map((m) => (
            <PinnedNote key={`pin-${m._id}`} m={m} />
          ))}
        </div>
      )}

      <div
        ref={scroller}
        onScroll={() => {
          const el = scroller.current;
          if (!el) return;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
        }}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--surface-2)" }} />)}
          </div>
        ) : thread.length === 0 && pinned.length === 0 ? (
          <div className="notebook-sheet card p-8 text-center">
            <p className="font-serif font-bold" style={{ color: "var(--text)" }}>Blank board</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              This thread is for the whole class — instructors and students. Ask questions, paste commands in a code block, and keep it civil.
            </p>
          </div>
        ) : (
          <>
            {page?.hasMore && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setLimit((n) => n + 40)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  Load earlier posts
                </button>
              </div>
            )}
            {thread.length === 0 && pinned.length > 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                Everything so far is pinned above. New posts will show up here.
              </p>
            ) : (
              thread.map((m) => (
                <MessageCard key={m._id} m={m} />
              ))
            )}
            {typerNames.length > 0 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cohortColor, animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cohortColor, animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: cohortColor, animationDelay: "240ms" }} />
                </span>
                {typingLine(typerNames)}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t p-3 space-y-2" style={{ borderColor: "var(--border)" }}>
        {replyTo && (
          <div className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            <Reply size={12} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1 min-w-0">
              Replying to <span className="font-semibold">{replyTo.authorName}</span>
              {replyTo.preview ? ` — ${replyTo.preview}` : ""}
            </span>
            <button type="button" onClick={() => setReplyTo(null)}><X size={12} /></button>
          </div>
        )}
        {file && (
          <div className="flex items-center gap-2 text-xs px-2" style={{ color: "var(--text-muted)" }}>
            <ImagePlus size={12} />
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <label className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <ImagePlus size={16} style={{ color: "var(--text-muted)" }} />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={insertCodeFence}
            title="Insert a code block"
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <Code2 size={16} />
          </button>
          <textarea
            rows={2}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (e.target.value.trim()) bumpTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            maxLength={2000}
            placeholder="Write to the class… Shift+Enter for a new line"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            disabled={sending || (!body.trim() && !file)}
            onClick={() => void handleSend()}
            className="btn-ink h-10 px-4 disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[11px] px-1" style={{ color: "var(--text-muted)" }}>
          Reply to keep a question with its answer. Instructors can pin up to 3 posts and remove anything that does not belong.
        </p>
      </div>
    </div>
  );
}
