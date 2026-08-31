"use client";

import { useState } from "react";

type Milestone = {
  title: string;
  potentialGain: number;
  why?: string;
  bulletIds?: string[];
  currentExample?: string;
  strongerExample?: string;
  categoryId?: string;
  currentScore100?: number;
  potentialScore100?: number;
};

type CategoryScore = {
  categoryId?: string;
  label: string;
  score: number;
  weight?: number;
  why?: string;
  toReachNext?: string;
  evidence?: Array<{ sectionId: string; quote: string; note: string }>;
};

type RedFlag = {
  id: string;
  severity: "low" | "medium" | "high";
  message: string;
  bulletIds?: string[];
};

type KeepAsIs = { bulletId: string; reason: string };

type CompetencyScore = { id: string; label: string; score: number };

type ScoreExplanation = {
  narrative: string;
  strengths: Array<{ categoryId?: string; label: string; score100: number; why?: string }>;
  opportunities: Array<{ categoryId?: string; label: string; score100: number; why?: string }>;
};

type PathToTarget = {
  target: number;
  current: number;
  gap: number;
  steps: Array<{ title: string; potentialGain: number; categoryId?: string }>;
  estimatedResult: number;
};

type Diagnosis = {
  title: string;
  holdingBack: string;
  evidence: string[];
  recommendations: string[];
  bulletIds: string[];
};

type Props = {
  strengthLabel: string;
  overallScore: number;
  readinessLabel: string;
  positioningSummary?: string | null;
  careerTrackLabel?: string | null;
  jobLevelLabel?: string | null;
  milestones: Milestone[];
  categoryScores: CategoryScore[];
  improvementSummary?: string | null;
  scoreChangeSummary?: string | null;
  scoreExplanation?: ScoreExplanation | null;
  pathToTarget?: PathToTarget | null;
  jdMatch?: {
    matchScore: number;
    roleTitle?: string;
    evidenced: string[];
    missingRequired: string[];
  } | null;
  redFlags?: RedFlag[];
  keepAsIs?: KeepAsIs[];
  competencies?: CompetencyScore[];
  versionNumber?: number;
  rubricVersion?: string;
  diagnosingKey?: string | null;
  rewriting?: boolean;
  activeDiagnosis?: Diagnosis | null;
  onDiagnose?: (milestone: Milestone) => void;
  onRewriteAffected?: (bulletIds: string[]) => void;
};

function score100(score0to10: number): number {
  return Math.round(Math.max(0, Math.min(10, score0to10)) * 10);
}

export function CoachProgressCard({
  strengthLabel,
  overallScore,
  readinessLabel,
  positioningSummary,
  careerTrackLabel,
  jobLevelLabel,
  milestones,
  categoryScores,
  improvementSummary,
  scoreChangeSummary,
  scoreExplanation,
  pathToTarget,
  jdMatch,
  redFlags,
  keepAsIs,
  competencies,
  versionNumber,
  rubricVersion,
  diagnosingKey,
  rewriting,
  activeDiagnosis,
  onDiagnose,
  onRewriteAffected,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const ats = categoryScores.find((c) => c.categoryId === "ats_keywords");
  const recruiter = categoryScores.find((c) => c.categoryId === "recruiter_appeal");
  const target = [careerTrackLabel, jobLevelLabel].filter(Boolean).join(" · ");
  const working = scoreExplanation?.strengths ?? [];
  const opportunities = scoreExplanation?.opportunities ?? [];

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{
        background: "var(--stark-surface)",
        border: "1px solid var(--stark-border)",
      }}
    >
      {/* Story header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stark-muted)" }}>
            Resume Strength
            {versionNumber != null && (
              <span className="ml-2 normal-case font-medium">· v{versionNumber}</span>
            )}
          </p>
          <p className="text-2xl font-black" style={{ color: "var(--stark-text)" }}>
            {overallScore}
            <span className="text-base font-semibold" style={{ color: "var(--stark-muted)" }}>
              /100
            </span>
            <span className="ml-2 text-lg font-bold" style={{ color: "var(--stark-accent)" }}>
              {strengthLabel}
            </span>
          </p>
          {target && (
            <p className="text-sm mt-1 font-medium" style={{ color: "var(--stark-text)" }}>
              Target: {target}
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: "var(--stark-muted)" }}>
            {readinessLabel}
          </p>
          {positioningSummary && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--stark-text)" }}>
              {positioningSummary}
            </p>
          )}
        </div>
        {rubricVersion && (
          <p className="text-[10px]" style={{ color: "var(--stark-muted)" }}>
            Rubric {rubricVersion}
          </p>
        )}
      </div>

      {/* Why this score */}
      {scoreExplanation && (
        <div
          className="rounded-xl p-3 space-y-3"
          style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--stark-muted)" }}>
            Why {overallScore}?
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--stark-text)" }}>
            {scoreExplanation.narrative}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--stark-accent)" }}>
                What&apos;s working
              </p>
              <ul className="space-y-1">
                {working.map((s) => (
                  <li key={s.label} className="text-xs flex justify-between gap-2" style={{ color: "var(--stark-text)" }}>
                    <span className="truncate">{s.label.replace(/ \(estimate\)$/i, "")}</span>
                    <span className="font-semibold flex-shrink-0">{s.score100}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--stark-muted)" }}>
                Opportunities
              </p>
              <ul className="space-y-1">
                {opportunities.map((s) => (
                  <li key={s.label} className="text-xs flex justify-between gap-2" style={{ color: "var(--stark-text)" }}>
                    <span className="truncate">{s.label.replace(/ \(estimate\)$/i, "")}</span>
                    <span className="font-semibold flex-shrink-0">{s.score100}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Path to 80 */}
      {pathToTarget && pathToTarget.gap > 0 && (
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: "color-mix(in srgb, var(--stark-accent) 10%, transparent)",
            border: "1px solid var(--stark-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--stark-muted)" }}>
            Path to {pathToTarget.target}
          </p>
          <p className="text-sm" style={{ color: "var(--stark-text)" }}>
            You&apos;re at {pathToTarget.current}/100.{" "}
            {pathToTarget.steps.length} changes could raise your score by ~{" "}
            {pathToTarget.steps.reduce((s, x) => s + x.potentialGain, 0)} points
            (estimated ~{pathToTarget.estimatedResult}/100).
          </p>
          <ul className="space-y-1">
            {pathToTarget.steps.map((s) => (
              <li key={s.title} className="text-xs flex justify-between gap-2" style={{ color: "var(--stark-text)" }}>
                <span>{s.title}</span>
                <span className="font-semibold" style={{ color: "var(--stark-accent)" }}>
                  +{s.potentialGain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {improvementSummary && (
        <p
          className="text-sm rounded-xl px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--stark-accent) 12%, transparent)", color: "var(--stark-text)" }}
        >
          {improvementSummary}
        </p>
      )}

      {scoreChangeSummary && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--stark-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--stark-text)" }}>
            Why it changed:{" "}
          </span>
          {scoreChangeSummary}
        </p>
      )}

      {/* Top 3 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
          Fix these first
        </p>
        <ul className="space-y-3">
          {milestones.slice(0, 3).map((m) => {
            const key = m.categoryId ?? m.title;
            const isDiagnosing = diagnosingKey === key;
            return (
              <li
                key={key}
                className="rounded-xl p-3 space-y-2"
                style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--stark-text)" }}>
                      {m.title}
                    </p>
                    {m.currentScore100 != null && (
                      <p className="text-xs mt-1" style={{ color: "var(--stark-muted)" }}>
                        Current: {m.currentScore100}
                        {m.potentialScore100 != null && (
                          <> → Potential: ~{m.potentialScore100}</>
                        )}
                      </p>
                    )}
                    {m.why && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--stark-muted)" }}>
                        {m.why}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--stark-muted)" }}>
                      Est. score impact
                    </p>
                    <p className="font-semibold text-sm" style={{ color: "var(--stark-accent)" }}>
                      +{m.potentialGain} points
                    </p>
                  </div>
                </div>
                {m.bulletIds && m.bulletIds.length > 0 && (
                  <p className="text-[11px]" style={{ color: "var(--stark-muted)" }}>
                    Evidence: {m.bulletIds.join(" · ")}
                  </p>
                )}
                {onDiagnose && (
                  <button
                    type="button"
                    disabled={!!diagnosingKey || !!rewriting}
                    onClick={() => onDiagnose(m)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                    style={{ background: "var(--stark-accent)" }}
                  >
                    {isDiagnosing ? "Diagnosing…" : "Fix this"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Active diagnosis panel */}
      {activeDiagnosis && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-accent)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--stark-text)" }}>
            {activeDiagnosis.title}
          </p>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stark-muted)" }}>
              What&apos;s holding you back
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--stark-text)" }}>
              {activeDiagnosis.holdingBack}
            </p>
          </div>
          {activeDiagnosis.evidence.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stark-muted)" }}>
                Evidence
              </p>
              <p className="text-xs" style={{ color: "var(--stark-text)" }}>
                {activeDiagnosis.evidence.join(" · ")}
              </p>
            </div>
          )}
          {activeDiagnosis.recommendations.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stark-muted)" }}>
                Recommended changes
              </p>
              <ul className="space-y-1">
                {activeDiagnosis.recommendations.map((r) => (
                  <li key={r} className="text-xs leading-relaxed" style={{ color: "var(--stark-text)" }}>
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onRewriteAffected && activeDiagnosis.bulletIds.length > 0 && (
            <button
              type="button"
              disabled={!!rewriting || !!diagnosingKey}
              onClick={() => onRewriteAffected(activeDiagnosis.bulletIds)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: "var(--stark-accent)" }}
            >
              {rewriting ? "Rewriting…" : "Rewrite affected bullets"}
            </button>
          )}
        </div>
      )}

      {/* What's working (expanded) */}
      {working.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
            What&apos;s working
          </p>
          <ul className="space-y-2">
            {working.map((s) => (
              <li
                key={`work-${s.label}`}
                className="text-xs leading-relaxed rounded-lg px-3 py-2"
                style={{ background: "var(--stark-bg)", color: "var(--stark-text)" }}
              >
                <span className="font-semibold">
                  {s.label.replace(/ \(estimate\)$/i, "")} — {s.score100}/100
                </span>
                {s.why ? <span style={{ color: "var(--stark-muted)" }}> — {s.why}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Don't change */}
      {keepAsIs && keepAsIs.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
            Don&apos;t change
          </p>
          <ul className="space-y-2">
            {keepAsIs.map((k) => (
              <li
                key={k.bulletId}
                className="text-xs leading-relaxed rounded-lg px-3 py-2"
                style={{ background: "var(--stark-bg)", color: "var(--stark-text)" }}
              >
                <span className="font-semibold">{k.bulletId}</span>
                <span style={{ color: "var(--stark-muted)" }}> — {k.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Categories /100 */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
          Category scores
        </p>
        <div className="space-y-2">
          {categoryScores.map((c) => {
            const key = c.categoryId ?? c.label;
            const isOpen = expanded === key;
            const s100 = score100(c.score);
            return (
              <div key={key}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpanded(isOpen ? null : key)}
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--stark-text)" }}>
                      {c.label.replace(/ \(estimate\)$/i, "")}
                      {c.categoryId === "recruiter_appeal" ? " (estimate)" : ""}
                    </span>
                    <span style={{ color: "var(--stark-muted)" }}>{s100}/100</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--stark-bg)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, s100)}%`,
                        background: "var(--stark-accent)",
                      }}
                    />
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-2 ml-1 text-xs space-y-1" style={{ color: "var(--stark-muted)" }}>
                    {c.categoryId === "recruiter_appeal" && (
                      <p>
                        Estimated from clarity, accomplishment density, positioning, and evidenced
                        impact — not a prediction of recruiter behavior.
                      </p>
                    )}
                    {c.why && (
                      <p>
                        <span className="font-semibold" style={{ color: "var(--stark-text)" }}>Why: </span>
                        {c.why}
                      </p>
                    )}
                    {c.evidence && c.evidence.length > 0 && (
                      <p>
                        <span className="font-semibold" style={{ color: "var(--stark-text)" }}>Evidence: </span>
                        {c.evidence.map((e) => e.sectionId).join(", ")}
                      </p>
                    )}
                    {c.toReachNext && (
                      <p>
                        <span className="font-semibold" style={{ color: "var(--stark-text)" }}>Next: </span>
                        {c.toReachNext}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Consulting competencies */}
      {competencies && competencies.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
            Consulting competencies
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {competencies.map((c) => (
              <div key={c.id} className="text-xs flex justify-between gap-2 px-2 py-1 rounded" style={{ color: "var(--stark-text)" }}>
                <span className="truncate">{c.label}</span>
                <span className="font-semibold flex-shrink-0">{c.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(ats || recruiter) && (
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-xl px-3 py-2"
            style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
          >
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--stark-muted)" }}>
              ATS Compatibility
            </p>
            <p className="text-lg font-bold" style={{ color: "var(--stark-text)" }}>
              {ats ? score100(ats.score) : "—"}
              <span className="text-xs font-medium" style={{ color: "var(--stark-muted)" }}>/100</span>
            </p>
          </div>
          <div
            className="rounded-xl px-3 py-2"
            style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
          >
            <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--stark-muted)" }}>
              Recruiter appeal (est.)
            </p>
            <p className="text-lg font-bold" style={{ color: "var(--stark-text)" }}>
              {recruiter ? score100(recruiter.score) : "—"}
              <span className="text-xs font-medium" style={{ color: "var(--stark-muted)" }}>/100</span>
            </p>
          </div>
        </div>
      )}

      {jdMatch ? (
        <div
          className="rounded-xl p-3 text-sm space-y-1"
          style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
        >
          <p className="font-semibold" style={{ color: "var(--stark-text)" }}>
            {jdMatch.roleTitle ?? "Target role"} — Match: {jdMatch.matchScore}%
          </p>
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            Evidenced: {jdMatch.evidenced.slice(0, 8).join(", ") || "—"}
          </p>
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            Priority gaps (don&apos;t fabricate):{" "}
            {jdMatch.missingRequired.slice(0, 6).join(", ") || "—"}
          </p>
        </div>
      ) : (
        careerTrackLabel && (
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            No JD provided — showing General {careerTrackLabel} Fit (not a specific posting match).
          </p>
        )
      )}

      {redFlags && redFlags.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
            Potential risks
          </p>
          <ul className="space-y-1.5">
            {redFlags.map((f) => (
              <li key={f.id} className="text-xs leading-relaxed" style={{ color: "var(--stark-text)" }}>
                <span className="font-semibold capitalize" style={{ color: "var(--stark-accent)" }}>
                  {f.severity}:
                </span>{" "}
                {f.message}
                {f.bulletIds?.length ? ` (${f.bulletIds.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
