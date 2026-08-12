import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, requireTeacher } from "./_lib/auth";
import {
  CAREER_TRACK_OPTIONS,
  getRubric,
  isCareerTrack,
  type CareerTrack,
  type RubricCategoryId,
  RUBRIC_VERSION,
} from "./lib/resumeRubrics";
import {
  buildScoreResult,
  explainScoreChange,
  type ParsedResume,
  type ScoreResult,
} from "./lib/resumeScore";
import { chatComplete, tryExtractJsonObject } from "./lib/llmChat";

const careerTrackValidator = v.union(
  v.literal("devops"),
  v.literal("software"),
  v.literal("it_support"),
  v.literal("data"),
  v.literal("consulting"),
);

function emptyParsed(): ParsedResume {
  return {
    contact: {},
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    otherSections: [],
  };
}

function asParsedResume(value: unknown): ParsedResume {
  if (!value || typeof value !== "object") return emptyParsed();
  const o = value as Record<string, unknown>;
  return {
    contact:
      o.contact && typeof o.contact === "object"
        ? (o.contact as ParsedResume["contact"])
        : {},
    summary: typeof o.summary === "string" ? o.summary : undefined,
    education: Array.isArray(o.education)
      ? (o.education as ParsedResume["education"])
      : [],
    experience: Array.isArray(o.experience)
      ? (o.experience as ParsedResume["experience"])
      : [],
    projects: Array.isArray(o.projects)
      ? (o.projects as ParsedResume["projects"])
      : [],
    skills: Array.isArray(o.skills)
      ? o.skills.filter((s): s is string => typeof s === "string")
      : [],
    certifications: Array.isArray(o.certifications)
      ? o.certifications.filter((s): s is string => typeof s === "string")
      : [],
    otherSections: Array.isArray(o.otherSections)
      ? (o.otherSections as ParsedResume["otherSections"])
      : [],
  };
}

function heuristicParseResume(rawText: string): ParsedResume {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = rawText.match(
    /(?:\+?\d{1,2}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/,
  )?.[0];

  const skillsIdx = lines.findIndex((l) => /^skills?\b/i.test(l));
  const skills: string[] = [];
  if (skillsIdx >= 0) {
    const chunk = lines.slice(skillsIdx + 1, skillsIdx + 8).join(" ");
    for (const part of chunk.split(/[,|•·]/)) {
      const s = part.trim();
      if (s.length >= 2 && s.length <= 40) skills.push(s);
    }
  }

  const bullets = lines
    .filter((l) => /^[-*•]/.test(l) || /^o\s+/i.test(l))
    .map((l) => l.replace(/^[-*•]\s*/, "").replace(/^o\s+/i, "").trim())
    .filter((l) => l.length > 8)
    .slice(0, 30);

  return {
    contact: { email, phone },
    summary: undefined,
    education: [],
    experience:
      bullets.length > 0
        ? [
            {
              id: "exp-1",
              raw: bullets.join("\n"),
              bullets: bullets.map((text, i) => ({
                id: `exp-1-b${i + 1}`,
                text,
              })),
            },
          ]
        : [],
    projects: [],
    skills: skills.slice(0, 40),
    certifications: [],
    otherSections: [
      { id: "other-1", title: "Full resume text", raw: rawText.slice(0, 12000) },
    ],
  };
}

async function parseResumeText(rawText: string): Promise<ParsedResume> {
  const system = `You parse student resumes into structured JSON for ComplxSimple Stark Coach.
Return ONLY a JSON object (no markdown fences, no prose) with this shape:
{
  "contact": { "name"?: string, "email"?: string, "phone"?: string, "location"?: string, "links"?: string[] },
  "summary"?: string,
  "education": [{ "id": "edu-1", "raw": string, "school"?: string, "degree"?: string }],
  "experience": [{ "id": "exp-1", "company"?: string, "title"?: string, "dates"?: string, "raw": string, "bullets": [{ "id": "exp-1-b1", "text": string }] }],
  "projects": [{ "id": "proj-1", "name"?: string, "raw": string, "bullets": [{ "id": "proj-1-b1", "text": string }] }],
  "skills": string[],
  "certifications": string[],
  "otherSections": [{ "id": "other-1", "title": string, "raw": string }]
}
Rules:
- Preserve exact bullet wording in bullets[].text and include enough raw text to cite later.
- Assign stable ids as shown (exp-1, exp-1-b1, etc.).
- Do not invent jobs, skills, or certifications that are not in the resume.`;

  try {
    const reply = await chatComplete(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Resume:\n\n${rawText.slice(0, 14000)}\n\nReturn JSON only.`,
        },
      ],
      { maxTokens: 2500, temperature: 0, preferOpenAI: true },
    );
    const parsed = tryExtractJsonObject(reply);
    if (parsed) return asParsedResume(parsed);
    console.warn("Resume parse: no JSON in model reply, using heuristic fallback");
  } catch (err) {
    console.warn("Resume parse failed, using heuristic fallback", err);
  }
  return heuristicParseResume(rawText);
}

type JdParsed = {
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
};

type JdMatch = {
  matchScore: number;
  evidenced: string[];
  missingRequired: string[];
  missingPreferred: string[];
  doNotClaim: string[];
  notes: string;
};

function resumeEvidenceBlob(parsed: ParsedResume): string {
  const parts = [
    parsed.summary ?? "",
    ...parsed.skills,
    ...parsed.certifications,
    ...parsed.experience.flatMap((e) => [
      e.raw,
      ...e.bullets.map((b) => b.text),
    ]),
    ...parsed.projects.flatMap((p) => [
      p.raw,
      ...p.bullets.map((b) => b.text),
    ]),
  ];
  return parts.join("\n").toLowerCase();
}

function keywordEvidenced(keyword: string, blob: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (k.length < 2) return false;
  if (blob.includes(k)) return true;
  // loose token match for multi-word
  const tokens = k.split(/[^a-z0-9.+#]+/).filter((t) => t.length > 2);
  return tokens.length > 0 && tokens.every((t) => blob.includes(t));
}

const COMMON_JD_TECH = [
  "linux", "bash", "python", "java", "javascript", "typescript", "go", "golang",
  "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "terraform", "ansible",
  "jenkins", "github actions", "gitlab ci", "ci/cd", "prometheus", "grafana",
  "elasticsearch", "redis", "postgresql", "mysql", "mongodb", "sql",
  "nginx", "apache", "helm", "argo", "argocd", "git", "linux administration",
  "networking", "tcp/ip", "dns", "vpn", "active directory", "powershell",
  "react", "node.js", "nodejs", "spring", "kafka", "rabbitmq", "splunk",
  "datadog", "cloudformation", "pulumi", "openshift", "vmware", "servicenow",
];

/** Deterministic fallback when the LLM does not return valid JSON. */
function heuristicParseJobDescription(jd: string): JdParsed {
  const lower = jd.toLowerCase();
  const technologies = COMMON_JD_TECH.filter((t) => lower.includes(t)).map((t) =>
    t === "k8s" ? "Kubernetes" : t === "ci/cd" ? "CI/CD" : t.replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  // Lines under Required / Qualifications style headings → requiredSkills
  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const lines = jd.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let bucket: "required" | "preferred" | null = null;
  for (const line of lines) {
    const l = line.toLowerCase();
    if (/required|must have|minimum qualifications|what you.?ll need/.test(l)) {
      bucket = "required";
      continue;
    }
    if (/preferred|nice to have|bonus|plus/.test(l)) {
      bucket = "preferred";
      continue;
    }
    if (/^[-*•]/.test(line) || /^\d+[.)]/.test(line)) {
      const item = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (item.length < 3 || item.length > 80) continue;
      if (bucket === "preferred") preferredSkills.push(item);
      else if (bucket === "required") requiredSkills.push(item);
    }
  }

  const keywords = [...new Set([...technologies, ...requiredSkills.slice(0, 10)])];
  return {
    requiredSkills: requiredSkills.slice(0, 20),
    preferredSkills: preferredSkills.slice(0, 15),
    technologies: technologies.slice(0, 20),
    responsibilities: [],
    qualifications: requiredSkills.slice(0, 15),
    keywords,
  };
}

function jdFromUnknown(raw: unknown): JdParsed | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const arr = (x: unknown) =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : [];
  const parsed: JdParsed = {
    requiredSkills: arr(o.requiredSkills),
    preferredSkills: arr(o.preferredSkills),
    technologies: arr(o.technologies),
    responsibilities: arr(o.responsibilities),
    qualifications: arr(o.qualifications),
    keywords: arr(o.keywords),
  };
  const total =
    parsed.requiredSkills.length +
    parsed.preferredSkills.length +
    parsed.technologies.length +
    parsed.keywords.length;
  return total > 0 ? parsed : null;
}

async function parseJobDescription(jd: string): Promise<JdParsed> {
  const system = `You extract structured fields from a job description.
Reply with ONLY a single JSON object (no markdown, no prose) shaped exactly like:
{"requiredSkills":["..."],"preferredSkills":["..."],"technologies":["..."],"responsibilities":["..."],"qualifications":["..."],"keywords":["..."]}
Use short skill/tool phrases. If a field is unknown use [].`;

  try {
    const reply = await chatComplete(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `Job description:\n\n${jd.slice(0, 8000)}\n\nReturn JSON only.`,
        },
      ],
      { maxTokens: 1200, temperature: 0, preferOpenAI: true },
    );
    const fromLlm = jdFromUnknown(tryExtractJsonObject(reply));
    if (fromLlm) return fromLlm;
    console.warn("JD parse: model reply lacked usable JSON, using heuristic fallback");
  } catch (err) {
    console.warn("JD parse: LLM failed, using heuristic fallback", err);
  }

  return heuristicParseJobDescription(jd);
}

function computeJdMatch(parsedJd: JdParsed, parsedResume: ParsedResume): JdMatch {
  const blob = resumeEvidenceBlob(parsedResume);
  const required = [
    ...new Set([
      ...parsedJd.requiredSkills,
      ...parsedJd.technologies.slice(0, 12),
      ...parsedJd.keywords.slice(0, 12),
    ]),
  ].slice(0, 20);
  const preferred = [...new Set(parsedJd.preferredSkills)].slice(0, 15);

  const evidenced: string[] = [];
  const missingRequired: string[] = [];
  for (const k of required) {
    if (keywordEvidenced(k, blob)) evidenced.push(k);
    else missingRequired.push(k);
  }
  const missingPreferred: string[] = [];
  for (const k of preferred) {
    if (keywordEvidenced(k, blob)) {
      if (!evidenced.includes(k)) evidenced.push(k);
    } else missingPreferred.push(k);
  }

  const reqScore =
    required.length === 0
      ? 70
      : (evidenced.filter((e) => required.includes(e)).length / required.length) *
        70;
  const prefScore =
    preferred.length === 0
      ? 30
      : ((preferred.length - missingPreferred.length) / preferred.length) * 30;
  const matchScore = Math.round(Math.min(100, reqScore + prefScore));

  return {
    matchScore,
    evidenced,
    missingRequired,
    missingPreferred,
    doNotClaim: missingRequired.slice(0, 8),
    notes:
      "Only list skills you can back with experience/project bullets. Missing required items are gaps to learn or demonstrate — do not fabricate them.",
  };
}

type EvalLlmCategory = {
  categoryId: string;
  score: number;
  evidence: Array<{ sectionId: string; quote: string; note: string }>;
  notes: string;
};

async function evaluateCategories(
  track: CareerTrack,
  rawText: string,
  parsed: ParsedResume,
  cassandraGuidance: string,
): Promise<{
  categories: EvalLlmCategory[];
  feedbackMarkdown: string;
}> {
  const rubric = getRubric(track);
  const rubricSpec = rubric.categories
    .map(
      (c) =>
        `- ${c.id} (${c.label}, weight ${c.weight}): ${c.scoringRules}\n  Criteria: ${c.criteria.join("; ")}`,
    )
    .join("\n");

  const system = `You are Stark Resume Coach for ComplxSimple (Cassandra Carter's IT/DevOps education platform).
You SCORE rubric categories 0–10 with EVIDENCE. You do NOT invent an overall 0–100 — that is computed in code.

Return ONLY JSON:
{
  "categories": [
    {
      "categoryId": string,
      "score": number,
      "evidence": [{ "sectionId": string, "quote": string, "note": string }],
      "notes": string
    }
  ],
  "feedbackMarkdown": string
}

Rules:
- Include EVERY category id from the rubric.
- Every major recommendation in feedbackMarkdown must cite a sectionId or bullet id (e.g. exp-1-b2).
- Be specific: quote the weak bullet and suggest a rewrite.
- Never invent employers, metrics, or skills not in the resume.
- Progress-oriented tone (motivating, not punitive).
- Use Cassandra guidance when present, but do not override the rubric structure.

RUBRIC (${rubric.label}, version ${RUBRIC_VERSION}):
${rubricSpec}

CASSANDRA GUIDANCE (optional):
${cassandraGuidance || "(none)"}`;

  const userPayload = JSON.stringify({
    rawResume: rawText.slice(0, 12000),
    parsed,
  });

  try {
    const reply = await chatComplete(
      [
        { role: "system", content: system },
        {
          role: "user",
          content: `${userPayload}\n\nReturn JSON only.`,
        },
      ],
      { maxTokens: 2800, temperature: 0, preferOpenAI: true },
    );

    const obj = tryExtractJsonObject(reply) as Record<string, unknown> | null;
    if (obj) {
      const categories = Array.isArray(obj.categories)
        ? (obj.categories as EvalLlmCategory[])
        : [];
      const feedbackMarkdown =
        typeof obj.feedbackMarkdown === "string"
          ? obj.feedbackMarkdown
          : "Review complete. Ask me to improve any bullet next.";
      if (categories.length > 0) {
        return { categories, feedbackMarkdown };
      }
    }
    console.warn("Category eval: no usable JSON, using heuristic scores");
  } catch (err) {
    console.warn("Category eval failed, using heuristic scores", err);
  }

  // Empty categories → buildScoreResult fills from structural heuristics
  return {
    categories: [],
    feedbackMarkdown:
      "I scored your resume with structural checks (the model reply wasn’t parseable this time). Ask me to improve any bullet — cite ids like exp-1-b1 — and you can re-score with a new version anytime.",
  };
}

function formatProgressCard(score: ScoreResult, jdMatch?: JdMatch | null): string {
  const miles = score.milestones
    .map((m) => `• ${m.title}  (+${m.potentialGain})`)
    .join("\n");
  const cats = score.categoryScores
    .map((c) => `• ${c.label}: ${c.score}/10`)
    .join("\n");
  const jd =
    jdMatch != null
      ? `\n\n**Job match:** ${jdMatch.matchScore}/100\nEvidenced: ${jdMatch.evidenced.slice(0, 8).join(", ") || "—"}\nPriority gaps (do not fabricate): ${jdMatch.missingRequired.slice(0, 6).join(", ") || "—"}`
      : "";

  return `### Resume Strength
**${score.strengthLabel}** · ${score.overallScore}/100  
${score.readinessLabel}

**Next milestones**
${miles}

**Category scores** (rubric ${score.rubricVersion})
${cats}${jd}`;
}

const COACH_PERSONA = `You are Stark Coach Mode for ComplxSimple — an interactive resume coach (not a one-shot reviewer).
You help students improve bullets iteratively: improve → rewrite → shorten → ATS-friendly → more technical → tailor to JD.
Always cite section/bullet ids from the CURRENT resume version when giving advice.
Never invent experience. If they lack evidence for a keyword, say so and suggest how to earn/demonstrate it.
Stay warm, motivating, and specific. Keep Cassandra's rubric in mind.
Safety: no politics, no slurs, no NSFW, no helping fabricate credentials.`;

export const listCareerTracks = query({
  args: {},
  returns: v.array(v.object({ id: careerTrackValidator, label: v.string() })),
  handler: async () => CAREER_TRACK_OPTIONS,
});

export const getProgress = query({
  args: { conversationId: v.id("starkConversations") },
  returns: v.union(
    v.object({
      versions: v.array(
        v.object({
          _id: v.id("resumeVersions"),
          versionNumber: v.number(),
          createdAt: v.number(),
          overallScore: v.union(v.number(), v.null()),
          strengthLabel: v.union(v.string(), v.null()),
        }),
      ),
      latestReview: v.union(v.any(), v.null()),
      improvementSummary: v.union(v.string(), v.null()),
      activeVersionId: v.union(v.id("resumeVersions"), v.null()),
      careerTrack: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) return null;

    const versions = await ctx.db
      .query("resumeVersions")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    versions.sort((a, b) => a.versionNumber - b.versionNumber);

    const reviews = await ctx.db
      .query("resumeReviews")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    reviews.sort((a, b) => a.createdAt - b.createdAt);

    const reviewByVersion = new Map(reviews.map((r) => [r.versionId, r]));

    const versionRows = versions.map((ver) => {
      const rev = reviewByVersion.get(ver._id);
      return {
        _id: ver._id,
        versionNumber: ver.versionNumber,
        createdAt: ver.createdAt,
        overallScore: rev?.overallScore ?? null,
        strengthLabel: rev?.strengthLabel ?? null,
      };
    });

    const latestReview = reviews.length ? reviews[reviews.length - 1] : null;
    let improvementSummary: string | null = null;
    if (reviews.length >= 2) {
      const first = reviews[0];
      const last = reviews[reviews.length - 1];
      const delta = last.overallScore - first.overallScore;
      const days = Math.max(
        1,
        Math.round((last.createdAt - first.createdAt) / (1000 * 60 * 60 * 24)),
      );
      improvementSummary =
        delta === 0
          ? `Score unchanged across ${reviews.length} versions.`
          : `Your resume ${delta > 0 ? "improved" : "changed"} by ${delta > 0 ? "+" : ""}${delta} points across ${reviews.length} versions (${days} day${days === 1 ? "" : "s"}). ${last.scoreChangeSummary ?? ""}`.trim();
    }

    let latestPayload: Record<string, unknown> | null = null;
    if (latestReview) {
      latestPayload = {
        ...latestReview,
        categoryScores: JSON.parse(latestReview.categoryScoresJson),
        milestones: JSON.parse(latestReview.milestonesJson),
        jdMatch: latestReview.jdMatchJson
          ? JSON.parse(latestReview.jdMatchJson)
          : null,
      };
    }

    return {
      versions: versionRows,
      latestReview: latestPayload,
      improvementSummary,
      activeVersionId: convo.activeResumeVersionId ?? null,
      careerTrack: convo.careerTrack ?? null,
    };
  },
});

export const saveVersionAndReview = mutation({
  args: {
    conversationId: v.id("starkConversations"),
    careerTrack: careerTrackValidator,
    rawText: v.string(),
    parsedJson: v.string(),
    jobDescription: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    scoreResultJson: v.string(),
    feedbackMarkdown: v.string(),
    jdMatchJson: v.optional(v.string()),
    scoreChangeSummary: v.optional(v.string()),
  },
  returns: v.object({
    versionId: v.id("resumeVersions"),
    reviewId: v.id("resumeReviews"),
    versionNumber: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");

    const existing = await ctx.db
      .query("resumeVersions")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();
    const versionNumber =
      existing.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;
    const now = Date.now();

    const versionId = await ctx.db.insert("resumeVersions", {
      userId: user._id,
      conversationId: args.conversationId,
      versionNumber,
      rawText: args.rawText,
      parsedJson: args.parsedJson,
      careerTrack: args.careerTrack,
      jobDescription: args.jobDescription,
      fileKey: args.fileKey,
      fileName: args.fileName,
      createdAt: now,
    });

    const score = JSON.parse(args.scoreResultJson) as ScoreResult;

    const reviewId = await ctx.db.insert("resumeReviews", {
      userId: user._id,
      conversationId: args.conversationId,
      versionId,
      rubricVersion: score.rubricVersion,
      careerTrack: args.careerTrack,
      overallScore: score.overallScore,
      strengthLabel: score.strengthLabel,
      readinessLabel: score.readinessLabel,
      categoryScoresJson: JSON.stringify(score.categoryScores),
      milestonesJson: JSON.stringify(score.milestones),
      feedbackMarkdown: args.feedbackMarkdown,
      jdMatchJson: args.jdMatchJson,
      scoreChangeSummary: args.scoreChangeSummary,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      mode: "coach",
      careerTrack: args.careerTrack,
      activeResumeVersionId: versionId,
      updatedAt: now,
    });

    return { versionId, reviewId, versionNumber };
  },
});

/** Full pipeline: parse → evaluate categories → deterministic overall → persist version. */
export const reviewResume = action({
  args: {
    conversationId: v.optional(v.id("starkConversations")),
    rawText: v.string(),
    careerTrack: careerTrackValidator,
    jobDescription: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  returns: v.object({
    conversationId: v.id("starkConversations"),
    versionId: v.id("resumeVersions"),
    versionNumber: v.number(),
    reply: v.string(),
    overallScore: v.number(),
    strengthLabel: v.string(),
    readinessLabel: v.string(),
    milestones: v.any(),
    categoryScores: v.any(),
    jdMatch: v.any(),
    scoreChangeSummary: v.union(v.string(), v.null()),
    rubricVersion: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    conversationId: Id<"starkConversations">;
    versionId: Id<"resumeVersions">;
    versionNumber: number;
    reply: string;
    overallScore: number;
    strengthLabel: string;
    readinessLabel: string;
    milestones: ScoreResult["milestones"];
    categoryScores: ScoreResult["categoryScores"];
    jdMatch: JdMatch | null;
    scoreChangeSummary: string | null;
    rubricVersion: string;
  }> => {
    const rawText = args.rawText.trim();
    if (rawText.length < 40) {
      throw new Error("Paste more of your resume (at least a few sections).");
    }
    if (!isCareerTrack(args.careerTrack)) {
      throw new Error("Invalid career track");
    }

    let conversationId: Id<"starkConversations">;
    if (!args.conversationId) {
      conversationId = await ctx.runMutation(api.conversations.create, {
        title: "Resume Coach",
        mode: "coach",
        careerTrack: args.careerTrack,
      });
    } else {
      conversationId = args.conversationId;
      await ctx.runMutation(api.conversations.setCoachMeta, {
        conversationId,
        mode: "coach",
        careerTrack: args.careerTrack,
      });
    }

    // Pull Cassandra resume guidance from knowledge RAG-ish: list knowledge docs
    let cassandraGuidance = "";
    try {
      const docs = await ctx.runQuery(api.knowledge.listPublicResumeGuidance, {});
      cassandraGuidance = docs
        .map((d: { title: string; content: string }) => `## ${d.title}\n${d.content}`)
        .join("\n\n")
        .slice(0, 6000);
    } catch {
      cassandraGuidance = "";
    }

    const parsed = await parseResumeText(rawText);
    const { categories, feedbackMarkdown } = await evaluateCategories(
      args.careerTrack,
      rawText,
      parsed,
      cassandraGuidance,
    );

    const rubric = getRubric(args.careerTrack);
    const scoreResult = buildScoreResult(
      rubric,
      categories.map((c) => ({
        categoryId: c.categoryId as RubricCategoryId,
        score: Number(c.score) || 0,
        evidence: Array.isArray(c.evidence) ? c.evidence : [],
        notes: typeof c.notes === "string" ? c.notes : "",
      })),
      parsed,
    );

    let jdMatch: JdMatch | null = null;
    if (args.jobDescription?.trim()) {
      try {
        const jdParsed = await parseJobDescription(args.jobDescription.trim());
        jdMatch = computeJdMatch(jdParsed, parsed);
      } catch (err) {
        console.warn("JD match skipped after parse failure", err);
        jdMatch = null;
      }
    }

    // Prior review for change explanation
    let scoreChangeSummary: string | null = null;
    const progress = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId,
    });
    const prev = progress?.latestReview as
      | {
          overallScore: number;
          strengthLabel: string;
          readinessLabel: string;
          categoryScores: ScoreResult["categoryScores"];
          rubricVersion: string;
          milestones: ScoreResult["milestones"];
        }
      | null
      | undefined;
    if (prev?.categoryScores) {
      const prevScore: ScoreResult = {
        rubricVersion: prev.rubricVersion || RUBRIC_VERSION,
        overallScore: prev.overallScore,
        strengthLabel: prev.strengthLabel as ScoreResult["strengthLabel"],
        readinessLabel: prev.readinessLabel,
        categoryScores: prev.categoryScores,
        milestones: prev.milestones ?? [],
      };
      const diff = explainScoreChange(prevScore, scoreResult);
      scoreChangeSummary = diff.summary;
    }

    const saved: {
      versionId: Id<"resumeVersions">;
      reviewId: Id<"resumeReviews">;
      versionNumber: number;
    } = await ctx.runMutation(api.resumeCoach.saveVersionAndReview, {
      conversationId,
      careerTrack: args.careerTrack,
      rawText,
      parsedJson: JSON.stringify(parsed),
      jobDescription: args.jobDescription?.trim() || undefined,
      fileKey: args.fileKey,
      fileName: args.fileName,
      scoreResultJson: JSON.stringify(scoreResult),
      feedbackMarkdown,
      jdMatchJson: jdMatch ? JSON.stringify(jdMatch) : undefined,
      scoreChangeSummary: scoreChangeSummary ?? undefined,
    });
    const { versionId, versionNumber } = saved;

    const card = formatProgressCard(scoreResult, jdMatch);
    const changeBlock = scoreChangeSummary
      ? `\n\n**Why the score changed**\n${scoreChangeSummary}`
      : "";
    const reply = `${card}${changeBlock}\n\n---\n\n${feedbackMarkdown}\n\n---\n\nI'm in **Coach Mode** on **version ${versionNumber}**. Tell me what to improve next — e.g. "Improve exp-1-b2", "Make it shorter", "Make it ATS-friendly", or "Tailor this to the job description."`;

    await ctx.runMutation(api.conversations.addMessage, {
      conversationId,
      role: "user",
      content: `[Resume v${versionNumber} submitted for ${getRubric(args.careerTrack).label} review]`,
    });
    await ctx.runMutation(api.conversations.addMessage, {
      conversationId,
      role: "assistant",
      content: reply,
    });

    return {
      conversationId,
      versionId,
      versionNumber,
      reply,
      overallScore: scoreResult.overallScore,
      strengthLabel: scoreResult.strengthLabel,
      readinessLabel: scoreResult.readinessLabel,
      milestones: scoreResult.milestones,
      categoryScores: scoreResult.categoryScores,
      jdMatch,
      scoreChangeSummary,
      rubricVersion: scoreResult.rubricVersion,
    };
  },
});


/** Interactive coaching turn tied to the active resume version. */
export const coachMessage = action({
  args: {
    conversationId: v.id("starkConversations"),
    userText: v.string(),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  returns: v.object({
    reply: v.string(),
    conversationId: v.id("starkConversations"),
  }),
  handler: async (ctx, args) => {
    const userText = args.userText.trim();
    if (!userText) throw new Error("Message is empty");

    const progress = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId: args.conversationId,
    });
    if (!progress?.activeVersionId) {
      const reply =
        "Upload or paste your resume in Coach Mode first, then I can coach specific bullets.";
      await ctx.runMutation(api.conversations.addMessage, {
        conversationId: args.conversationId,
        role: "user",
        content: userText,
      });
      await ctx.runMutation(api.conversations.addMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: reply,
      });
      return { reply, conversationId: args.conversationId };
    }

    const version = await ctx.runQuery(api.resumeCoach.getVersion, {
      versionId: progress.activeVersionId,
    });
    if (!version) throw new Error("Active resume version not found");

    let cassandraGuidance = "";
    try {
      const docs = await ctx.runQuery(api.knowledge.listPublicResumeGuidance, {});
      cassandraGuidance = docs
        .map((d: { title: string; content: string }) => `## ${d.title}\n${d.content}`)
        .join("\n\n")
        .slice(0, 4000);
    } catch {
      /* optional */
    }

    const track = isCareerTrack(version.careerTrack)
      ? version.careerTrack
      : "devops";
    const rubric = getRubric(track);
    const latest = progress.latestReview as {
      overallScore?: number;
      strengthLabel?: string;
      milestones?: Array<{ title: string; potentialGain: number }>;
      jdMatch?: JdMatch | null;
    } | null;

    const system = `${COACH_PERSONA}

Career track: ${rubric.label}
Rubric version: ${RUBRIC_VERSION}
Current strength: ${latest?.strengthLabel ?? "n/a"} (${latest?.overallScore ?? "n/a"}/100)
Top milestones: ${(latest?.milestones ?? []).map((m) => `${m.title} (+${m.potentialGain})`).join("; ") || "n/a"}

CURRENT RESUME (version ${version.versionNumber}) RAW:
${version.rawText.slice(0, 10000)}

PARSED SECTIONS (cite these ids):
${version.parsedJson.slice(0, 8000)}

JOB DESCRIPTION:
${version.jobDescription?.slice(0, 4000) || "(none provided)"}

JD MATCH:
${JSON.stringify(latest?.jdMatch ?? null)}

CASSANDRA GUIDANCE:
${cassandraGuidance || "(none)"}

If the student asks to re-score the whole resume after edits, tell them to paste the updated resume and click "Save & review new version".`;

    const history = args.history.slice(-10);
    const reply = await chatComplete(
      [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userText },
      ],
      { maxTokens: 1200, temperature: 0.35, preferOpenAI: true },
    );

    await ctx.runMutation(api.conversations.addMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: userText,
    });
    await ctx.runMutation(api.conversations.addMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: reply,
    });

    return { reply, conversationId: args.conversationId };
  },
});

export const getVersion = query({
  args: { versionId: v.id("resumeVersions") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== user._id) return null;
    return version;
  },
});

const SEED_RESUME_DOCS = [
  {
    title: "Cassandra's resume bar (DevOps/IT)",
    category: "resume",
    content: `For ComplxSimple students targeting DevOps/IT/cloud roles:
- Prefer bullets that show systems you touched (Linux, cloud, containers, CI/CD, IaC) with a result.
- Quantify when possible: uptime, deploy frequency, tickets closed, time saved, servers managed.
- Skills must appear in experience/projects — do not keyword-stuff tools you cannot discuss in an interview.
- Keep formatting simple for ATS: clear sections, standard headings, no tables/text boxes.
- Summary should state target role + strongest proof in 2–3 lines.`,
  },
  {
    title: "ATS and honest keywords",
    category: "resume",
    content: `ATS tips Stark should enforce:
- Mirror language from the job description only when the student has real evidence.
- Never invent certifications (AWS, CompTIA, etc.).
- Prefer tools inside accomplishment bullets, not only a skills list.
- Call out gaps as learning goals, not as things to fake on the resume.`,
  },
];

/** Teacher: seed default resume guidance into Stark Knowledge if missing. */
export const seedResumeGuidance = mutation({
  args: {},
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx) => {
    const teacher = await requireTeacher(ctx);
    const existing = await ctx.db.query("knowledgeDocs").collect();
    const titles = new Set(existing.map((d) => d.title));
    let inserted = 0;
    const now = Date.now();
    for (const doc of SEED_RESUME_DOCS) {
      if (titles.has(doc.title)) continue;
      await ctx.db.insert("knowledgeDocs", {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        updatedBy: teacher._id,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }
    return { inserted };
  },
});
