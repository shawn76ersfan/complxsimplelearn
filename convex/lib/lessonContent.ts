export type BlockAnswer = {
  blockIndex: number;
  selected?: number;
  texts?: string[];
  completed?: boolean;
};

type LessonBlock = {
  type?: string;
  correctIndex?: number;
  accepted?: string[][];
  explanation?: string;
  [key: string]: unknown;
};

function parseBlocks(content: string): LessonBlock[] {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { blocks?: unknown }).blocks)
    ) {
      return [];
    }
    return (parsed as { blocks: LessonBlock[] }).blocks;
  } catch {
    return [];
  }
}

function normalizeFill(value: string): string {
  return value.toLowerCase().trim();
}

export function redactLessonContent(content: string): string {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return content;
  const redacted = blocks.map((block) => {
    if (block.type === "quiz") {
      const { correctIndex: _correctIndex, explanation: _explanation, ...rest } = block;
      return rest;
    }
    if (block.type === "fillblank") {
      const accepted = Array.isArray(block.accepted) ? block.accepted : [];
      const { accepted: _accepted, ...rest } = block;
      return { ...rest, blankCount: accepted.length };
    }
    return block;
  });
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return JSON.stringify({ ...parsed, blocks: redacted });
  } catch {
    return JSON.stringify({ blocks: redacted });
  }
}

export function gradeContentBlock(
  content: string,
  blockIndex: number,
  answer: { selected?: number; texts?: string[] },
): {
  correct: boolean;
  score: number;
  maxScore: number;
  correctIndex?: number;
  explanation?: string;
  accepted?: string[][];
  results?: boolean[];
} {
  const block = parseBlocks(content)[blockIndex];
  if (!block) throw new Error("Activity not found");

  if (block.type === "quiz") {
    const correctIndex = typeof block.correctIndex === "number" ? block.correctIndex : 0;
    const selected = answer.selected;
    if (selected === undefined) throw new Error("Pick an answer");
    const correct = selected === correctIndex;
    return {
      correct,
      score: correct ? 1 : 0,
      maxScore: 1,
      correctIndex,
      explanation: typeof block.explanation === "string" ? block.explanation : undefined,
    };
  }

  if (block.type === "fillblank") {
    const accepted = Array.isArray(block.accepted) ? block.accepted : [];
    const texts = answer.texts ?? [];
    const results = accepted.map((options, i) => {
      const given = normalizeFill(texts[i] ?? "");
      return (options ?? []).some((option) => normalizeFill(option) === given);
    });
    const score = results.filter(Boolean).length;
    return {
      correct: results.length > 0 && results.every(Boolean),
      score,
      maxScore: Math.max(accepted.length, 1),
      accepted,
      results,
    };
  }

  throw new Error("That activity is checked when you submit the chapter");
}

export function scoreLessonContent(
  content: string,
  answers: BlockAnswer[],
): { score: number; maxScore: number } {
  const blocks = parseBlocks(content);
  const byIndex = new Map(answers.map((row) => [row.blockIndex, row]));
  let score = 0;
  let maxScore = 0;

  blocks.forEach((block, index) => {
    const response = byIndex.get(index);
    if (block.type === "quiz") {
      maxScore += 1;
      if (response?.selected === block.correctIndex) score += 1;
      return;
    }
    if (block.type === "fillblank") {
      const accepted = Array.isArray(block.accepted) ? block.accepted : [];
      const texts = response?.texts ?? [];
      maxScore += Math.max(accepted.length, 1);
      score += accepted.filter((options, i) =>
        (options ?? []).some((option) => normalizeFill(option) === normalizeFill(texts[i] ?? "")),
      ).length;
      return;
    }
    if (
      block.type === "match" ||
      block.type === "crossword" ||
      block.type === "flashcard" ||
      block.type === "playground"
    ) {
      maxScore += 1;
      if (response?.completed) score += 1;
    }
  });

  if (maxScore === 0) return { score: 1, maxScore: 1 };
  return { score, maxScore };
}
