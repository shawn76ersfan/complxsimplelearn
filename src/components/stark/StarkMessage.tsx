"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { StreamingText } from "./StreamingText";

type Props = {
  role: "user" | "assistant";
  content: string;
  showCopy?: boolean;
  stream?: boolean;
  onStreamEnd?: () => void;
};

export function StarkMessage({
  role,
  content,
  showCopy = true,
  stream = false,
  onStreamEnd,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [streamDone, setStreamDone] = useState(!stream);

  const handleStreamDone = useCallback(() => {
    setStreamDone(true);
    onStreamEnd?.();
  }, [onStreamEnd]);

  async function handleCopyMessage() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  if (role === "user") {
    return (
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div
          className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--stark-surface)", color: "var(--stark-text)" }}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="group/msg">
      <StreamingText
        content={content}
        animate={stream}
        onDone={handleStreamDone}
      />

      {showCopy && streamDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity"
        >
          <button
            type="button"
            onClick={handleCopyMessage}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: "var(--stark-muted)" }}
            aria-label="Copy message"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </motion.div>
      )}
    </div>
  );
}
