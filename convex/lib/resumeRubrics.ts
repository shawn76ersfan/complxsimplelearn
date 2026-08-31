/**
 * Structured, versioned career rubrics for Stark Coach Mode.
 * Overall scores are ALWAYS derived from weighted category scores — never invented.
 *
 * RUBRIC_VERSION must bump when weights/criteria change so historical reviews stay meaningful.
 */

export const RUBRIC_VERSION = "v2.1.0";

export type CareerTrack =
  | "devops"
  | "software"
  | "it_support"
  | "data"
  | "consulting";

export type JobLevel =
  | "internship"
  | "entry"
  | "early_career"
  | "mid"
  | "senior";

export type RubricCategoryId =
  | "clarity_formatting"
  | "impact_results"
  | "role_relevance"
  | "ats_keywords"
  | "recruiter_appeal"
  | "completeness"
  | "technical_depth";

export type RubricCategory = {
  id: RubricCategoryId;
  label: string;
  weight: number;
  criteria: string[];
  scoringRules: string;
};

export type CareerRubric = {
  track: CareerTrack;
  label: string;
  description: string;
  categories: RubricCategory[];
};

export const JOB_LEVEL_OPTIONS: Array<{ id: JobLevel; label: string }> = [
  { id: "internship", label: "Internship" },
  { id: "entry", label: "Entry-level / full-time" },
  { id: "early_career", label: "Early career" },
  { id: "mid", label: "Mid-level" },
  { id: "senior", label: "Senior / leadership" },
];

export function isJobLevel(value: string): value is JobLevel {
  return JOB_LEVEL_OPTIONS.some((o) => o.id === value);
}

export function jobLevelLabel(level: JobLevel): string {
  return JOB_LEVEL_OPTIONS.find((o) => o.id === level)?.label ?? level;
}

/** Coaching emphasis by job level — used in scorer + coach prompts. */
export function jobLevelCoachingFocus(level: JobLevel): string {
  switch (level) {
    case "internship":
      return "Demonstrate potential, technical foundation, learning ability, coursework/projects, and curiosity. Emphasize growth signals over deep ownership.";
    case "entry":
      return "Demonstrate readiness for full-time work: clear projects, measurable outcomes where honest, collaboration, and applied skills.";
    case "early_career":
      return "Demonstrate ownership, measurable outcomes, stakeholder collaboration, increasing responsibility, and translating work into business impact.";
    case "mid":
      return "Demonstrate scope, cross-team influence, reliable delivery at scale, mentoring signals, and clear business outcomes.";
    case "senior":
      return "Demonstrate strategy, leadership, organizational impact, mentoring, architecture/judgment, and business outcomes — not just individual tasks.";
  }
}

/** Consulting competency dimensions scored 0–100 (explainability, not separate overall weights). */
export const CONSULTING_COMPETENCIES = [
  { id: "stakeholder_collaboration", label: "Stakeholder collaboration" },
  { id: "problem_solving", label: "Problem solving" },
  { id: "requirements_gathering", label: "Requirements gathering" },
  { id: "communication", label: "Communication" },
  { id: "business_impact", label: "Business impact" },
  { id: "analytical_thinking", label: "Analytical thinking" },
  { id: "process_improvement", label: "Process improvement" },
  { id: "cross_functional", label: "Cross-functional collaboration" },
  { id: "tech_to_business", label: "Technical → business translation" },
  { id: "ownership", label: "Ownership" },
] as const;

export type ConsultingCompetencyId =
  (typeof CONSULTING_COMPETENCIES)[number]["id"];

const SHARED_CLARITY: RubricCategory = {
  id: "clarity_formatting",
  label: "Clarity & formatting",
  weight: 15,
  criteria: [
    "Clean, scannable layout with consistent bullets",
    "Readable contact header and section labels",
    "No dense paragraphs or broken formatting",
  ],
  scoringRules:
    "Score 8–10 if sections are clear and bullets are concise. Deduct for walls of text, inconsistent tense, or missing section structure. Cite specific section ids.",
};

const SHARED_IMPACT: RubricCategory = {
  id: "impact_results",
  label: "Impact & quantified results",
  weight: 20,
  criteria: [
    "Bullets start with strong action verbs",
    "Measurable outcomes (%, time, cost, scale) where possible",
    "Avoids duty lists without results",
  ],
  scoringRules:
    "Score high when most experience/project bullets include metrics or clear outcomes. Deduct for vague verbs (helped, worked on) without impact. Reference exact bullet ids. For each weak score, list bulletIds and a stronger rewrite example.",
};

const SHARED_COMPLETENESS: RubricCategory = {
  id: "completeness",
  label: "Completeness",
  weight: 10,
  criteria: [
    "Contact info present",
    "Skills section present",
    "Education and/or relevant experience/projects",
  ],
  scoringRules:
    "Score based on presence of core sections and enough substance for the career stage. Missing contact or skills should cap this category at 5.",
};

const SHARED_ATS: RubricCategory = {
  id: "ats_keywords",
  label: "ATS Compatibility",
  weight: 15,
  criteria: [
    "Role-relevant tools and skills appear naturally",
    "Keywords match common job postings for the track",
    "Avoids keyword stuffing without evidence in experience",
  ],
  scoringRules:
    "Score from evidenced skills in Skills + Experience/Projects. Do not reward keywords that appear only as claims with no supporting bullets. This is the ATS score — keyword coverage and parseability.",
};

const SHARED_RECRUITER: RubricCategory = {
  id: "recruiter_appeal",
  label: "Recruiter Readability & Appeal (estimate)",
  weight: 15,
  criteria: [
    "Bullets read as accomplishments, not task lists",
    "Human-scannable story of impact in ~6 seconds",
    "Avoids dense jargon walls and responsibility-only language",
  ],
  scoringRules:
    "Estimate recruiter readability & appeal from clarity, prioritization, accomplishment density, positioning, and evidenced impact — NOT a prediction of real recruiter behavior. High ATS keywords with duty-list bullets should score lower. Cite bullet ids that feel like tasks vs outcomes.",
};

export const CAREER_RUBRICS: Record<CareerTrack, CareerRubric> = {
  devops: {
    track: "devops",
    label: "DevOps / IT / Cloud",
    description:
      "Default ComplxSimple track — Linux, cloud, containers, IaC, CI/CD, monitoring.",
    categories: [
      SHARED_CLARITY,
      SHARED_IMPACT,
      {
        id: "role_relevance",
        label: "Role relevance (DevOps/Cloud)",
        weight: 20,
        criteria: [
          "Experience/projects map to ops, cloud, automation, or infrastructure",
          "Shows systems thinking (reliability, deployment, troubleshooting)",
        ],
        scoringRules:
          "Reward Linux, cloud (AWS/Azure/GCP), Docker/K8s, Terraform/Ansible, CI/CD, monitoring. Cite bullets that prove hands-on ops work. If a JD is provided, score against that JD; if not, score general track fit only — never invent a specific employer match.",
      },
      SHARED_ATS,
      SHARED_RECRUITER,
      SHARED_COMPLETENESS,
      {
        id: "technical_depth",
        label: "Technical depth",
        weight: 5,
        criteria: [
          "Tools are tied to concrete tasks, not just listed",
          "Shows understanding of how systems fit together",
        ],
        scoringRules:
          "High scores when tools appear inside accomplishment bullets with context (what/why/result).",
      },
    ],
  },
  software: {
    track: "software",
    label: "Software Engineering",
    description: "Application development, APIs, testing, collaboration.",
    categories: [
      SHARED_CLARITY,
      SHARED_IMPACT,
      {
        id: "role_relevance",
        label: "Role relevance (Software)",
        weight: 20,
        criteria: [
          "Projects show building features, APIs, or apps",
          "Mentions languages, frameworks, testing, or collaboration",
        ],
        scoringRules:
          "Reward languages/frameworks, shipped features, code quality, testing, Git collaboration. Cite project/experience bullets. If no JD, use general software fit only.",
      },
      SHARED_ATS,
      SHARED_RECRUITER,
      SHARED_COMPLETENESS,
      {
        id: "technical_depth",
        label: "Technical depth",
        weight: 5,
        criteria: ["Shows design choices, tradeoffs, or complexity handled"],
        scoringRules:
          "Prefer depth over laundry-list tech. Reward architecture, performance, or quality signals with evidence.",
      },
    ],
  },
  it_support: {
    track: "it_support",
    label: "IT Support",
    description: "Help desk, troubleshooting, customer service, systems admin basics.",
    categories: [
      SHARED_CLARITY,
      SHARED_IMPACT,
      {
        id: "role_relevance",
        label: "Role relevance (IT Support)",
        weight: 20,
        criteria: [
          "Troubleshooting, ticketing, hardware/software support evidence",
          "Customer service / communication signals",
        ],
        scoringRules:
          "Reward ticket volume/SLAs, OS support, Active Directory, networking basics, customer outcomes. Cite bullets. If no JD, general IT support fit only.",
      },
      SHARED_ATS,
      SHARED_RECRUITER,
      SHARED_COMPLETENESS,
      {
        id: "technical_depth",
        label: "Technical depth",
        weight: 5,
        criteria: ["Shows escalation judgment and root-cause thinking"],
        scoringRules: "High when bullets show diagnosis → fix → outcome, not just 'helped users'.",
      },
    ],
  },
  data: {
    track: "data",
    label: "Data Analysis",
    description: "Analytics, SQL, visualization, insights, data pipelines basics.",
    categories: [
      SHARED_CLARITY,
      SHARED_IMPACT,
      {
        id: "role_relevance",
        label: "Role relevance (Data)",
        weight: 20,
        criteria: [
          "SQL/spreadsheets/BI tools or analysis projects",
          "Insights tied to decisions or outcomes",
        ],
        scoringRules:
          "Reward SQL, Python/R, dashboards (Power BI/Tableau), cleaning/analysis, business impact. Cite evidence. If no JD, general data fit only.",
      },
      SHARED_ATS,
      SHARED_RECRUITER,
      SHARED_COMPLETENESS,
      {
        id: "technical_depth",
        label: "Technical depth",
        weight: 5,
        criteria: ["Shows method (query, model, viz) not just tool names"],
        scoringRules: "Prefer methodology + insight over tool name-dropping.",
      },
    ],
  },
  consulting: {
    track: "consulting",
    label: "Consulting",
    description: "Client impact, problem framing, communication, delivery.",
    categories: [
      SHARED_CLARITY,
      SHARED_IMPACT,
      {
        id: "role_relevance",
        label: "Role relevance (Consulting)",
        weight: 18,
        criteria: [
          "Client/stakeholder collaboration and outcomes",
          "Problem solving, requirements, analytical thinking",
          "Business impact and technical→business translation",
          "Communication, process improvement, ownership",
        ],
        scoringRules:
          "Score consulting fit via competencies (not keyword stuffing): stakeholder collaboration, problem solving, requirements gathering, communication, business impact, analytical thinking, process improvement, cross-functional collaboration, technical-to-business translation, ownership. Also return competencyScores 0–100 for each. Cite bullets. If JD provided, score against that JD; if not, general consulting fit — never claim readiness for a named firm.",
      },
      {
        ...SHARED_ATS,
        weight: 12,
        label: "ATS Compatibility",
      },
      { ...SHARED_RECRUITER, weight: 15 },
      SHARED_COMPLETENESS,
      {
        id: "technical_depth",
        label: "Domain / analytical depth",
        weight: 10,
        criteria: ["Shows structured thinking and domain familiarity"],
        scoringRules: "Reward frameworks, analysis, and measurable client outcomes.",
      },
    ],
  },
};

export function getRubric(track: CareerTrack): CareerRubric {
  return CAREER_RUBRICS[track] ?? CAREER_RUBRICS.devops;
}

export function isCareerTrack(value: string): value is CareerTrack {
  return value in CAREER_RUBRICS;
}

export const CAREER_TRACK_OPTIONS: Array<{ id: CareerTrack; label: string }> = [
  { id: "devops", label: "DevOps / IT / Cloud" },
  { id: "software", label: "Software Engineering" },
  { id: "it_support", label: "IT Support" },
  { id: "data", label: "Data Analysis" },
  { id: "consulting", label: "Consulting" },
];
