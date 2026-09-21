/** Tracks are sequenced as weeks of the program (Week 1, Week 2, …). */
export function weekLabel(indexFromZero: number): string {
  return `Week ${indexFromZero + 1}`;
}
