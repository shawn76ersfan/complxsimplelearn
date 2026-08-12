"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { StarkCodeBlock } from "./StarkCodeBlock";

type Props = {
  content: string;
  /** When true, reveal with a typewriter-style stream */
  animate?: boolean;
  onDone?: () => void;
};

export function StreamingText({ content, animate = false, onDone }: Props) {
  const [visibleLen, setVisibleLen] = useState(animate ? 0 : content.length);
  const done = !animate || visibleLen >= content.length;

  useEffect(() => {
    if (!animate) {
      setVisibleLen(content.length);
      return;
    }

    setVisibleLen(0);
    let i = 0;
    let raf = 0;
    let last = performance.now();

    const chunk =
      content.length > 4000 ? 14 : content.length > 1500 ? 9 : content.length > 600 ? 5 : 3;
    const intervalMs = 14;

    const tick = (now: number) => {
      if (now - last >= intervalMs) {
        last = now;
        i = Math.min(content.length, i + chunk);
        setVisibleLen(i);
      }
      if (i < content.length) {
        raf = requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, content, onDone]);

  const visible = content.slice(0, visibleLen);

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="stark-markdown text-sm leading-relaxed max-w-none"
      style={{ color: "var(--stark-text)" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--stark-accent)" }}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-2 pl-3 my-3 italic"
              style={{ borderColor: "var(--stark-border)", color: "var(--stark-muted)" }}
            >
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className ?? "");
            const codeString = String(children).replace(/\n$/, "");

            if (match) {
              return <StarkCodeBlock language={match[1]} code={codeString} />;
            }
            if (codeString.includes("\n")) {
              return <StarkCodeBlock language="text" code={codeString} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded text-[0.8125rem]"
                style={{
                  background: "var(--stark-surface)",
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {visible}
      </ReactMarkdown>

      {!done && (
        <motion.span
          aria-hidden
          className="inline-block w-[2px] h-[1.05em] ml-0.5 align-[-0.2em] rounded-full"
          style={{
            background: "linear-gradient(180deg, #2DD4BF, #14B8A6)",
            boxShadow: "0 0 12px rgba(20,184,166,0.85)",
          }}
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}
