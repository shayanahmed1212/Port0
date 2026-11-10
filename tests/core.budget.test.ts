import { describe, expect, it } from "vitest";
import {
  applyBudget,
  DIFF_CAP,
  INTENT_CAP,
  TEST_LOG_CAP,
  UNTRACKED_CAP,
  type BudgetInput,
} from "../src/core/budget";
import { byteLength } from "../src/core/serializer";

function diffBlock(name: string, size: number): string {
  return `diff --git a/${name} b/${name}\n${"+".repeat(size)}\n`;
}

function baseInput(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    intent: "",
    testLog: null,
    stagedDiff: "",
    unstagedDiff: "",
    untracked: [],
    ...overrides,
  };
}

describe("budget", () => {
  it("caps intent and marks the cut", () => {
    const output = applyBudget(
      baseInput({ intent: "x".repeat(INTENT_CAP * 2) }),
      204_800,
    );
    expect(output.intent).toContain("[TRUNCATED: intent]");
    expect(byteLength(output.intent)).toBeLessThanOrEqual(INTENT_CAP);
    expect(output.truncatedSections).toContain("intent");
  });

  it("keeps the tail of a long test log", () => {
    const text = `${"head\n".repeat(20_000)}TAIL-MARKER\n`;
    const output = applyBudget(
      baseInput({ testLog: { text, source: "file" } }),
      204_800,
    );
    expect(output.testLog?.text).toContain("TAIL-MARKER");
    expect(output.testLog?.text.startsWith("[TRUNCATED: test log]")).toBe(true);
    expect(output.testLog?.truncated).toBe(true);
    expect(byteLength(output.testLog?.text ?? "")).toBeLessThanOrEqual(
      TEST_LOG_CAP,
    );
  });

  it("keeps whole diff file blocks and records omitted files", () => {
    const stagedDiff = ["one", "two", "three"]
      .map((name) => diffBlock(`${name}.txt`, 30_000))
      .join("");
    const output = applyBudget(
      baseInput({ stagedDiff }),
      DIFF_CAP * 2,
    );
    expect(output.diffs.staged.truncated).toBe(true);
    expect(output.diffs.staged.text).toContain("diff --git a/one.txt");
    expect(output.diffs.staged.text).toContain("diff --git a/two.txt");
    expect(output.diffs.staged.text).not.toContain("diff --git a/three.txt");
    expect(output.diffs.staged.text).toContain("[TRUNCATED:");
    expect(output.omittedFiles).toContain("three.txt");
  });

  it("caps untracked file contents and lists omitted paths", () => {
    const files = ["a.txt", "b.txt", "c.txt"].map((path) => ({
      path,
      content: "z".repeat(20_000),
    }));
    const output = applyBudget(baseInput({ untracked: files }), UNTRACKED_CAP * 2);
    const withContent = output.untracked.filter(
      (file) => file.content !== undefined,
    );
    expect(withContent.length).toBeLessThan(files.length);
    expect(output.untracked.some((file) => file.omittedReason === "budget")).toBe(
      true,
    );
    expect(output.omittedFiles.length).toBeGreaterThan(0);
    expect(output.truncatedSections).toContain("untracked");
  });

  it("shrinks sections until the total budget is met", () => {
    const content = "y".repeat(10_000);
    const output = applyBudget(
      baseInput({
        intent: "Fix login",
        testLog: { text: content, source: "stdin" },
        stagedDiff: diffBlock("staged.txt", 10_000),
        unstagedDiff: diffBlock("unstaged.txt", 10_000),
        untracked: [{ path: "u.txt", content }],
      }),
      3_000,
    );
    expect(output.usedBytes).toBeLessThanOrEqual(3_000);
    expect(output.truncatedSections.length).toBeGreaterThan(0);
    expect(output.untracked[0]?.content).toBeUndefined();
  });
});
