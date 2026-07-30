import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

const EMBEDDING_MODEL = "jina-embeddings-v3";
const EMBEDDING_URL = "https://api.jina.ai/v1/embeddings";
const EMBEDDING_DIMENSIONS = 1024;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Flattens a lesson's block-based JSON content into plain readable text. */
function lessonContentToText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const parts: string[] = [];
    for (const b of blocks) {
      switch (b.type) {
        case "heading":
        case "paragraph":
        case "code":
        case "list":
          if (b.content) parts.push(String(b.content));
          break;
        case "flashcard":
          if (b.front || b.back) parts.push(`${b.front}: ${b.back}`);
          break;
        case "fillblank":
          if (b.prompt) parts.push(`Fill in the blank: ${b.prompt}`);
          break;
        case "quiz":
          if (b.question) {
            const opts = Array.isArray(b.options) ? b.options.join(", ") : "";
            const answer = Array.isArray(b.options) ? b.options[b.correctIndex] : "";
            parts.push(`Quiz: ${b.question} Options: ${opts}. Correct answer: ${answer}.${b.explanation ? " " + b.explanation : ""}`);
          }
          break;
        case "match":
        case "crossword":
          if (Array.isArray(b.pairs)) {
            parts.push(
              b.pairs.map((p: { term: string; definition: string }) => `${p.term} = ${p.definition}`).join("; ")
            );
          }
          break;
        case "playground":
          if (b.code) parts.push(`Code example (${b.language}):\n${b.code}`);
          break;
      }
    }
    return parts.join("\n");
  } catch {
    return content;
  }
}

/** Calls Jina AI's embedding endpoint for a batch of document strings. */
async function embedBatch(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) throw new Error("JINA_API_KEY is not set in Convex environment variables");

  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      task: "retrieval.passage",   // optimized for documents being stored
      dimensions: EMBEDDING_DIMENSIONS,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jina embeddings error (${res.status}): ${text}`);
  }

  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
}

// ── Internal DB helpers (actions can't touch the DB directly) ───────────────

export const getAllContent = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
    const questions = await ctx.db.query("quizQuestions").collect();
    const knowledge = await ctx.db.query("knowledgeDocs").collect();
    const assignments = await ctx.db.query("assignments").collect();
    return { tracks, lessons, questions, knowledge, assignments };
  },
});

/** Split a long doc into ~1200-char chunks on blank lines so retrieval stays focused. */
function chunkText(text: string, maxLen = 1200): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return [trimmed];

  const paragraphs = trimmed.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current && (current.length + para.length + 2) > maxLen) {
      chunks.push(current.trim());
      current = "";
    }
    // A single very long paragraph: hard-split it.
    if (para.length > maxLen) {
      for (let i = 0; i < para.length; i += maxLen) {
        chunks.push(para.slice(i, i + maxLen).trim());
      }
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

export const clearEmbeddings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("lessonEmbeddings").collect();
    await Promise.all(all.map((e) => ctx.db.delete(e._id)));
  },
});

export const insertEmbedding = internalMutation({
  args: {
    lessonId: v.optional(v.id("lessons")),
    trackId: v.optional(v.id("tracks")),
    source: v.string(),
    title: v.string(),
    chunkText: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("lessonEmbeddings", args);
  },
});

// ── Shared rebuild logic ────────────────────────────────────────────────────

async function rebuildIndex(ctx: ActionCtx): Promise<{ embedded: number }> {
  const { tracks, lessons, questions, knowledge, assignments } = await ctx.runQuery(
    internal.embeddings.getAllContent,
    {}
  );

  // Build a flat list of chunks to embed
  type Chunk = {
    lessonId?: Doc<"lessons">["_id"];
    trackId?: Doc<"tracks">["_id"];
    source: string;
    title: string;
    chunkText: string;
  };
  const chunks: Chunk[] = [];

    // Track-level chunks
    for (const t of tracks) {
      chunks.push({
        trackId: t._id,
        source: "track",
        title: `Track: ${t.name}`,
        chunkText: `Track "${t.name}" (${t.slug}). ${t.description}`,
      });
    }

    // Lesson-level chunks (with their quiz questions appended)
    for (const l of lessons) {
      const track = tracks.find((t) => t._id === l.trackId);
      const lessonQuestions = questions.filter((q) => q.lessonId === l._id);
      const qText = lessonQuestions
        .map((q) => {
          const answer = q.options[q.correctIndex];
          return `Q: ${q.question} A: ${answer}.${q.explanation ? " " + q.explanation : ""}`;
        })
        .join("\n");

      const body = lessonContentToText(l.content);
      const chunkText = [
        `Track: ${track?.name ?? "Unknown"}`,
        `Lesson: ${l.title}`,
        `Type: ${l.type === "mandatory" ? "Mandatory Work (graded crossword)" : l.type}`,
        body,
        qText,
      ]
        .filter(Boolean)
        .join("\n");

      chunks.push({
        lessonId: l._id,
        trackId: l.trackId,
        source: "lesson",
        title: `${track?.name ?? ""} — ${l.title}`,
        chunkText,
      });
    }

    // Static platform FAQ chunks so Stark knows how the SITE works
    const FAQ: Array<{ title: string; text: string }> = [
      {
        title: "About ComplxSimple",
        text: "ComplxSimple is an interactive DevOps and cloud engineering learning platform created by Cassandra Carter. Its core program covers Linux Administration, AWS, Microsoft Azure, Git and GitHub, Docker, Kubernetes, Terraform, Ansible, CI/CD with Jenkins and GitHub Actions, and monitoring with Prometheus and Grafana. Hardware, AI, and cybersecurity remain available as supplementary foundations. HTML is not part of the current program.",
      },
      {
        title: "How learning works",
        text: "Students follow a structured DevOps and cloud roadmap on the Learn page, complete lessons in order, take quizzes, finish Mandatory Work crosswords, submit homework, and build production-style portfolio projects. Each completed lesson earns XP and counts toward track progress.",
      },
      {
        title: "Mandatory Work / Crosswords",
        text: "Each track has a Mandatory Work crossword challenge. Students fill in tech terms using the clues. Correct words automatically turn green and lock in place. Students can retry as many times as they want. Scores are recorded for the teacher.",
      },
      {
        title: "Homework and assignments",
        text: "Teachers assign DevOps and cloud homework with due dates on the Teacher Hub. Students see homework status (pending, complete, or late) on the Homework page. Assignments include Linux administration reports, Bash automation, cloud architecture designs, GitHub pull requests, Docker builds, Kubernetes deployments, Terraform infrastructure, Ansible playbooks, CI/CD pipelines, and Prometheus/Grafana dashboards.",
      },
      {
        title: "Teacher feedback",
        text: "Cassandra can send students feedback, notices, and warnings. These appear in the student's feedback inbox on the dashboard. Warnings show as a banner and must be acknowledged.",
      },
      {
        title: "Watch Party",
        text: "The Learn page has a Watch Party section (coming soon) where the class can watch tech content together and discuss in real time with Cassandra and classmates.",
      },
      {
        title: "Who is Cassandra Carter",
        text: "Cassandra Carter is the instructor and creator of ComplxSimple. She mentors students in IT and tech careers. Students can contact her through the platform for help.",
      },
    ];
    for (const f of FAQ) {
      chunks.push({ source: "faq", title: f.title, chunkText: `${f.title}. ${f.text}` });
    }

    // Homework is searchable so Stark can explain current assignments.
    for (const assignment of assignments) {
      const track = assignment.trackId
        ? tracks.find((item) => item._id === assignment.trackId)
        : undefined;
      chunks.push({
        trackId: assignment.trackId,
        source: "assignment",
        title: assignment.title,
        chunkText: [
          `Homework: ${assignment.title}`,
          track ? `Track: ${track.name}` : "",
          assignment.description ?? "",
          `Due: ${new Date(assignment.dueDate).toISOString()}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    // Teacher-authored knowledge docs (chunked if long)
    for (const doc of knowledge) {
      const header = doc.category ? `${doc.category} — ${doc.title}` : doc.title;
      const pieces = chunkText(doc.content);
      pieces.forEach((piece, idx) => {
        const partLabel = pieces.length > 1 ? ` (part ${idx + 1})` : "";
        chunks.push({
          source: "knowledge",
          title: `${header}${partLabel}`,
          chunkText: `${header}\n${piece}`,
        });
      });
    }

    // Embed in batches of 64, then store
    await ctx.runMutation(internal.embeddings.clearEmbeddings, {});

    const BATCH = 64;
    let embedded = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vectors = await embedBatch(batch.map((c) => c.chunkText));
      await Promise.all(
        batch.map((c, j) =>
          ctx.runMutation(internal.embeddings.insertEmbedding, {
            lessonId: c.lessonId,
            trackId: c.trackId,
            source: c.source,
            title: c.title,
            chunkText: c.chunkText,
            embedding: vectors[j],
          })
        )
      );
      embedded += batch.length;
    }

  return { embedded };
}

// ── Public action: (re)build the entire embedding index ─────────────────────

export const generateAllEmbeddings = action({
  args: {},
  handler: async (ctx): Promise<{ embedded: number }> => {
    return await rebuildIndex(ctx);
  },
});

// ── Internal action: scheduled by knowledge mutations to refresh the index ──

export const rebuildAll = internalAction({
  args: {},
  handler: async (ctx): Promise<{ embedded: number }> => {
    return await rebuildIndex(ctx);
  },
});
