import { BookOpen, Gamepad2, HelpCircle, PenLine } from "lucide-react";
import type { ElementType } from "react";
import { isInteractive, parseBlocks } from "@/types/lesson";

export type LessonType = "content" | "quiz" | "game" | "mandatory";

export const LESSON_TYPE_ICON: Record<LessonType, ElementType> = {
  content: BookOpen,
  quiz: HelpCircle,
  game: Gamepad2,
  mandatory: PenLine,
};

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  content: "Reading",
  quiz: "Quiz",
  game: "Game",
  mandatory: "Mandatory work",
};

/** Whether finishing this lesson type counts toward the test average. */
export function isScoredType(type: LessonType): boolean {
  return type !== "content";
}

/**
 * Rough time to complete, in minutes: 200 wpm for prose plus a minute per
 * interactive block. Legacy quizzes and games get a flat estimate.
 */
export function estimateMinutes(type: LessonType, contentJson: string): number {
  if (type === "quiz") return 5;
  if (type === "game") return 8;
  const blocks = parseBlocks(contentJson);
  let words = 0;
  let interactive = 0;
  for (const block of blocks) {
    if (isInteractive(block)) {
      interactive += 1;
      continue;
    }
    words += block.content.trim().split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200) + interactive);
}

export function pctOf(score: number, max: number): number {
  return max > 0 ? Math.round((score / max) * 100) : 100;
}
