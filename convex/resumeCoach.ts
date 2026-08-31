import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getCurrentUser, requireTeacher } from "./_lib/auth";
import {
  CAREER_TRACK_OPTIONS,
  CONSULTING_COMPETENCIES,
  getRubric,
  isCareerTrack,
  isJobLevel,
  jobLevelCoachingFocus,
  jobLevelLabel,
  JOB_LEVEL_OPTIONS,
  type CareerTrack,
  type JobLevel,
  type RubricCategoryId,
  RUBRIC_VERSION,
} from "./lib/resumeRubrics";
import {
  buildScoreResult,
  buildPathToTarget,
  buildScoreExplanation,
  categoryScore100,
  explainScoreChange,
  type CompetencyScore,
  type KeepAsIs,
  type ParsedResume,
  type RedFlag,
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

const jobLevelValidator = v.union(
  v.literal("internship"),
  v.literal("entry"),
  v.literal("early_career"),
  v.literal("mid"),
  v.literal("senior"),
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
  roleTitle: string;
  evidenced: string[];
  missingRequired: string[];
  missingPreferred: string[];
  doNotClaim: string[];
  notes: string;
  buckets?: Array<{ area: string; matchPct: number; why: string }>;
};

function inferJdRoleTitle(jd: string): string {
  const firstLine = jd
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 3 && l.length < 120);
  if (!firstLine) return "Target role";
  // Strip common prefixes
  return firstLine.replace(/^(job title|position|role)\s*[:\-–]\s*/i, "").slice(0, 80);
}

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
    roleTitle: "Target role",
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
  why?: string;
  toReachNext?: string;
  milestoneTitle?: string;
  bulletIds?: string[];
  currentExample?: string;
  strongerExample?: string;
};

type EvalResult = {
  categories: EvalLlmCategory[];
  feedbackMarkdown: string;
  positioningSummary?: string;
  redFlags: RedFlag[];
  keepAsIs: KeepAsIs[];
  competencies: CompetencyScore[];
  topChanges: Array<{
    categoryId: string;
    title: string;
    why: string;
    bulletIds?: string[];
    currentExample?: string;
    strongerExample?: string;
  }>;
};

function sanitizeCoachFeedback(text: string): string {
  const cleaned = text
    .replace(/the model reply wasn['']t parseable[^.]*\.?/gi, "")
    .replace(/wasn['']t parseable[^.]*\.?/gi, "")
    .replace(/JSON (?:parse|parsing) (?:failed|error)[^.]*\.?/gi, "")
    .trim();
  if (!cleaned || cleaned.length < 20) {
    return "Ask me to improve any bullet — cite ids like exp-1-b1 — or use **Fix this** for a diagnosis before rewriting.";
  }
  return cleaned;
}

async function evaluateCategories(
  track: CareerTrack,
  jobLevel: JobLevel,
  rawText: string,
  parsed: ParsedResume,
  cassandraGuidance: string,
  jobDescription?: string,
): Promise<EvalResult> {
  const rubric = getRubric(track);
  const hasJd = Boolean(jobDescription?.trim());
  const levelFocus = jobLevelCoachingFocus(jobLevel);
  const competencyBlock =
    track === "consulting"
      ? `\nAlso return competencyScores (0–100) for: ${CONSULTING_COMPETENCIES.map((c) => `${c.id} (${c.label})`).join(", ")}.`
      : "";
  const rubricSpec = rubric.categories
    .map(
      (c) =>
        `- ${c.id} (${c.label}, weight ${c.weight}): ${c.scoringRules}\n  Criteria: ${c.criteria.join("; ")}`,
    )
    .join("\n");

  const system = `You are Stark Resume Coach for ComplxSimple (Cassandra Carter's IT/DevOps education platform).
You SCORE rubric categories 0–10 with EVIDENCE. You do NOT invent an overall 0–100 — that is computed in code.

Target career track: ${rubric.label}
Target job level: ${jobLevelLabel(jobLevel)} (${jobLevel})
Job-level coaching focus: ${levelFocus}
Job description provided: ${hasJd ? "YES — score role_relevance against the JD" : "NO — score role_relevance as general track fit only; never claim readiness for a named employer or specific posting"}

Return ONLY JSON:
{
  "categories": [
    {
      "categoryId": string,
      "score": number,
      "evidence": [{ "sectionId": string, "quote": string, "note": string }],
      "notes": string,
      "why": string,
      "toReachNext": string,
      "milestoneTitle"?: string,
      "bulletIds"?: string[],
      "currentExample"?: string,
      "strongerExample"?: string
    }
  ],
  "positioningSummary": string,
  "topChanges": [
    {
      "categoryId": string,
      "title": string,
      "why": string,
      "bulletIds": string[],
      "currentExample"?: string,
      "strongerExample"?: string
    }
  ],
  "redFlags": [{ "id": string, "severity": "low"|"medium"|"high", "message": string, "bulletIds"?: string[] }],
  "keepAsIs": [{ "bulletId": string, "reason": string }],
  "competencyScores": [{ "id": string, "label": string, "score": number }],
  "feedbackMarkdown": string
}

Rules:
- Include EVERY category id from the rubric.
- For scores ≤7, include ≥1 evidence item with a real sectionId/bullet id (e.g. exp-1-b2).
- why = 1–2 sentences explaining the score. toReachNext = concrete step to reach ~8/10.
- topChanges: exactly 3 highest-impact fixes with action titles (not "Improve impact"). Prefer bullet-linked examples.
- keepAsIs: 1–3 strong bullets that should NOT be rewritten (already have action + context + impact).
- redFlags: real risks only (duty language, missing metrics, keyword stuffing, timeline gaps, etc.). Empty array if none.
- positioningSummary: one sentence on how the resume currently reads vs the target track/level (${jobLevel}).
- Never invent employers, metrics, or skills not in the resume.
- Never say "ready for internships" unless job level is internship.
- Recruiter appeal is an estimate of readability/accomplishment density — not a prediction of recruiter behavior. Say so briefly in notes if relevant.
- Progress-oriented tone. Do not mention JSON, parsing, or model failures in feedbackMarkdown.
${competencyBlock}

RUBRIC (${rubric.label}, version ${RUBRIC_VERSION}):
${rubricSpec}

CASSANDRA GUIDANCE (optional):
${cassandraGuidance || "(none)"}`;

  const userPayload = JSON.stringify({
    rawResume: rawText.slice(0, 12000),
    parsed,
    jobDescription: hasJd ? jobDescription!.slice(0, 6000) : null,
    jobLevel,
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
      { maxTokens: 3800, temperature: 0, preferOpenAI: true },
    );

    const obj = tryExtractJsonObject(reply) as Record<string, unknown> | null;
    if (obj) {
      const categories = Array.isArray(obj.categories)
        ? (obj.categories as EvalLlmCategory[])
        : [];
      const feedbackMarkdown = sanitizeCoachFeedback(
        typeof obj.feedbackMarkdown === "string"
          ? obj.feedbackMarkdown
          : "Review complete. Use Fix this for a diagnosis, then rewrite when you're ready.",
      );
      const positioningSummary =
        typeof obj.positioningSummary === "string"
          ? obj.positioningSummary
          : undefined;
      const redFlags = Array.isArray(obj.redFlags)
        ? (obj.redFlags as RedFlag[]).filter(
            (f) => f && typeof f.message === "string" && typeof f.id === "string",
          )
        : [];
      const keepAsIs = Array.isArray(obj.keepAsIs)
        ? (obj.keepAsIs as KeepAsIs[]).filter(
            (k) => k && typeof k.bulletId === "string" && typeof k.reason === "string",
          )
        : [];
      const topChanges = Array.isArray(obj.topChanges)
        ? (obj.topChanges as EvalResult["topChanges"])
        : [];
      const competencies: CompetencyScore[] = [];
      if (Array.isArray(obj.competencyScores)) {
        for (const row of obj.competencyScores) {
          if (!row || typeof row !== "object") continue;
          const r = row as Record<string, unknown>;
          if (typeof r.id !== "string" || typeof r.score !== "number") continue;
          const known = CONSULTING_COMPETENCIES.find((c) => c.id === r.id);
          competencies.push({
            id: r.id,
            label:
              typeof r.label === "string"
                ? r.label
                : known?.label ?? r.id,
            score: Math.max(0, Math.min(100, Math.round(r.score))),
          });
        }
      }
      if (categories.length > 0) {
        return {
          categories,
          feedbackMarkdown,
          positioningSummary,
          redFlags,
          keepAsIs,
          competencies,
          topChanges,
        };
      }
    }
    console.warn("Category eval: no usable JSON, using heuristic scores");
  } catch (err) {
    console.warn("Category eval failed, using heuristic scores", err);
  }

  return {
    categories: [],
    feedbackMarkdown:
      "I scored your resume with structural checks and the career rubric. Ask me to improve any bullet — cite ids like exp-1-b1 — or use **Fix this** for a diagnosis before rewriting.",
    redFlags: [],
    keepAsIs: [],
    competencies: [],
    topChanges: [],
  };
}

function formatProgressCard(
  score: ScoreResult,
  jdMatch?: JdMatch | null,
  trackLabel?: string,
): string {
  const miles = score.milestones
    .map((m) => {
      const ids = m.bulletIds?.length ? ` [${m.bulletIds.join(", ")}]` : "";
      return `• ${m.title}${ids}\n  Current ${m.currentScore100} → potential ~${m.potentialScore100} (estimated +${m.potentialGain} overall points)`;
    })
    .join("\n");
  const cats = score.categoryScores
    .map((c) => {
      const s100 = categoryScore100(c.score);
      const why = c.why ? `\n  Why: ${c.why}` : "";
      const next = c.toReachNext ? `\n  Next: ${c.toReachNext}` : "";
      return `• ${c.label}: ${s100}/100${why}${next}`;
    })
    .join("\n");
  const ats = score.categoryScores.find((c) => c.categoryId === "ats_keywords");
  const recruiter = score.categoryScores.find(
    (c) => c.categoryId === "recruiter_appeal",
  );
  const dual =
    ats || recruiter
      ? `\n\n**ATS Compatibility:** ${ats ? categoryScore100(ats.score) : "—"}/100 · **Recruiter Readability & Appeal (estimate):** ${recruiter ? categoryScore100(recruiter.score) : "—"}/100\n_Estimate based on clarity, accomplishment density, and evidenced impact — not a prediction of recruiter behavior._`
      : "";
  const whyBlock = score.scoreExplanation
    ? `\n\n**Why ${score.overallScore}?**\n${score.scoreExplanation.narrative}\n\nWhat's working: ${score.scoreExplanation.strengths.map((s) => `${s.label} ${s.score100}`).join(" · ") || "—"}\nOpportunities: ${score.scoreExplanation.opportunities.map((s) => `${s.label} ${s.score100}`).join(" · ") || "—"}`
    : "";
  const path = score.pathToTarget
    ? `\n\n**Path to ${score.pathToTarget.target}**\nYou're at ${score.pathToTarget.current}/100. Prioritize:\n${score.pathToTarget.steps.map((s) => `• ${s.title} (+${s.potentialGain})`).join("\n")}\nEstimated result: ~${score.pathToTarget.estimatedResult}/100`
    : "";
  const flags =
    score.redFlags && score.redFlags.length > 0
      ? `\n\n**Potential risks**\n${score.redFlags.map((f) => `• (${f.severity}) ${f.message}`).join("\n")}`
      : "";
  const keep =
    score.keepAsIs && score.keepAsIs.length > 0
      ? `\n\n**Don't change**\n${score.keepAsIs.map((k) => `• ${k.bulletId}: ${k.reason}`).join("\n")}`
      : "";
  const comps =
    score.competencies && score.competencies.length > 0
      ? `\n\n**Consulting competencies**\n${score.competencies.map((c) => `• ${c.label}: ${c.score}/100`).join("\n")}`
      : "";
  const jd =
    jdMatch != null
      ? `\n\n**${jdMatch.roleTitle} — Match: ${jdMatch.matchScore}%**\nEvidenced: ${jdMatch.evidenced.slice(0, 8).join(", ") || "—"}\nPriority gaps (do not fabricate): ${jdMatch.missingRequired.slice(0, 6).join(", ") || "—"}`
      : `\n\n**Relevance:** General ${trackLabel ?? "track"} Fit (no job description provided)`;

  const target = [
    trackLabel,
    score.jobLevel ? jobLevelLabel(score.jobLevel) : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return `### Resume Strength: ${score.overallScore}/100
**${score.strengthLabel}** · ${score.readinessLabel}
${target ? `**Target:** ${target}` : ""}
${score.positioningSummary ? `\n${score.positioningSummary}` : ""}${whyBlock}${path}

**Fix these first**
${miles}
${dual}

**Category scores** (rubric ${score.rubricVersion})
${cats}${comps}${jd}${flags}${keep}`;
}

const COACH_PERSONA = `You are Stark Coach Mode for ComplxSimple — an interactive resume coach (not a one-shot reviewer).
You help students improve bullets iteratively: diagnose → rewrite → shorten → ATS-friendly → more technical → tailor to JD.
Always cite section/bullet ids from the CURRENT resume version when giving advice.
Never invent experience. If they lack evidence for a keyword, say so and suggest how to earn/demonstrate it.
Respect the student's selected job level — never say "ready for internships" unless they chose internship.
Match coaching language to job level (internship = potential/projects; early career = ownership/stakeholders; senior = strategy/leadership/org impact).
If no JD was provided, discuss general track fit — do not invent a specific employer match.
Protect strong bullets marked keep-as-is / Don't change; say when rewriting would not help.
Prefer directing the student to use "Fix this" for a diagnosis first, then rewrite affected bullets so scores update with a new version.
Recruiter appeal is an estimate of readability — not a prediction of recruiter behavior.
Stay warm, motivating, and specific. Keep Cassandra's rubric in mind.
Never mention JSON parsing, model failures, or internal implementation details.
Safety: no politics, no slurs, no NSFW, no helping fabricate credentials.`;

export const listCareerTracks = query({
  args: {},
  returns: v.array(v.object({ id: careerTrackValidator, label: v.string() })),
  handler: async () => CAREER_TRACK_OPTIONS,
});

export const listJobLevels = query({
  args: {},
  returns: v.array(v.object({ id: jobLevelValidator, label: v.string() })),
  handler: async () => JOB_LEVEL_OPTIONS,
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
      jobLevel: v.union(v.string(), v.null()),
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
      const categoryScores = JSON.parse(
        latestReview.categoryScoresJson,
      ) as ScoreResult["categoryScores"];
      const milestones = JSON.parse(
        latestReview.milestonesJson,
      ) as ScoreResult["milestones"];
      const normalizedMilestones = milestones.map((m) => {
        const catScore =
          categoryScores.find((c) => c.categoryId === m.categoryId)?.score ?? 5;
        const currentScore100 =
          m.currentScore100 ?? categoryScore100(catScore);
        return {
          ...m,
          currentScore100,
          potentialScore100:
            m.potentialScore100 ??
            Math.min(100, currentScore100 + (m.potentialGain ?? 0)),
        };
      });
      latestPayload = {
        ...latestReview,
        categoryScores,
        milestones: normalizedMilestones,
        jdMatch: latestReview.jdMatchJson
          ? JSON.parse(latestReview.jdMatchJson)
          : null,
        redFlags: latestReview.redFlagsJson
          ? JSON.parse(latestReview.redFlagsJson)
          : [],
        keepAsIs: latestReview.keepAsIsJson
          ? JSON.parse(latestReview.keepAsIsJson)
          : [],
        competencies: latestReview.competenciesJson
          ? JSON.parse(latestReview.competenciesJson)
          : [],
        positioningSummary: latestReview.positioningSummary ?? null,
        jobLevel: latestReview.jobLevel ?? null,
        scoreExplanation: buildScoreExplanation(
          latestReview.overallScore,
          categoryScores,
        ),
        pathToTarget: buildPathToTarget(
          latestReview.overallScore,
          normalizedMilestones,
          80,
        ),
      };
    }

    return {
      versions: versionRows,
      latestReview: latestPayload,
      improvementSummary,
      activeVersionId: convo.activeResumeVersionId ?? null,
      careerTrack: convo.careerTrack ?? null,
      jobLevel: convo.jobLevel ?? null,
    };
  },
});

export const saveVersionAndReview = mutation({
  args: {
    conversationId: v.id("starkConversations"),
    careerTrack: careerTrackValidator,
    jobLevel: jobLevelValidator,
    rawText: v.string(),
    parsedJson: v.string(),
    jobDescription: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    scoreResultJson: v.string(),
    feedbackMarkdown: v.string(),
    jdMatchJson: v.optional(v.string()),
    redFlagsJson: v.optional(v.string()),
    keepAsIsJson: v.optional(v.string()),
    competenciesJson: v.optional(v.string()),
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
      existing.reduce((max, vrow) => Math.max(max, vrow.versionNumber), 0) + 1;
    const now = Date.now();

    const versionId = await ctx.db.insert("resumeVersions", {
      userId: user._id,
      conversationId: args.conversationId,
      versionNumber,
      rawText: args.rawText,
      parsedJson: args.parsedJson,
      careerTrack: args.careerTrack,
      jobLevel: args.jobLevel,
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
      jobLevel: args.jobLevel,
      overallScore: score.overallScore,
      strengthLabel: score.strengthLabel,
      readinessLabel: score.readinessLabel,
      positioningSummary: score.positioningSummary,
      categoryScoresJson: JSON.stringify(score.categoryScores),
      milestonesJson: JSON.stringify(score.milestones),
      feedbackMarkdown: args.feedbackMarkdown,
      jdMatchJson: args.jdMatchJson,
      redFlagsJson: args.redFlagsJson,
      keepAsIsJson: args.keepAsIsJson,
      competenciesJson: args.competenciesJson,
      scoreChangeSummary: args.scoreChangeSummary,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      mode: "coach",
      careerTrack: args.careerTrack,
      jobLevel: args.jobLevel,
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
    jobLevel: jobLevelValidator,
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
    if (!isJobLevel(args.jobLevel)) {
      throw new Error("Select a target job level");
    }

    let conversationId: Id<"starkConversations">;
    if (!args.conversationId) {
      conversationId = await ctx.runMutation(api.conversations.create, {
        title: "Resume Coach",
        mode: "coach",
        careerTrack: args.careerTrack,
        jobLevel: args.jobLevel,
      });
    } else {
      conversationId = args.conversationId;
      await ctx.runMutation(api.conversations.setCoachMeta, {
        conversationId,
        mode: "coach",
        careerTrack: args.careerTrack,
        jobLevel: args.jobLevel,
      });
    }

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
    const evalResult = await evaluateCategories(
      args.careerTrack,
      args.jobLevel,
      rawText,
      parsed,
      cassandraGuidance,
      args.jobDescription?.trim(),
    );

    const rubric = getRubric(args.careerTrack);
    const hasJd = Boolean(args.jobDescription?.trim());
    const scoreResult = buildScoreResult(
      rubric,
      evalResult.categories.map((c) => ({
        categoryId: c.categoryId as RubricCategoryId,
        score: Number(c.score) || 0,
        evidence: Array.isArray(c.evidence) ? c.evidence : [],
        notes: typeof c.notes === "string" ? c.notes : "",
        why: typeof c.why === "string" ? c.why : undefined,
        toReachNext: typeof c.toReachNext === "string" ? c.toReachNext : undefined,
        milestoneTitle: typeof c.milestoneTitle === "string" ? c.milestoneTitle : undefined,
        bulletIds: Array.isArray(c.bulletIds) ? c.bulletIds : undefined,
        currentExample: typeof c.currentExample === "string" ? c.currentExample : undefined,
        strongerExample: typeof c.strongerExample === "string" ? c.strongerExample : undefined,
      })),
      parsed,
      {
        jobLevel: args.jobLevel,
        hasJd,
        positioningSummary: evalResult.positioningSummary,
        redFlags: evalResult.redFlags,
        keepAsIs: evalResult.keepAsIs,
        competencies: evalResult.competencies,
        milestoneOverrides: evalResult.topChanges
          .filter((t) => t.categoryId)
          .map((t) => ({
            categoryId: t.categoryId as RubricCategoryId,
            title: t.title,
            why: t.why,
            bulletIds: t.bulletIds,
            currentExample: t.currentExample,
            strongerExample: t.strongerExample,
          })),
      },
    );

    let jdMatch: JdMatch | null = null;
    if (hasJd && args.jobDescription) {
      try {
        const jdParsed = await parseJobDescription(args.jobDescription.trim());
        jdMatch = computeJdMatch(jdParsed, parsed);
        jdMatch.roleTitle = inferJdRoleTitle(args.jobDescription.trim());
      } catch (err) {
        console.warn("JD match skipped after parse failure", err);
        jdMatch = null;
      }
    }

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
      jobLevel: args.jobLevel,
      rawText,
      parsedJson: JSON.stringify(parsed),
      jobDescription: args.jobDescription?.trim() || undefined,
      fileKey: args.fileKey,
      fileName: args.fileName,
      scoreResultJson: JSON.stringify(scoreResult),
      feedbackMarkdown: evalResult.feedbackMarkdown,
      jdMatchJson: jdMatch ? JSON.stringify(jdMatch) : undefined,
      redFlagsJson: scoreResult.redFlags?.length
        ? JSON.stringify(scoreResult.redFlags)
        : undefined,
      keepAsIsJson: scoreResult.keepAsIs?.length
        ? JSON.stringify(scoreResult.keepAsIs)
        : undefined,
      competenciesJson: scoreResult.competencies?.length
        ? JSON.stringify(scoreResult.competencies)
        : undefined,
      scoreChangeSummary: scoreChangeSummary ?? undefined,
    });
    const { versionId, versionNumber } = saved;

    const card = formatProgressCard(scoreResult, jdMatch, rubric.label);
    const changeBlock = scoreChangeSummary
      ? `\n\n**Why the score changed**\n${scoreChangeSummary}`
      : "";
    const reply = `${card}${changeBlock}\n\n---\n\n${sanitizeCoachFeedback(evalResult.feedbackMarkdown)}\n\n---\n\nI'm in **Coach Mode** on **version ${versionNumber}**. Use **Fix this** for a diagnosis first, then rewrite when you're ready.`;

    await ctx.runMutation(api.conversations.addMessage, {
      conversationId,
      role: "user",
      content: `[Resume v${versionNumber} submitted for ${rubric.label} · ${jobLevelLabel(args.jobLevel)} review]`,
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
      jobLevel?: string | null;
      keepAsIs?: KeepAsIs[];
      milestones?: Array<{ title: string; potentialGain: number }>;
      jdMatch?: JdMatch | null;
    } | null;

    const level =
      version.jobLevel && isJobLevel(version.jobLevel)
        ? version.jobLevel
        : progress.jobLevel && isJobLevel(progress.jobLevel)
          ? progress.jobLevel
          : "entry";

    const system = `${COACH_PERSONA}

Career track: ${rubric.label}
Job level: ${jobLevelLabel(level)}
Job-level coaching focus: ${jobLevelCoachingFocus(level)}
Rubric version: ${RUBRIC_VERSION}
Current strength: ${latest?.strengthLabel ?? "n/a"} (${latest?.overallScore ?? "n/a"}/100)
Top milestones: ${(latest?.milestones ?? []).map((m) => `${m.title} (+${m.potentialGain})`).join("; ") || "n/a"}
Keep as-is bullets: ${(latest?.keepAsIs ?? []).map((k) => k.bulletId).join(", ") || "none"}

CURRENT RESUME (version ${version.versionNumber}) RAW:
${version.rawText.slice(0, 10000)}

PARSED SECTIONS (cite these ids):
${version.parsedJson.slice(0, 8000)}

JOB DESCRIPTION:
${version.jobDescription?.slice(0, 4000) || "(none — discuss general track fit only)"}

JD MATCH:
${JSON.stringify(latest?.jdMatch ?? null)}

CASSANDRA GUIDANCE:
${cassandraGuidance || "(none)"}

If the student asks to re-score after edits, tell them to paste the updated resume and click "Save & review new version", or use Fix this → Rewrite affected bullets.`;

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

function findAndReplaceBullet(
  parsed: ParsedResume,
  bulletId: string,
  newText: string,
): { parsed: ParsedResume; before: string } | null {
  const next: ParsedResume = JSON.parse(JSON.stringify(parsed)) as ParsedResume;
  for (const exp of next.experience) {
    const b = exp.bullets.find((x) => x.id === bulletId);
    if (b) {
      const before = b.text;
      b.text = newText;
      exp.raw = exp.bullets.map((x) => `• ${x.text}`).join("\n");
      return { parsed: next, before };
    }
  }
  for (const proj of next.projects) {
    const b = proj.bullets.find((x) => x.id === bulletId);
    if (b) {
      const before = b.text;
      b.text = newText;
      proj.raw = proj.bullets.map((x) => `• ${x.text}`).join("\n");
      return { parsed: next, before };
    }
  }
  return null;
}

function rebuildRawFromParsed(originalRaw: string, before: string, after: string): string {
  if (before && originalRaw.includes(before)) {
    return originalRaw.replace(before, after);
  }
  return `${originalRaw.trim()}\n\n• ${after}`;
}

/** Diagnose a Top-3 fix without rewriting — user opts into rewrite next. */
export const diagnoseImprovement = action({
  args: {
    conversationId: v.id("starkConversations"),
    categoryId: v.optional(v.string()),
    title: v.optional(v.string()),
    bulletIds: v.optional(v.array(v.string())),
  },
  returns: v.object({
    title: v.string(),
    holdingBack: v.string(),
    evidence: v.array(v.string()),
    recommendations: v.array(v.string()),
    bulletIds: v.array(v.string()),
    reply: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    title: string;
    holdingBack: string;
    evidence: string[];
    recommendations: string[];
    bulletIds: string[];
    reply: string;
  }> => {
    const progress = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId: args.conversationId,
    });
    if (!progress?.activeVersionId) {
      throw new Error("Score a resume first, then open a diagnosis.");
    }
    const version: {
      parsedJson: string;
      rawText: string;
      careerTrack: string;
      jobLevel?: string | null;
      jobDescription?: string | null;
      versionNumber: number;
    } | null = await ctx.runQuery(api.resumeCoach.getVersion, {
      versionId: progress.activeVersionId,
    });
    if (!version) throw new Error("Active resume version not found");

    const track: CareerTrack = isCareerTrack(version.careerTrack)
      ? version.careerTrack
      : "devops";
    const level: JobLevel =
      version.jobLevel && isJobLevel(version.jobLevel)
        ? version.jobLevel
        : progress.jobLevel && isJobLevel(progress.jobLevel)
          ? progress.jobLevel
          : "entry";

    const latest = progress.latestReview as {
      milestones?: Array<{
        title: string;
        categoryId?: string;
        why?: string;
        bulletIds?: string[];
      }>;
      categoryScores?: Array<{
        categoryId?: string;
        label: string;
        score: number;
        why?: string;
        toReachNext?: string;
      }>;
      keepAsIs?: KeepAsIs[];
    } | null;

    const milestone =
      (args.categoryId &&
        latest?.milestones?.find((m) => m.categoryId === args.categoryId)) ||
      (args.title &&
        latest?.milestones?.find((m) => m.title === args.title)) ||
      latest?.milestones?.[0];

    const title = milestone?.title || args.title || "Improve this area";
    const bulletIds =
      args.bulletIds?.length
        ? args.bulletIds
        : milestone?.bulletIds ?? [];
    const cat = latest?.categoryScores?.find(
      (c) => c.categoryId === (args.categoryId || milestone?.categoryId),
    );

    const system = `You are Stark Resume Coach. Diagnose ONE improvement area. Do NOT rewrite bullets yet.
Return ONLY JSON:
{
  "holdingBack": string (2–4 sentences: what's missing vs target track/level),
  "evidence": string[] (bullet ids that illustrate the gap),
  "recommendations": string[] (3–5 concrete change directives, not full rewrites)
}
Rules:
- Never invent facts or metrics.
- Respect keep-as-is bullets: ${(latest?.keepAsIs ?? []).map((k) => k.bulletId).join(", ") || "none"}.
- Job level focus: ${jobLevelCoachingFocus(level)}
- Be specific and actionable.`;

    let holdingBack =
      milestone?.why ||
      cat?.why ||
      `Your resume needs stronger ${title.toLowerCase()} for ${jobLevelLabel(level)} ${getRubric(track).label} roles.`;
    let evidence = bulletIds.slice(0, 6);
    let recommendations = [
      cat?.toReachNext || "Reframe affected bullets around outcomes and stakeholder impact.",
      "Add honest quantification where you have real numbers.",
      "Translate technical work into business/decision language.",
    ].filter(Boolean);

    try {
      const reply = await chatComplete(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              title,
              categoryId: args.categoryId || milestone?.categoryId,
              categoryLabel: cat?.label,
              categoryScore100: cat ? categoryScore100(cat.score) : null,
              suggestedBulletIds: bulletIds,
              jobLevel: level,
              jobDescription: version.jobDescription ?? null,
              resumeExcerpt: version.rawText.slice(0, 8000),
              parsed: version.parsedJson.slice(0, 6000),
            }),
          },
        ],
        { maxTokens: 900, temperature: 0.2, preferOpenAI: true },
      );
      const obj = tryExtractJsonObject(reply) as Record<string, unknown> | null;
      if (obj) {
        if (typeof obj.holdingBack === "string" && obj.holdingBack.trim()) {
          holdingBack = obj.holdingBack.trim();
        }
        if (Array.isArray(obj.evidence)) {
          evidence = obj.evidence
            .filter((x): x is string => typeof x === "string")
            .slice(0, 8);
        }
        if (Array.isArray(obj.recommendations)) {
          recommendations = obj.recommendations
            .filter((x): x is string => typeof x === "string")
            .slice(0, 6);
        }
      }
    } catch (err) {
      console.warn("diagnoseImprovement LLM failed", err);
    }

    if (evidence.length === 0 && bulletIds.length > 0) {
      evidence = bulletIds.slice(0, 4);
    }

    const reply = `### ${title}

**What's holding you back**
${holdingBack}

**Evidence**
${evidence.length ? evidence.map((e) => `• \`${e}\``).join("\n") : "• (no specific bullet ids — scan experience/projects)"}

**Recommended changes**
${recommendations.map((r) => `• ${r}`).join("\n")}

When you're ready, use **Rewrite affected bullets** to create a new scored version — we won't invent metrics.`;

    await ctx.runMutation(api.conversations.addMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: reply,
    });

    return {
      title,
      holdingBack,
      evidence,
      recommendations,
      bulletIds: evidence.length ? evidence : bulletIds,
      reply,
    };
  },
});

/** Rewrite one or more diagnosed bullets, then re-score as a new version. */
export const rewriteAffectedBullets = action({
  args: {
    conversationId: v.id("starkConversations"),
    bulletIds: v.array(v.string()),
    instruction: v.optional(v.string()),
  },
  returns: v.object({
    conversationId: v.id("starkConversations"),
    versionNumber: v.number(),
    overallScore: v.number(),
    rewrites: v.array(
      v.object({ bulletId: v.string(), before: v.string(), after: v.string() }),
    ),
    reply: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"starkConversations">;
    versionNumber: number;
    overallScore: number;
    rewrites: Array<{ bulletId: string; before: string; after: string }>;
    reply: string;
  }> => {
    if (args.bulletIds.length === 0) {
      throw new Error("Pick at least one bullet to rewrite.");
    }
    const progress = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId: args.conversationId,
    });
    if (!progress?.activeVersionId) {
      throw new Error("Score a resume first.");
    }
    const version: {
      parsedJson: string;
      rawText: string;
      careerTrack: string;
      jobLevel?: string | null;
      jobDescription?: string | null;
      fileKey?: string | null;
      fileName?: string | null;
    } | null = await ctx.runQuery(api.resumeCoach.getVersion, {
      versionId: progress.activeVersionId,
    });
    if (!version) throw new Error("Active resume version not found");

    const keepIds = new Set(
      ((progress.latestReview as { keepAsIs?: KeepAsIs[] } | null)?.keepAsIs ?? []).map(
        (k) => k.bulletId,
      ),
    );
    const ids = args.bulletIds.filter((id) => !keepIds.has(id)).slice(0, 5);
    if (ids.length === 0) {
      throw new Error("Those bullets are marked don't-change. Pick different evidence.");
    }

    const parsed = asParsedResume(JSON.parse(version.parsedJson as string));
    const targets: Array<{ id: string; before: string }> = [];
    for (const id of ids) {
      for (const exp of parsed.experience) {
        const b = exp.bullets.find((x) => x.id === id);
        if (b) targets.push({ id, before: b.text });
      }
      for (const proj of parsed.projects) {
        const b = proj.bullets.find((x) => x.id === id);
        if (b) targets.push({ id, before: b.text });
      }
    }
    if (targets.length === 0) throw new Error("No matching bullets found.");

    const track: CareerTrack = isCareerTrack(version.careerTrack)
      ? version.careerTrack
      : "devops";
    const level: JobLevel =
      version.jobLevel && isJobLevel(version.jobLevel)
        ? version.jobLevel
        : progress.jobLevel && isJobLevel(progress.jobLevel)
          ? progress.jobLevel
          : "entry";

    const system = `Rewrite the listed resume bullets ONLY. Return JSON:
{ "rewrites": [{ "bulletId": string, "after": string }] }
Rules:
- Keep the same facts — never invent metrics, employers, or tools.
- Prefer ${getRubric(track).label} positioning for ${jobLevelLabel(level)}.
- Job-level focus: ${jobLevelCoachingFocus(level)}
- One bullet per after string, no leading bullet character.`;

    const rewrites: Array<{ bulletId: string; before: string; after: string }> = [];
    try {
      const reply = await chatComplete(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                args.instruction ??
                "Strengthen consulting/business impact and stakeholder language honestly",
              bullets: targets,
              jobDescription: version.jobDescription ?? null,
            }),
          },
        ],
        { maxTokens: 1600, temperature: 0.2, preferOpenAI: true },
      );
      const obj = tryExtractJsonObject(reply) as {
        rewrites?: Array<{ bulletId?: string; after?: string }>;
      } | null;
      const map = new Map(
        (obj?.rewrites ?? [])
          .filter((r) => r.bulletId && r.after)
          .map((r) => [r.bulletId!, r.after!.trim().replace(/^[-*•]\s*/, "")]),
      );
      for (const t of targets) {
        const after = map.get(t.id) || t.before;
        rewrites.push({ bulletId: t.id, before: t.before, after });
      }
    } catch (err) {
      console.warn("rewriteAffectedBullets failed", err);
      for (const t of targets) {
        rewrites.push({ bulletId: t.id, before: t.before, after: t.before });
      }
    }

    let newRaw = version.rawText as string;
    let working = parsed;
    for (const r of rewrites) {
      if (r.after === r.before) continue;
      const replaced = findAndReplaceBullet(working, r.bulletId, r.after);
      if (replaced) working = replaced.parsed;
      newRaw = rebuildRawFromParsed(newRaw, r.before, r.after);
    }

    const result: {
      conversationId: Id<"starkConversations">;
      versionNumber: number;
      overallScore: number;
    } = await ctx.runAction(api.resumeCoach.reviewResume, {
      conversationId: args.conversationId,
      rawText: newRaw,
      careerTrack: track,
      jobLevel: level,
      jobDescription: (version.jobDescription as string | undefined) || undefined,
      fileKey: (version.fileKey as string | undefined) || undefined,
      fileName: (version.fileName as string | undefined) || undefined,
    });

    const changed = rewrites.filter((r) => r.after !== r.before);
    const reply = `### Rewrote ${changed.length} bullet${changed.length === 1 ? "" : "s"}

${changed
  .map(
    (r) =>
      `**\`${r.bulletId}\`**\nBefore: ${r.before}\nAfter: ${r.after}`,
  )
  .join("\n\n")}

Overall score is now **${result.overallScore}/100** (v${result.versionNumber}).`;

    await ctx.runMutation(api.conversations.addMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: reply,
    });

    return {
      conversationId: args.conversationId,
      versionNumber: result.versionNumber,
      overallScore: result.overallScore,
      rewrites,
      reply,
    };
  },
});

/** Rewrite one bullet, persist a new version, and fully re-score. */
export const improveBullet = action({
  args: {
    conversationId: v.id("starkConversations"),
    bulletId: v.string(),
    instruction: v.optional(v.string()),
  },
  returns: v.object({
    conversationId: v.id("starkConversations"),
    versionNumber: v.number(),
    before: v.string(),
    after: v.string(),
    whyBetter: v.array(v.string()),
    overallScore: v.number(),
    scoreChangeSummary: v.union(v.string(), v.null()),
    reply: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: Id<"starkConversations">;
    versionNumber: number;
    before: string;
    after: string;
    whyBetter: string[];
    overallScore: number;
    scoreChangeSummary: string | null;
    reply: string;
  }> => {
    const progress: {
      activeVersionId: Id<"resumeVersions"> | null;
      jobLevel: string | null;
    } | null = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId: args.conversationId,
    });
    if (!progress?.activeVersionId) {
      throw new Error("Score a resume first, then fix a bullet.");
    }
    const version: {
      parsedJson: string;
      rawText: string;
      careerTrack: string;
      jobLevel?: string | null;
      jobDescription?: string | null;
      fileKey?: string | null;
      fileName?: string | null;
    } | null = await ctx.runQuery(api.resumeCoach.getVersion, {
      versionId: progress.activeVersionId,
    });
    if (!version) throw new Error("Active resume version not found");

    const parsed = asParsedResume(JSON.parse(version.parsedJson as string));
    let beforeText = "";
    for (const exp of parsed.experience) {
      const b = exp.bullets.find((x) => x.id === args.bulletId);
      if (b) beforeText = b.text;
    }
    if (!beforeText) {
      for (const proj of parsed.projects) {
        const b = proj.bullets.find((x) => x.id === args.bulletId);
        if (b) beforeText = b.text;
      }
    }
    if (!beforeText) throw new Error(`Bullet ${args.bulletId} not found`);

    const track: CareerTrack = isCareerTrack(version.careerTrack)
      ? version.careerTrack
      : "devops";
    const level: JobLevel =
      version.jobLevel && isJobLevel(version.jobLevel)
        ? version.jobLevel
        : progress.jobLevel && isJobLevel(progress.jobLevel)
          ? progress.jobLevel
          : "entry";

    const rewriteSystem = `You rewrite ONE resume bullet for ComplxSimple Stark Coach.
Return ONLY JSON: { "after": string, "whyBetter": string[] }
Rules:
- Keep the same facts — never invent metrics, employers, or tools.
- Prefer quantified impact and ${getRubric(track).label} positioning for ${jobLevelLabel(level)}.
- whyBetter: 2–4 short reasons (e.g. "quantified impact", "consulting language").
- after must be a single bullet without a leading bullet character.`;

    let after = beforeText;
    let whyBetter: string[] = ["Clearer wording"];
    try {
      const reply = await chatComplete(
        [
          { role: "system", content: rewriteSystem },
          {
            role: "user",
            content: JSON.stringify({
              bulletId: args.bulletId,
              before: beforeText,
              instruction: args.instruction ?? "Strengthen impact and role positioning honestly",
              jobDescription: version.jobDescription ?? null,
            }),
          },
        ],
        { maxTokens: 600, temperature: 0.2, preferOpenAI: true },
      );
      const obj = tryExtractJsonObject(reply) as Record<string, unknown> | null;
      if (obj && typeof obj.after === "string" && obj.after.trim().length > 8) {
        after = obj.after.trim().replace(/^[-*•]\s*/, "");
      }
      if (obj && Array.isArray(obj.whyBetter)) {
        whyBetter = obj.whyBetter.filter((x): x is string => typeof x === "string").slice(0, 5);
      }
    } catch (err) {
      console.warn("improveBullet rewrite failed", err);
    }

    const replaced = findAndReplaceBullet(parsed, args.bulletId, after);
    if (!replaced) throw new Error(`Could not update ${args.bulletId}`);
    const newRaw = rebuildRawFromParsed(version.rawText as string, beforeText, after);

    const result: {
      conversationId: Id<"starkConversations">;
      versionNumber: number;
      overallScore: number;
      scoreChangeSummary: string | null;
    } = await ctx.runAction(api.resumeCoach.reviewResume, {
      conversationId: args.conversationId,
      rawText: newRaw,
      careerTrack: track,
      jobLevel: level,
      jobDescription: (version.jobDescription as string | undefined) || undefined,
      fileKey: (version.fileKey as string | undefined) || undefined,
      fileName: (version.fileName as string | undefined) || undefined,
    });

    const whyBlock = whyBetter.map((w) => `• ${w}`).join("\n");
    const reply = `### Fixed \`${args.bulletId}\`

**Before**
${beforeText}

**After**
${after}

**Why this is better**
${whyBlock}

Overall score is now **${result.overallScore}/100** (v${result.versionNumber}).${result.scoreChangeSummary ? `\n${result.scoreChangeSummary}` : ""}`;

    // reviewResume already wrote user/assistant messages for the full review;
    // add a short coaching note about this bullet.
    await ctx.runMutation(api.conversations.addMessage, {
      conversationId: args.conversationId,
      role: "assistant",
      content: reply,
    });

    return {
      conversationId: args.conversationId,
      versionNumber: result.versionNumber,
      before: beforeText,
      after,
      whyBetter,
      overallScore: result.overallScore,
      scoreChangeSummary: result.scoreChangeSummary,
      reply,
    };
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
