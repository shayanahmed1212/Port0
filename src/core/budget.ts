export interface BudgetResult {
  omittedFiles: string[];
  truncated: string[];
}

export function applyBudget<T>(sections: Record<string, string>, maxBytes: number): { sections: Record<string, string>; omittedFiles: string[]; truncated: string[] } {
  const omittedFiles: string[] = [];
  const truncated: string[] = [];
  // Simple placeholder: if total exceeds, truncate untracked contents first
  let total = Object.values(sections).reduce((a, b) => a + Buffer.byteLength(b, "utf8"), 0);
  const order = ["untracked", "unstaged", "staged", "testLog"];
  for (const key of order) {
    if (total <= maxBytes) break;
    if (sections[key]) {
      const original = sections[key];
      const cut = Math.max(0, Math.floor(original.length * 0.5));
      sections[key] = original.slice(0, cut) + "\n[TRUNCATED]";
      truncated.push(key);
      total = Object.values(sections).reduce((a, b) => a + Buffer.byteLength(b, "utf8"), 0);
    }
  }
  return { sections, omittedFiles, truncated };
}
