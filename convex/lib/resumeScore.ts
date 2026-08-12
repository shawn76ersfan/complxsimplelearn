import {
  type CareerRubric,
  type RubricCategoryId,
  RUBRIC_VERSION,
} from "./resumeRubrics";

export type CategoryScore = {
  categoryId: RubricCategoryId;
  label: string;
  weight: number;
  score: number; // 0–10
  evidence: Array<{ sectionId: string; quote: string; note: string }>;
  notes: string;
};

export type Milestone = {
  title: string;
  potentialGain: number; // points on 0–100 scale
  categoryId: RubricCategoryId;
  why: string;
};

export type ScoreResult = {
  rubricVersion: string;
  overallScore: number; // 0–100, derived from weights
  strengthLabel: "Needs work" | "Developing" | "Strong" | "Excellent";
  readinessLabel: string;
  categoryScores: CategoryScore[];
  milestones: Milestone[];
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
): string {
  if (overall >= 85) return `Ready for ${trackLabel} interviews`;
  if (overall >= 70) return "Ready for internships with light polish";
  if (overall >= 55) return "Solid draft — focus on the milestones below";
  return "Early draft — start with the top milestone";
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
  }>,
  parsed: ParsedResume,
): ScoreResult {
  const hints = heuristicCategoryHints(parsed);
  const byId = new Map(rawCategories.map((c) => [c.categoryId, c]));

  const categoryScores: CategoryScore[] = rubric.categories.map((cat) => {
    const raw = byId.get(cat.id);
    const score = blendCategoryScore(raw?.score ?? hints[cat.id] ?? 5, hints[cat.id]);
    return {
      categoryId: cat.id,
      label: cat.label,
      weight: cat.weight,
      score,
      evidence: raw?.evidence ?? [],
      notes: raw?.notes ?? "",
    };
  });

  const overallScore = computeOverallScore(categoryScores);
  const strengthLabel = strengthFromScore(overallScore);
  const readinessLabel = readinessFromScore(overallScore, rubric.label);

  // Top milestones: lowest weighted gaps (how many points available to gain)
  const milestones: Milestone[] = [...categoryScores]
    .map((c) => {
      const gap = 10 - c.score;
      const potentialGain = Math.round((gap * c.weight) / rubric.categories.reduce((s, x) => s + x.weight, 0) * 10);
      return {
        title: `Improve ${c.label.toLowerCase()}`,
        potentialGain: Math.max(1, potentialGain),
        categoryId: c.categoryId,
        why: c.notes || `Raise ${c.label} with concrete, evidenced changes.`,
      };
    })
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, 3);

  return {
    rubricVersion: RUBRIC_VERSION,
    overallScore,
    strengthLabel,
    readinessLabel,
    categoryScores,
    milestones,
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
    const parts = movers.map(
      (m) =>
        `${m.label} ${m.delta > 0 ? "+" : ""}${m.delta} (was ${m.from}/10 → ${m.to}/10)`,
    );
    summary = `Overall ${delta > 0 ? "+" : ""}${delta} points because: ${parts.join("; ")}.`;
  }

  return { delta, summary, categoryDeltas };
}

export { RUBRIC_VERSION };
