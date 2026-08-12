/** Shared LLM helpers for Stark chat + Coach Mode (Groq primary, OpenAI fallback). */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatComplete(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; preferOpenAI?: boolean },
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 700;
  const temperature = options?.temperature ?? 0.4;

  const tryOpenAI = async (): Promise<string | null> => {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return null;
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
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  };

  const tryGroq = async (): Promise<string | null> => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return null;
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        console.warn(`Groq chat failed (${res.status}): ${await res.text()}`);
        return null;
      }
      const json = await res.json();
      return json.choices?.[0]?.message?.content ?? null;
    } catch (error) {
      console.warn("Groq request failed:", error);
      return null;
    }
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

  throw new Error("No working chat API key (Groq and OpenAI unavailable)");
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
    // Sometimes models wrap JSON in prose before/after without fences
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
      // Repair common trailing-comma issues
      try {
        return JSON.parse(slice.replace(/,\s*([\]}])/g, "$1"));
      } catch {
        continue;
      }
    }
  }
  return null;
}
