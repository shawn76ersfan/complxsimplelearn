/** Shared LLM helpers for Stark chat + Coach Mode (Groq primary, OpenAI fallback). */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
/** llama-3.3-70b-versatile retired on 2026-08-16 for free/developer tiers. */
const GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] as const;
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function textFromContent(content: unknown): string | null {
  if (typeof content === "string" && content.trim()) return content;
  if (!Array.isArray(content)) return null;
  const parts = content
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part === "object" && part !== null && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
  return parts.trim() ? parts : null;
}

function messageContent(json: unknown): string | null {
  if (typeof json !== "object" || json === null || !("choices" in json)) return null;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (typeof first !== "object" || first === null) return null;
  if ("message" in first) {
    const message = (first as { message?: unknown }).message;
    if (typeof message === "object" && message !== null && "content" in message) {
      const fromContent = textFromContent((message as { content?: unknown }).content);
      if (fromContent) return fromContent;
    }
  }
  if ("text" in first) {
    const text = textFromContent((first as { text?: unknown }).text);
    if (text) return text;
  }
  return null;
}

export async function chatComplete(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; preferOpenAI?: boolean },
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 700;
  const temperature = options?.temperature ?? 0.4;

  const tryOpenAI = async (): Promise<string | null> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;
    try {
      const res = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        console.warn(`OpenAI chat failed (${res.status}): ${await res.text()}`);
        return null;
      }
      const content = messageContent(await res.json());
      return content ? dedupeModelReply(content) : null;
    } catch (error) {
      console.warn("OpenAI request failed:", error);
      return null;
    }
  };

  const postGroq = async (
    groqKey: string,
    model: string,
  ): Promise<{ ok: boolean; status: number; body: string; content: string | null }> => {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        reasoning_effort: "low",
        max_completion_tokens: Math.max(maxTokens, 900),
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, body, content: null };
    }
    try {
      return { ok: true, status: res.status, body, content: messageContent(JSON.parse(body)) };
    } catch {
      return { ok: true, status: res.status, body, content: null };
    }
  };

  const tryGroq = async (): Promise<string | null> => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return null;

    for (const model of GROQ_MODELS) {
      try {
        const result = await postGroq(groqKey, model);
        if (!result.ok) {
          console.warn(`Groq chat failed (${model}, ${result.status}): ${result.body}`);
          continue;
        }
        if (result.content) return dedupeModelReply(result.content);
        console.warn(`Groq chat returned empty content (${model})`);
      } catch (error) {
        console.warn(`Groq request failed (${model}):`, error);
      }
    }
    return null;
  };

  if (options?.preferOpenAI) {
    const openai = await tryOpenAI();
    if (openai) return openai;
    const groq = await tryGroq();
    if (groq) return groq;
  } else {
    const groq = await tryGroq();
    if (groq) return groq;
    const openai = await tryOpenAI();
    if (openai) return openai;
  }

  throw new Error("Stark is temporarily unavailable. Please try again in a moment.");
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[#*_`>|\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const wa = new Set(normalizeForCompare(a).split(" ").filter((w) => w.length > 2));
  const wb = new Set(normalizeForCompare(b).split(" ").filter((w) => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) {
    if (wb.has(w)) inter += 1;
  }
  return (2 * inter) / (wa.size + wb.size);
}

/** Strip reasoning dumps and repeated restatements from a single model reply. */
export function dedupeModelReply(text: string): string {
  let out = text.trim();
  if (!out) return out;

  out = out
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/^\s*(?:reasoning|analysis)\s*:[\s\S]*?\n\s*(?:final answer|answer)\s*:\s*/i, "")
    .trim();

  const splitRestate = out.split(
    /\n+(?:---+|\*{0,2}\s*(?:let me (?:put that another way|rephrase|try again|say that again|explain (?:that|it) again)|to (?:summarize|sum up)|in (?:other|simpler) words)\s*:?\s*\*{0,2})\n+/i,
  );
  if (splitRestate.length > 1) {
    const first = splitRestate[0]?.trim() ?? "";
    const rest = splitRestate.slice(1).join("\n\n").trim();
    if (first.length > 80 && tokenOverlap(first, rest) >= 0.55) {
      out = first;
    }
  }

  const mid = Math.floor(out.length / 2);
  if (mid > 160) {
    const firstHalf = out.slice(0, mid).trim();
    const secondHalf = out.slice(mid).trim();
    if (tokenOverlap(firstHalf, secondHalf) >= 0.68) {
      out = firstHalf;
    }
  }

  const kept: string[] = [];
  for (const para of out.split(/\n{2,}/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const isDup = kept.some((prev) => tokenOverlap(prev, trimmed) >= 0.84);
    if (!isDup) kept.push(trimmed);
  }
  return kept.join("\n\n").trim();
}

/** Extract first JSON object from an LLM reply (supports fenced blocks). */
export function extractJsonObject(text: string): unknown {
  const parsed = tryExtractJsonObject(text);
  if (parsed === null) {
    throw new Error("No JSON object found in model response");
  }
  return parsed;
}

/** Like extractJsonObject but returns null instead of throwing. */
export function tryExtractJsonObject(text: string): unknown | null {
  if (!text || !text.trim()) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [
    fenced?.[1]?.trim(),
    text.trim(),
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1).trim(),
  ].filter((c): c is string => !!c && c.length > 1);

  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) continue;
    const slice = candidate.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      try {
        return JSON.parse(slice.replace(/,\s*([\]}])/g, "$1"));
      } catch {
        continue;
      }
    }
  }
  return null;
}
