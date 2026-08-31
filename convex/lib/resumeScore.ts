import {
  type CareerRubric,
  type JobLevel,
  type RubricCategoryId,
  jobLevelLabel,
  RUBRIC_VERSION,
} from "./resumeRubrics";

export type CategoryScore = {
  categoryId: RubricCategoryId;
  label: string;
  weight: number;
  score: number; // 0–10 internal; UI shows ×10 as /100
  evidence: Array<{ sectionId: string; quote: string; note: string }>;
  notes: string;
  why?: string;
  toReachNext?: string;
};

export type Milestone = {
  title: string;
  potentialGain: number; // points on 0–100 overall scale
  categoryId: RubricCategoryId;
  /** Category score on 0–100 display scale (current). */
  currentScore100: number;
  /** If this gap closed toward strong, estimated category display. */
  potentialScore100: number;
  why: string;
  bulletIds?: string[];
  currentExample?: string;
  strongerExample?: string;
};

export type RedFlag = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
  bulletIds?: string[];
};

export type KeepAsIs = {
  bulletId: string;
  reason: string;
};

export type CompetencyScore = {
  id: string;
  label: string;
  score: number; // 0–100
};

export type ScoreBreakdownRow = {
  categoryId: RubricCategoryId;
  label: string;
  score100: number;
  why?: string;
};

export type ScoreExplanation = {
  narrative: string;
  strengths: ScoreBreakdownRow[];
  opportunities: ScoreBreakdownRow[];
};

export type PathToTarget = {
  target: number;
  current: number;
  gap: number;
  steps: Array<{
    title: string;
    potentialGain: number;
    categoryId: RubricCategoryId;
  }>;
  estimatedResult: number;
};

export type ScoreResult = {
  rubricVersion: string;
  overallScore: number; // 0–100, derived from weights
  strengthLabel: "Needs work" | "Developing" | "Strong" | "Excellent";
  readinessLabel: string;
  positioningSummary?: string;
  jobLevel?: JobLevel;
  categoryScores: CategoryScore[];
  milestones: Milestone[];
  redFlags?: RedFlag[];
  keepAsIs?: KeepAsIs[];
  scoreExplanation?: ScoreExplanation;
  pathToTarget?: PathToTarget;
  competencies?: CompetencyScore[];
};

export type ParsedResume = {
  contact: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  summary?: string;
  education: Array<{ id: string; raw: string; school?: string; degree?: string }>;
  experience: Array<{
    id: string;
    company?: string;
    title?: string;
    dates?: string;
    bullets: Array<{ id: string; text: string }>;
    raw: string;
  }>;
  projects: Array<{
    id: string;
    name?: string;
    bullets: Array<{ id: string; text: string }>;
    raw: string;
  }>;
  skills: string[];
  certifications: string[];
  otherSections: Array<{ id: string; title: string; raw: string }>;
};

/** Display category score on a 0–100 scale (matches overall). */
export function categoryScore100(score0to10: number): number {
  return Math.round(normalizeCategoryScore(score0to10) * 10);
}

/** Clamp and round a 0–10 category score. */
export function normalizeCategoryScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * Deterministic overall score from weighted category scores (0–10 each).
 * overall = round(100 * sum(score*weight) / (10 * sum(weights)))
 */
export function computeOverallScore(
  categoryScores: Array<{ score: number; weight: number }>,
): number {
  const totalWeight = categoryScores.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0) return 0;
  const weighted = categoryScores.reduce(
    (s, c) => s + normalizeCategoryScore(c.score) * c.weight,
    0,
  );
  return Math.round((100 * weighted) / (10 * totalWeight));
}

export function strengthFromScore(
  overall: number,
): ScoreResult["strengthLabel"] {
  if (overall >= 85) return "Excellent";
  if (overall >= 70) return "Strong";
  if (overall >= 55) return "Developing";
  return "Needs work";
}

export function readinessFromScore(
  overall: number,
  trackLabel: string,
  jobLevel: JobLevel,
): string {
  const level = jobLevelLabel(jobLevel);
  if (overall >= 85) {
    return `Competitive for ${level} ${trackLabel} roles`;
  }
  if (overall >= 70) {
    if (jobLevel === "internship") {
      return "Ready for internships with light polish";
    }
    return `Competitive with targeted revisions for ${level} ${trackLabel} roles`;
  }
  if (overall >= 55) {
    return `Solid draft for ${level} — focus on the Top 3 changes below`;
  }
  return `Early draft for ${level} — start with the highest-impact fix`;
}

/** Display label for role_relevance depending on whether a JD was supplied. */
export function roleRelevanceDisplayLabel(
  trackLabel: string,
  hasJd: boolean,
): string {
  if (hasJd) return `Role relevance (${trackLabel})`;
  return `General ${trackLabel} Fit`;
}

/** Short display name for recruiter category (avoid fake precision). */
export function displayCategoryLabel(
  label: string,
  categoryId: RubricCategoryId,
): string {
  if (categoryId === "recruiter_appeal") {
    return "Recruiter Readability & Appeal (estimate)";
  }
  return label;
}

export function buildScoreExplanation(
  overall: number,
  categoryScores: CategoryScore[],
): ScoreExplanation {
  const rows = [...categoryScores]
    .map((c) => ({
      categoryId: c.categoryId,
      label: displayCategoryLabel(c.label, c.categoryId),
      score100: categoryScore100(c.score),
      why: c.why,
    }))
    .sort((a, b) => b.score100 - a.score100);

  const strengths = rows.filter((r) => r.score100 >= 75).slice(0, 4);
  const opportunities = [...rows]
    .filter((r) => r.score100 < 75)
    .sort((a, b) => a.score100 - b.score100)
    .slice(0, 4);

  const strengthList = strengths.length > 0 ? strengths : rows.slice(0, 3);
  const opportunityList =
    opportunities.length > 0
      ? opportunities
      : [...rows].reverse().slice(0, 3);

  const strongNames = strengthList
    .slice(0, 2)
    .map((s) => s.label.replace(/ \(estimate\)$/i, "").toLowerCase())
    .join(" and ");
  const weakNames = opportunityList
    .slice(0, 3)
    .map((s) => s.label.replace(/ \(estimate\)$/i, "").toLowerCase())
    .join(", ");

  const narrative =
    opportunityList.length === 0
      ? `Your resume scores ${overall}/100 with balanced strength across categories.`
      : `Your resume is stronger on ${strongNames}, but loses points in ${weakNames}.`;

  return {
    narrative,
    strengths: strengthList,
    opportunities: opportunityList,
  };
}

export function buildPathToTarget(
  overall: number,
  milestones: Milestone[],
  target = 80,
): PathToTarget {
  const steps = milestones.slice(0, 3).map((m) => ({
    title: m.title,
    potentialGain: m.potentialGain,
    categoryId: m.categoryId,
  }));
  const sumGains = steps.reduce((s, x) => s + x.potentialGain, 0);
  const estimatedResult = Math.min(100, overall + sumGains);
  return {
    target,
    current: overall,
    gap: Math.max(0, target - overall),
    steps,
    estimatedResult,
  };
}

/** Heuristic baseline signals from parsed structure (keeps scores more consistent). */
export function heuristicCategoryHints(parsed: ParsedResume): Partial<
  Record<RubricCategoryId, number>
> {
  const hints: Partial<Record<RubricCategoryId, number>> = {};

  let clarity = 5;
  if (parsed.contact.email || parsed.contact.phone) clarity += 1;
  if (parsed.experience.length + parsed.projects.length > 0) clarity += 1;
  if (
    parsed.experience.every((e) => e.bullets.length > 0) ||
    parsed.projects.some((p) => p.bullets.length > 0)
  ) {
    clarity += 1;
  }
  hints.clarity_formatting = Math.min(9, clarity);

  const allBullets = [
    ...parsed.experience.flatMap((e) => e.bullets.map((b) => b.text)),
    ...parsed.projects.flatMap((p) => p.bullets.map((b) => b.text)),
  ];
  const quantified = allBullets.filter((t) =>
    /\d|%|percent|x\b|times|users|servers|tickets/i.test(t),
  ).length;
  const impactBase =
    allBullets.length === 0
      ? 3
      : 4 + Math.min(5, Math.round((quantified / allBullets.length) * 6));
  hints.impact_results = impactBase;

  let completeness = 3;
  if (parsed.contact.email) completeness += 1;
  if (parsed.skills.length > 0) completeness += 2;
  if (parsed.education.length > 0) completeness += 1;
  if (parsed.experience.length + parsed.projects.length > 0) completeness += 2;
  if (parsed.summary) completeness += 1;
  hints.completeness = Math.min(10, completeness);

  hints.ats_keywords = Math.min(
    9,
    3 + Math.min(6, Math.floor(parsed.skills.length / 2)),
  );

  const dutyLike = allBullets.filter((t) =>
    /responsible for|worked on|helped with|duties included/i.test(t),
  ).length;
  const recruiterBase =
    allBullets.length === 0
      ? 4
      : 5 +
        Math.min(3, Math.round((quantified / Math.max(1, allBullets.length)) * 4)) -
        Math.min(2, Math.round((dutyLike / Math.max(1, allBullets.length)) * 3));
  hints.recruiter_appeal = Math.max(3, Math.min(9, recruiterBase));

  return hints;
}

/**
 * Blend LLM category score with heuristic hint for stability.
 * Final = clamp(round(0.65*llm + 0.35*hint)) when hint exists.
 */
export function blendCategoryScore(
  llmScore: number,
  hint: number | undefined,
): number {
  const llm = normalizeCategoryScore(llmScore);
  if (hint === undefined) return llm;
  const h = normalizeCategoryScore(hint);
  return normalizeCategoryScore(0.65 * llm + 0.35 * h);
}

export function buildScoreResult(
  rubric: CareerRubric,
  rawCategories: Array<{
    categoryId: RubricCategoryId;
    score: number;
    evidence: CategoryScore["evidence"];
    notes: string;
    why?: string;
    toReachNext?: string;
    milestoneTitle?: string;
    bulletIds?: string[];
    currentExample?: string;
    strongerExample?: string;
  }>,
  parsed: ParsedResume,
  opts: {
    jobLevel: JobLevel;
    hasJd: boolean;
    positioningSummary?: string;
    redFlags?: RedFlag[];
    keepAsIs?: KeepAsIs[];
    competencies?: CompetencyScore[];
    milestoneOverrides?: Array<{
      categoryId: RubricCategoryId;
      title: string;
      why: string;
      bulletIds?: string[];
      currentExample?: string;
      strongerExample?: string;
    }>;
  },
): ScoreResult {
  const hints = heuristicCategoryHints(parsed);
  const byId = new Map(rawCategories.map((c) => [c.categoryId, c]));

  const categoryScores: CategoryScore[] = rubric.categories.map((cat) => {
    const raw = byId.get(cat.id);
    const score = blendCategoryScore(raw?.score ?? hints[cat.id] ?? 5, hints[cat.id]);
    const label =
      cat.id === "role_relevance"
        ? roleRelevanceDisplayLabel(rubric.label, opts.hasJd)
        : displayCategoryLabel(cat.label, cat.id);
    return {
      categoryId: cat.id,
      label,
      weight: cat.weight,
      score,
      evidence: raw?.evidence ?? [],
      notes: raw?.notes ?? "",
      why: raw?.why || raw?.notes || undefined,
      toReachNext: raw?.toReachNext,
    };
  });

  const overallScore = computeOverallScore(categoryScores);
  const strengthLabel = strengthFromScore(overallScore);
  const readinessLabel = readinessFromScore(
    overallScore,
    rubric.label,
    opts.jobLevel,
  );

  const totalWeight = rubric.categories.reduce((s, x) => s + x.weight, 0);
  const overrideByCat = new Map(
    (opts.milestoneOverrides ?? []).map((m) => [m.categoryId, m]),
  );

  const milestones: Milestone[] = [...categoryScores]
    .map((c) => {
      const gap = 10 - c.score;
      const potentialGain = Math.round((gap * c.weight) / totalWeight * 10);
      const raw = byId.get(c.categoryId);
      const ov = overrideByCat.get(c.categoryId);
      const currentScore100 = categoryScore100(c.score);
      const potentialScore100 = Math.min(
        100,
        currentScore100 + Math.max(1, potentialGain),
      );
      return {
        title:
          ov?.title ||
          raw?.milestoneTitle ||
          `Strengthen ${c.label.toLowerCase()}`,
        potentialGain: Math.max(1, potentialGain),
        categoryId: c.categoryId,
        currentScore100,
        potentialScore100,
        why:
          ov?.why ||
          c.why ||
          c.notes ||
          `Raise ${c.label} with concrete, evidenced changes.`,
        bulletIds:
          ov?.bulletIds ||
          raw?.bulletIds ||
          c.evidence.map((e) => e.sectionId).filter(Boolean).slice(0, 4),
        currentExample: ov?.currentExample || raw?.currentExample,
        strongerExample: ov?.strongerExample || raw?.strongerExample,
      };
    })
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 3);

  const scoreExplanation = buildScoreExplanation(overallScore, categoryScores);
  const pathToTarget = buildPathToTarget(overallScore, milestones, 80);

  return {
    rubricVersion: RUBRIC_VERSION,
    overallScore,
    strengthLabel,
    readinessLabel,
    positioningSummary: opts.positioningSummary,
    jobLevel: opts.jobLevel,
    categoryScores,
    milestones,
    redFlags: opts.redFlags,
    keepAsIs: opts.keepAsIs,
    scoreExplanation,
    pathToTarget,
    competencies: opts.competencies,
  };
}

export type VersionDiffExplanation = {
  delta: number;
  summary: string;
  categoryDeltas: Array<{
    categoryId: RubricCategoryId;
    label: string;
    from: number;
    to: number;
    delta: number;
  }>;
};

export function explainScoreChange(
  prev: ScoreResult,
  next: ScoreResult,
): VersionDiffExplanation {
  const delta = next.overallScore - prev.overallScore;
  const categoryDeltas = next.categoryScores.map((c) => {
    const p = prev.categoryScores.find((x) => x.categoryId === c.categoryId);
    const from = p?.score ?? 0;
    return {
      categoryId: c.categoryId,
      label: c.label,
      from,
      to: c.score,
      delta: Math.round((c.score - from) * 10) / 10,
    };
  });
  const movers = [...categoryDeltas]
    .filter((c) => c.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  let summary: string;
  if (delta === 0) {
    summary = "Overall score unchanged. Category mix may still have shifted.";
  } else if (movers.length === 0) {
    summary = `Overall ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points.`;
  } else {
    const parts = movers.map((m) => {
      const from100 = categoryScore100(m.from);
      const to100 = categoryScore100(m.to);
      return `${m.label} ${from100} → ${to100}`;
    });
    summary = `Overall ${delta > 0 ? "+" : ""}${delta} points because: ${parts.join("; ")}.`;
  }

  return { delta, summary, categoryDeltas };
}

export { RUBRIC_VERSION };
