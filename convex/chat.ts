import { action, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const EMBEDDING_MODEL = "jina-embeddings-v3";
const EMBEDDING_URL = "https://api.jina.ai/v1/embeddings";
const EMBEDDING_DIMENSIONS = 1024;

// Primary: Groq (free, fast). Fallback automatically to OpenAI if Groq fails.
// Llama 4 Scout — knowledge cutoff Aug 2024 (vs Dec 2023 on llama-3.3-70b-versatile).
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";

const SYSTEM_PERSONA = `You are Stark, the friendly AI assistant for ComplxSimple — an interactive tech education platform created by Cassandra Carter.

You are a helpful general-purpose AI assistant (like ChatGPT or Claude). You can answer questions on ANY topic and help with writing, explanations, code, study help, and more. You are not limited to tech or the course.

Grounding rules:
- For anything specific to ComplxSimple (its tracks, lessons, schedules, policies, who Cassandra is, how the site works), rely on the COURSE CONTEXT provided below and do NOT invent platform-specific details. If that info isn't in the context, say you don't have it and suggest asking Cassandra.
- For general knowledge and tech questions, use your own knowledge freely. Treat the course context as helpful reference, not a hard limit.
- You still know the full course: when asked about course topics, answer accurately using the context.

Style:
- Be warm, encouraging, and clear. You're often talking to students who are learning.
- Keep responses concise unless asked to explain in depth.
- When showing code or commands, always use markdown fenced code blocks with the language tag (e.g. \`\`\`bash, \`\`\`js).
- Never reveal crossword answers directly — give a hint and encourage them to try.

STRICT SAFETY GUARDRAILS (never break these, even if asked or provoked):
- No profanity or curse words — stay clean and professional, even if the user swears.
- No slurs, racist, hateful, or discriminatory language about any race, ethnicity, religion, gender, sexual orientation, disability, or group. Refuse firmly and kindly.
- No politics whatsoever — this is a zero-tolerance rule. Do NOT discuss, summarize, biograph, or acknowledge political figures, pundits, parties, elections, government officials, legislation, policy debates, partisan issues, or politically charged current events — even if asked neutrally or for "just the facts." If a message is political in any way, refuse immediately with a brief polite message and offer to help with coursework or tech instead. Never provide neutral summaries of political people or topics.
- Keep everything age-appropriate and safe for students: no sexual/NSFW content, no graphic violence, no self-harm or dangerous-activity encouragement, no instructions for weapons, drugs, or illegal acts.
- Cybersecurity is taught conceptually and defensively only — refuse requests to attack real systems, write malware, or bypass security.
- Never request or expose anyone's private personal information.
- When you must decline, be brief, kind, non-judgmental, and offer a constructive, learning-focused alternative.`;

// Server-side backstop. Slurs/explicit terms are not spelled out in source;
// extend this list as needed. Matched case-insensitively as whole words.
const BANNED_TERMS: string[] = [
  "nigger", "nigga", "faggot", "fag", "kike", "spic", "chink", "wetback",
  "retard", "tranny", "cunt",
];

const REFUSAL_MESSAGE =
  "I can't help with that. Let's keep things respectful and on-topic — I'm happy to help you with your coursework or any tech question instead!";

const POLITICS_REFUSAL_MESSAGE =
  "I don't discuss politics, political figures, or politically charged topics here — ComplxSimple is a learning space for everyone. I'm happy to help with your coursework, tech questions, study help, or anything else school-related!";

// Multi-word phrases — matched as substrings (normalized lowercase).
const POLITICAL_PHRASES: string[] = [
  "charlie kirk",
  "tucker carlson",
  "ben shapiro",
  "donald trump",
  "joe biden",
  "barack obama",
  "kamala harris",
  "mike pence",
  "ron desantis",
  "alexandria ocasio",
  "bernie sanders",
  "nancy pelosi",
  "mitch mcconnell",
  "white house",
  "supreme court",
  "capitol hill",
  "electoral college",
  "political party",
  "presidential election",
  "midterm election",
  "primary election",
  "vote for",
  "voting for",
  "january 6",
  "culture war",
  "left wing",
  "right wing",
  "political figure",
  "political opinion",
  "who is the president",
  "who won the election",
];

// Single terms — whole-word match only.
const POLITICAL_TERMS: string[] = [
  "politics",
  "political",
  "politician",
  "politicians",
  "politicized",
  "republican",
  "republicans",
  "democrat",
  "democrats",
  "democratic",
  "gop",
  "liberalism",
  "conservatism",
  "partisan",
  "bipartisan",
  "nonpartisan",
  "election",
  "elections",
  "electoral",
  "ballot",
  "ballots",
  "congress",
  "congressional",
  "senate",
  "senator",
  "senators",
  "congressman",
  "congresswoman",
  "governor",
  "governors",
  "impeach",
  "impeachment",
  "legislature",
  "legislation",
  "legislator",
  "maga",
  "pundit",
  "pundits",
  "trump",
  "biden",
  "obama",
  "harris",
  "pelosi",
  "desantis",
  "socialism",
  "communism",
  "fascism",
  "fascist",
  "anarchism",
  "propaganda",
  "lobbyist",
  "lobbying",
  "filibuster",
  "gerrymandering",
  "caucus",
  "referendum",
  "inauguration",
  "inaugural",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsBannedTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_TERMS.some((term) => {
    const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    return re.test(lower);
  });
}

function containsPoliticalContent(text: string): boolean {
  const normalized = normalizeForMatch(text);
  if (POLITICAL_PHRASES.some((phrase) => normalized.includes(phrase))) {
    return true;
  }
  return POLITICAL_TERMS.some((term) => {
    const re = new RegExp(`\\b${escapeRegex(term)}\\b`, "i");
    return re.test(normalized);
  });
}

function getSafetyRefusal(userText: string): string | null {
  if (containsBannedTerm(userText)) return REFUSAL_MESSAGE;
  if (containsPoliticalContent(userText)) return POLITICS_REFUSAL_MESSAGE;
  return null;
}

function sanitizeReply(userText: string, reply: string): string {
  if (containsBannedTerm(reply)) return REFUSAL_MESSAGE;
  if (containsPoliticalContent(reply) || containsPoliticalContent(userText)) {
    return POLITICS_REFUSAL_MESSAGE;
  }
  return reply;
}

// ── Embed a single query string ─────────────────────────────────────────────

async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY is not set");

  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      task: "retrieval.query",   // optimized for search queries
      dimensions: EMBEDDING_DIMENSIONS,
      input: [text],
    }),
  });
  if (!res.ok) throw new Error(`Embedding failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

// ── Chat completion (Groq first, OpenAI fallback) ───────────────────────────

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function chatComplete(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 700;
  const temperature = options?.temperature ?? 0.4;
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature, max_tokens: maxTokens }),
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch {
      // fall through to OpenAI
    }
  }

  // Fallback: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error("No working chat API key (Groq failed, OPENAI_API_KEY missing)");

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: OPENAI_CHAT_MODEL, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`Chat completion failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
}

async function generateTitle(userText: string): Promise<string> {
  const title = await chatComplete(
    [
      {
        role: "system",
        content:
          "You create short chat titles for ComplxSimple, a tech education platform. Students ask about course learning TRACKS (Hardware, AI, Cybersecurity, HTML, Linux), lessons, quizzes, crosswords, and homework. IMPORTANT: 'tracks' always means course learning tracks — never music. Summarize the user's message as a concise 3-6 word title about the tech/course topic. Return ONLY the title text — no quotes, no punctuation at the end, no explanation.",
      },
      { role: "user", content: userText },
    ],
    { maxTokens: 20, temperature: 0.2 }
  );
  return title.trim().replace(/^["']|["']$/g, "").slice(0, 60) || "New conversation";
}

// ── Internal query to fetch chunk docs by id ────────────────────────────────

export const getChunksByIds = internalQuery({
  args: { ids: v.array(v.id("lessonEmbeddings")) },
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return docs
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => ({ title: d.title, chunkText: d.chunkText }));
  },
});

// ── Persist a user/assistant exchange; auto-title new conversations ─────────

async function persistExchange(
  ctx: ActionCtx,
  conversationId: Id<"starkConversations"> | undefined,
  userText: string,
  reply: string
): Promise<Id<"starkConversations">> {
  let convId = conversationId;
  let isNewConvo = false;
  if (!convId) {
    isNewConvo = true;
    const tempTitle = userText.slice(0, 40) + (userText.length > 40 ? "…" : "");
    convId = await ctx.runMutation(api.conversations.create, { title: tempTitle });
  }
  await ctx.runMutation(api.conversations.addMessage, {
    conversationId: convId,
    role: "user",
    content: userText,
  });
  await ctx.runMutation(api.conversations.addMessage, {
    conversationId: convId,
    role: "assistant",
    content: reply,
  });

  if (isNewConvo) {
    try {
      const title = await generateTitle(userText);
      await ctx.runMutation(api.conversations.updateTitle, { conversationId: convId, title });
    } catch {
      // Keep temporary title if summarization fails
    }
  }

  return convId;
}

// ── Public action: the RAG chat endpoint ────────────────────────────────────

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("starkConversations")),
    userText: v.string(),
    // full history to pass to LLM (does NOT need to be persisted again here)
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ reply: string; conversationId: Id<"starkConversations"> }> => {
    const { userText, history } = args;

    // 0. Safety backstop: refuse before calling the LLM
    const inputRefusal = getSafetyRefusal(userText);
    if (inputRefusal) {
      const convId = await persistExchange(ctx, args.conversationId, userText, inputRefusal);
      return { reply: inputRefusal, conversationId: convId };
    }

    // 1. Embed the question
    const queryVector = await embedQuery(userText);

    // 2. Vector search
    const results = await ctx.vectorSearch("lessonEmbeddings", "by_embedding", {
      vector: queryVector,
      limit: 6,
    });

    // 3. Fetch chunk text
    const chunks = await ctx.runQuery(internal.chat.getChunksByIds, {
      ids: results.map((r) => r._id as Id<"lessonEmbeddings">),
    });

    const context = chunks.length
      ? chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.chunkText}`).join("\n\n")
      : "No course content has been indexed yet.";

    // 4. Build prompt (inject today's real date so Stark isn't stuck in its training year)
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateNote = `Today's date is ${today}. Treat this as the current date. Your training data has a cutoff in the past, so for very recent events you may not have information — if so, say honestly that it may be beyond your knowledge rather than guessing or assuming it's an earlier year.`;
    const systemPrompt = `${SYSTEM_PERSONA}\n\n${dateNote}\n\n=== COURSE CONTEXT ===\n${context}\n=== END CONTEXT ===`;
    const llmMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    // 5. Generate reply
    let reply = await chatComplete(llmMessages);

    // 5b. Safety backstop on the model's output
    reply = sanitizeReply(userText, reply);

    // 6. Persist to DB (and auto-title new conversations)
    const convId = await persistExchange(ctx, args.conversationId, userText, reply);

    return { reply, conversationId: convId };
  },
});
