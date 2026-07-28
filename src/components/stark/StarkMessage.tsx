"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import toast from "react-hot-toast";
import { StarkCodeBlock } from "./StarkCodeBlock";

type Props = {
  role: "user" | "assistant";
  content: string;
  showCopy?: boolean;
};

export function StarkMessage({ role, content, showCopy = true }: Props) {
  const [copied, setCopied] = useState(false);

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
      <div className="flex justify-end">
        <div
          className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{ background: "var(--stark-surface)", color: "var(--stark-text)" }}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group/msg">
      <div
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
          {content}
        </ReactMarkdown>
      </div>

      {showCopy && (
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="p-1.5 rounded-md transition-colors hover:opacity-80"
            style={{ color: "var(--stark-muted)" }}
            aria-label="Copy message"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
      )}
    </div>
  );
}
