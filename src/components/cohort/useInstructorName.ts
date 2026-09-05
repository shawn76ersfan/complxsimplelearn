"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Human-friendly way to refer to the viewer's instructor(s) in copy, so
 * student-facing text stops hardcoding one teacher's name.
 *
 *   - one instructor  → "Cassandra"
 *   - two             → "Cassandra & Sam"
 *   - three or more   → "your instructors"
 *   - none / loading  → "your instructor"
 *
 * `short` reads mid-sentence ("Assignments from Cassandra"); `sentence` is the
 * same phrase capitalised for the start of one ("Your instructor will…").
 */
export function useInstructorName(): {
  short: string;
  sentence: string;
  plural: boolean;
  loaded: boolean;
} {
  const instructors = useQuery(api.users.myInstructors);
  const loaded = instructors !== undefined;
  const first = (n: string) => n.split(" ")[0];

  let short: string;
  let plural = false;
  if (!instructors || instructors.length === 0) {
    short = "your instructor";
  } else if (instructors.length === 1) {
    short = first(instructors[0].name);
  } else if (instructors.length === 2) {
    short = `${first(instructors[0].name)} & ${first(instructors[1].name)}`;
    plural = true;
  } else {
    short = "your instructors";
    plural = true;
  }

  const sentence = short.charAt(0).toUpperCase() + short.slice(1);
  return { short, sentence, plural, loaded };
}
