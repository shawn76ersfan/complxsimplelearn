"use client";

type Milestone = { title: string; potentialGain: number; why?: string };
type CategoryScore = { label: string; score: number; weight?: number };

type Props = {
  strengthLabel: string;
  overallScore: number;
  readinessLabel: string;
  milestones: Milestone[];
  categoryScores: CategoryScore[];
  improvementSummary?: string | null;
  scoreChangeSummary?: string | null;
  jdMatch?: {
    matchScore: number;
    evidenced: string[];
    missingRequired: string[];
  } | null;
  versionNumber?: number;
  rubricVersion?: string;
};

export function CoachProgressCard({
  strengthLabel,
  overallScore,
  readinessLabel,
  milestones,
  categoryScores,
  improvementSummary,
  scoreChangeSummary,
  jdMatch,
  versionNumber,
  rubricVersion,
}: Props) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "var(--stark-surface)",
        border: "1px solid var(--stark-border)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--stark-muted)" }}>
            Resume Strength
            {versionNumber != null && (
              <span className="ml-2 normal-case font-medium">· v{versionNumber}</span>
            )}
          </p>
          <p className="text-2xl font-black" style={{ color: "var(--stark-text)" }}>
            {strengthLabel}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--stark-muted)" }}>
            {readinessLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            Progress score
          </p>
          <p className="text-lg font-semibold" style={{ color: "var(--stark-accent)" }}>
            {overallScore}
            <span className="text-sm font-medium" style={{ color: "var(--stark-muted)" }}>
              /100
            </span>
          </p>
          {rubricVersion && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--stark-muted)" }}>
              Rubric {rubricVersion}
            </p>
          )}
        </div>
      </div>

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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
          Next milestones
        </p>
        <ul className="space-y-1.5">
          {milestones.slice(0, 3).map((m) => (
            <li
              key={m.title}
              className="flex items-center justify-between gap-3 text-sm"
              style={{ color: "var(--stark-text)" }}
            >
              <span>{m.title}</span>
              <span className="font-semibold flex-shrink-0" style={{ color: "var(--stark-accent)" }}>
                +{m.potentialGain}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--stark-muted)" }}>
          Category scores
        </p>
        <div className="space-y-2">
          {categoryScores.map((c) => (
            <div key={c.label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--stark-text)" }}>{c.label}</span>
                <span style={{ color: "var(--stark-muted)" }}>{c.score}/10</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--stark-bg)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (c.score / 10) * 100)}%`,
                    background: "var(--stark-accent)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {jdMatch && (
        <div
          className="rounded-xl p-3 text-sm space-y-1"
          style={{ background: "var(--stark-bg)", border: "1px solid var(--stark-border)" }}
        >
          <p className="font-semibold" style={{ color: "var(--stark-text)" }}>
            Job match · {jdMatch.matchScore}/100
          </p>
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            Evidenced: {jdMatch.evidenced.slice(0, 8).join(", ") || "—"}
          </p>
          <p className="text-xs" style={{ color: "var(--stark-muted)" }}>
            Priority gaps (don&apos;t fabricate):{" "}
            {jdMatch.missingRequired.slice(0, 6).join(", ") || "—"}
          </p>
        </div>
      )}
    </div>
  );
}
