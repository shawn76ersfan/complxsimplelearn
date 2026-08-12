/**
 * Structured, versioned career rubrics for Stark Coach Mode.
 * Overall scores are ALWAYS derived from weighted category scores — never invented.
 *
 * RUBRIC_VERSION must bump when weights/criteria change so historical reviews stay meaningful.
 */

export const RUBRIC_VERSION = "v1.0.0";

export type CareerTrack =
  | "devops"
  | "software"
  | "it_support"
  | "data"
  | "consulting";

export type RubricCategoryId =
  | "clarity_formatting"
  | "impact_results"
  | "role_relevance"
  | "ats_keywords"
  | "completeness"
  | "technical_depth";

export type RubricCategory = {
  id: RubricCategoryId;
  label: string;
  weight: number; // relative weight; normalized at score time
  criteria: string[];
  scoringRules: string; // guidance for the evaluator LLM
};

export type CareerRubric = {
  track: CareerTrack;
  label: string;
  description: string;
  categories: RubricCategory[];
};

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
  weight: 25,
  criteria: [
    "Bullets start with strong action verbs",
    "Measurable outcomes (%, time, cost, scale) where possible",
    "Avoids duty lists without results",
  ],
  scoringRules:
    "Score high when most experience/project bullets include metrics or clear outcomes. Deduct for vague verbs (helped, worked on) without impact. Reference exact bullet ids.",
};

const SHARED_COMPLETENESS: RubricCategory = {
  id: "completeness",
  label: "Completeness",
  weight: 15,
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
  label: "ATS & keywords",
  weight: 20,
  criteria: [
    "Role-relevant tools and skills appear naturally",
    "Keywords match common job postings for the track",
    "Avoids keyword stuffing without evidence in experience",
  ],
  scoringRules:
    "Score from evidenced skills in Skills + Experience/Projects. Do not reward keywords that appear only as claims with no supporting bullets.",
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
          "Reward Linux, cloud (AWS/Azure/GCP), Docker/K8s, Terraform/Ansible, CI/CD, monitoring. Cite bullets that prove hands-on ops work.",
      },
      SHARED_ATS,
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
          "Reward languages/frameworks, shipped features, code quality, testing, Git collaboration. Cite project/experience bullets.",
      },
      SHARED_ATS,
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
        weight: 22,
        criteria: [
          "Troubleshooting, ticketing, hardware/software support evidence",
          "Customer service / communication signals",
        ],
        scoringRules:
          "Reward ticket volume/SLAs, OS support, Active Directory, networking basics, customer outcomes. Cite bullets.",
      },
      {
        ...SHARED_ATS,
        weight: 18,
        scoringRules:
          "Reward evidenced support tools (ServiceNow, Windows/Mac, networking). Do not invent certifications.",
      },
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
          "Reward SQL, Python/R, dashboards (Power BI/Tableau), cleaning/analysis, business impact. Cite evidence.",
      },
      SHARED_ATS,
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
        weight: 20,
        criteria: [
          "Client/stakeholder outcomes",
          "Problem framing, recommendations, delivery",
        ],
        scoringRules:
          "Reward stakeholder work, recommendations adopted, process improvement, clear communication. Cite bullets.",
      },
      {
        ...SHARED_ATS,
        weight: 15,
        label: "Keywords & positioning",
      },
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
