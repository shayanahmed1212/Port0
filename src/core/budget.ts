export interface BudgetResult {
  omittedFiles: string[];
  truncated: string[];
}

export function applyBudget(sections: Record<string, string>, maxBytes: number): { sections: Record<string, string>; omittedFiles: string[]; truncated: string[] } {
  const omittedFiles: string[] = [];
  const truncated: string[] = [];
  const order = ["untracked", "unstaged", "staged", "testLog"];
  let total = () => Object.values(sections).reduce((a, b) => a + Buffer.byteLength(b, "utf8"), 0);
  while (total() > maxBytes) {
    let progressed = false;
    for (const key of order) {
      if (total() <= maxBytes) break;
      if (sections[key] && sections[key].length > 100) {
        sections[key] = sections[key].slice(0, Math.floor(sections[key].length * 0.5)) + "\n[TRUNCATED]";
        if (!truncated.includes(key)) truncated.push(key);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return { sections, omittedFiles, truncated };
}
