import type { OmissionReason, UntrackedFile } from "./schema.js";
import { byteLength, compareByteOrder } from "./serializer.js";

export const INTENT_CAP = 2_048;
export const TEST_LOG_CAP = 40_960;
export const DIFF_CAP = 61_440;
export const UNTRACKED_CAP = 30_720;

export interface BudgetInput {
  intent: string;
  testLog: { text: string; source: "file" | "stdin" } | null;
  stagedDiff: string;
  unstagedDiff: string;
  untracked: UntrackedFile[];
}

export interface BudgetedDiff {
  text: string;
  truncated: boolean;
}

export interface BudgetOutput {
  intent: string;
  testLog: { text: string; source: "file" | "stdin"; truncated: boolean } | null;
  diffs: { staged: BudgetedDiff; unstaged: BudgetedDiff };
  untracked: UntrackedFile[];
  truncatedSections: string[];
  omittedFiles: string[];
  usedBytes: number;
}

interface DiffBlock {
  text: string;
  path: string | null;
}

function addUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

function safeEnd(buf: Buffer, end: number): number {
  let index = end;
  while (index > 0 && (buf[index]! & 0xc0) === 0x80) index -= 1;
  return index;
}

function safeStart(buf: Buffer, start: number): number {
  let index = start;
  while (index < buf.length && (buf[index]! & 0xc0) === 0x80) index += 1;
  return index;
}

function cutHead(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= maxBytes) return { text, truncated: false };
  return {
    text: buf.subarray(0, safeEnd(buf, maxBytes)).toString("utf8"),
    truncated: true,
  };
}

function cutTail(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= maxBytes) return { text, truncated: false };
  return {
    text: buf.subarray(safeStart(buf, buf.length - maxBytes)).toString("utf8"),
    truncated: true,
  };
}

function splitDiffBlocks(diff: string): DiffBlock[] {
  if (!diff) return [];
  const starts = Array.from(diff.matchAll(/^diff --git /gm), (match) => match.index ?? 0);
  if (starts.length === 0) {
    return [{ text: diff, path: null }];
  }
  return starts.map((start, index) => {
    const text = diff.slice(start, starts[index + 1] ?? diff.length);
    const header = text.split("\n", 1)[0] ?? "";
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(header);
    return { text, path: match?.[2] ?? null };
  });
}

function diffMarker(fileCount: number, bytes: number): string {
  return `\n[TRUNCATED: ${fileCount} files, ${bytes} bytes omitted]\n`;
}

function budgetDiff(
  diff: string,
  maxBytes: number,
  section: string,
  truncatedSections: string[],
  omittedFiles: string[],
): BudgetedDiff {
  const blocks = splitDiffBlocks(diff);
  if (blocks.length === 0) return { text: "", truncated: false };

  let used = 0;
  let kept = 0;
  for (const block of blocks) {
    const size = byteLength(block.text);
    if (used + size > maxBytes) break;
    used += size;
    kept += 1;
  }

  if (kept === blocks.length) {
    return { text: diff, truncated: false };
  }

  const omitted = blocks.slice(kept);
  const omittedBytes = omitted.reduce((total, block) => total + byteLength(block.text), 0);
  for (const block of omitted) {
    if (block.path) addUnique(omittedFiles, block.path);
  }
  addUnique(truncatedSections, section);

  return {
    text: `${omitted.length > 0 ? blocks.slice(0, kept).map((block) => block.text).join("") : ""}${diffMarker(omitted.length, omittedBytes)}`,
    truncated: true,
  };
}

function sortUntracked(files: UntrackedFile[]): UntrackedFile[] {
  return [...files].sort((left, right) => compareByteOrder(left.path, right.path));
}

function budgetUntracked(
  files: UntrackedFile[],
  maxBytes: number,
  truncatedSections: string[],
  omittedFiles: string[],
): UntrackedFile[] {
  let used = 0;
  return sortUntracked(files).map((file) => {
    if (file.content === undefined) return file;
    const size = byteLength(file.content);
    if (used + size <= maxBytes) {
      used += size;
      return file;
    }
    addUnique(truncatedSections, "untracked");
    addUnique(omittedFiles, file.path);
    return {
      path: file.path,
      omittedReason: "budget" as OmissionReason,
    };
  });
}

function sectionBytes(output: BudgetOutput): number {
  let total = byteLength(output.intent);
  if (output.testLog) total += byteLength(output.testLog.text);
  total += byteLength(output.diffs.staged.text);
  total += byteLength(output.diffs.unstaged.text);
  for (const file of output.untracked) {
    if (file.content !== undefined) total += byteLength(file.content);
  }
  return total;
}

function dropBlocksFromEnd(
  diff: BudgetedDiff,
  bytesToDrop: number,
  section: string,
  truncatedSections: string[],
  omittedFiles: string[],
): BudgetedDiff {
  if (bytesToDrop <= 0 || !diff.text) return diff;

  const markerMatch = /\n\[TRUNCATED: \d+ files?, \d+ bytes omitted\]\n$/.exec(diff.text);
  const marker = markerMatch?.[0] ?? "";
  const body = marker ? diff.text.slice(0, -marker.length) : diff.text;
  const blocks = splitDiffBlocks(body);
  if (blocks.length === 0) return diff;

  let droppedBytes = 0;
  const kept = [...blocks];
  while (kept.length > 0 && droppedBytes < bytesToDrop) {
    const block = kept.pop();
    if (!block) break;
    droppedBytes += byteLength(block.text);
    if (block.path) addUnique(omittedFiles, block.path);
  }

  if (droppedBytes === 0) return diff;

  addUnique(truncatedSections, section);
  return {
    text: `${kept.map((block) => block.text).join("")}${diffMarker(
      blocks.length - kept.length,
      droppedBytes,
    )}`,
    truncated: true,
  };
}

export function applyBudget(input: BudgetInput, maxBytes: number): BudgetOutput {
  const truncatedSections: string[] = [];
  const omittedFiles: string[] = [];

  const intentResult = cutHead(input.intent, Math.max(0, INTENT_CAP - 24));
  const intent = intentResult.truncated
    ? `${intentResult.text}\n[TRUNCATED: intent]`
    : intentResult.text;
  if (intentResult.truncated) addUnique(truncatedSections, "intent");

  let testLog: BudgetOutput["testLog"] = null;
  if (input.testLog) {
    const result = cutTail(input.testLog.text, Math.max(0, TEST_LOG_CAP - 24));
    testLog = {
      text: result.truncated
        ? `[TRUNCATED: test log]\n${result.text}`
        : result.text,
      source: input.testLog.source,
      truncated: result.truncated,
    };
    if (result.truncated) addUnique(truncatedSections, "testLog");
  }

  let output: BudgetOutput = {
    intent,
    testLog,
    diffs: {
      staged: budgetDiff(input.stagedDiff, DIFF_CAP, "stagedDiff", truncatedSections, omittedFiles),
      unstaged: budgetDiff(input.unstagedDiff, DIFF_CAP, "unstagedDiff", truncatedSections, omittedFiles),
    },
    untracked: budgetUntracked(input.untracked, UNTRACKED_CAP, truncatedSections, omittedFiles),
    truncatedSections,
    omittedFiles,
    usedBytes: 0,
  };

  let guard = 0;
  while (sectionBytes(output) > maxBytes && guard < 10_000) {
    guard += 1;
    const before = sectionBytes(output);

    const lastContentIndex = output.untracked.findLastIndex(
      (file) => file.content !== undefined,
    );
    if (lastContentIndex >= 0) {
      const file = output.untracked[lastContentIndex]!;
      output.untracked = output.untracked.map((item, index) =>
        index === lastContentIndex
          ? { path: item.path, omittedReason: "budget" as OmissionReason }
          : item,
      );
      addUnique(truncatedSections, "untracked");
      addUnique(omittedFiles, file.path);
      if (sectionBytes(output) < before) continue;
    }

    const unstagedOverage = sectionBytes(output) - maxBytes;
    const unstaged = dropBlocksFromEnd(
      output.diffs.unstaged,
      unstagedOverage,
      "unstagedDiff",
      truncatedSections,
      omittedFiles,
    );
    if (unstaged.text !== output.diffs.unstaged.text) {
      output.diffs.unstaged = unstaged;
      continue;
    }

    const stagedOverage = sectionBytes(output) - maxBytes;
    const staged = dropBlocksFromEnd(
      output.diffs.staged,
      stagedOverage,
      "stagedDiff",
      truncatedSections,
      omittedFiles,
    );
    if (staged.text !== output.diffs.staged.text) {
      output.diffs.staged = staged;
      continue;
    }

    if (output.testLog && output.testLog.text) {
      const overage = sectionBytes(output) - maxBytes;
      const currentBytes = byteLength(output.testLog.text);
      const nextBytes = Math.max(0, currentBytes - overage - 32);
      const result = cutTail(output.testLog.text, nextBytes);
      output.testLog = {
        ...output.testLog,
        text: result.truncated
          ? `[TRUNCATED: test log]\n${result.text}`
          : result.text,
        truncated: true,
      };
      addUnique(truncatedSections, "testLog");
      if (sectionBytes(output) < before) continue;
    }

    if (sectionBytes(output) >= before) break;
  }

  output.usedBytes = sectionBytes(output);
  return output;
}
