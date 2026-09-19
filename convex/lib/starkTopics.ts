export type StarkHelpKind =
  | "chat"
  | "quiz_followup"
  | "career"
  | "platform"
  | "refused";

const PLATFORM_TERMS = [
  "homework",
  "assignment",
  "submit",
  "dashboard",
  "video",
  "board",
  "attendance",
  "cohort",
  "zoom",
  "how do i",
  "where do i",
  "profile",
];

const CAREER_TERMS = [
  "resume",
  "interview",
  "job",
  "linkedin",
  "portfolio",
  "career",
  "cover letter",
  "recruiter",
];

const QUIZ_TERMS = [
  "quiz",
  "failed",
  "got wrong",
  "missed",
  "didn't understand",
  "did not understand",
  "explain this concept",
  "why did i",
];

function hasTerm(haystack: string, terms: string[]): boolean {
  return terms.some((t) => haystack.includes(t));
}

export function classifyStarkHelp(
  userText: string,
  hadWeakLessonContext: boolean,
): { kind: StarkHelpKind; topic: string } {
  const text = userText.toLowerCase().replace(/\s+/g, " ").trim();
  if (hasTerm(text, QUIZ_TERMS) || hadWeakLessonContext) {
    return { kind: "quiz_followup", topic: topicFromText(text, "Lesson follow-up") };
  }
  if (hasTerm(text, CAREER_TERMS)) {
    return { kind: "career", topic: topicFromText(text, "Career") };
  }
  if (hasTerm(text, PLATFORM_TERMS)) {
    return { kind: "platform", topic: topicFromText(text, "How the site works") };
  }
  return { kind: "chat", topic: topicFromText(text, "General help") };
}

function topicFromText(text: string, fallback: string): string {
  const cleaned = text.replace(/[^\w\s/-]/g, "").trim();
  if (cleaned.length < 4) return fallback;
  const words = cleaned.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 42 ? `${words.slice(0, 40)}…` : words;
}
