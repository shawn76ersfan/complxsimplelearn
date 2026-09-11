export type StaticBlock =
  | { type: "heading";   content: string }
  | { type: "paragraph"; content: string }
  | { type: "code";      content: string }
  | { type: "list";      content: string };

export type InteractiveBlock =
  | { type: "flashcard";  front: string; back: string }
  | { type: "fillblank";  prompt: string; accepted?: string[][]; blankCount?: number }
  | { type: "match";      pairs: Array<{ term: string; definition: string }> }
  | { type: "crossword";  pairs: Array<{ term: string; definition: string }> }
  | { type: "quiz";       question: string; options: string[]; correctIndex?: number; explanation?: string }
  | { type: "playground"; language: "html" | "js"; code: string };

export type LessonBlock = StaticBlock | InteractiveBlock;

export const INTERACTIVE_TYPES = new Set(["flashcard", "fillblank", "match", "crossword", "quiz", "playground"]);

export function isInteractive(block: LessonBlock): block is InteractiveBlock {
  return INTERACTIVE_TYPES.has(block.type);
}

export function parseBlocks(contentJson: string): LessonBlock[] {
  try {
    const parsed = JSON.parse(contentJson);
    return Array.isArray(parsed.blocks) ? parsed.blocks : [];
  } catch {
    return [];
  }
}
