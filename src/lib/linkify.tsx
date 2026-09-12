import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s<]+)/gi;

function sanitizeHref(raw: string): string | null {
  try {
    const url = new URL(raw.replace(/[),.;!?]+$/g, ""));
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Turn http(s) URLs into safe links. Everything else stays plain text. */
export function linkifyText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE);
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const href = sanitizeHref(match[0]);
    if (href) {
      parts.push(
        <a
          key={`url-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          style={{ color: "var(--primary)" }}
        >
          {href}
        </a>,
      );
    } else {
      parts.push(match[0]);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}
