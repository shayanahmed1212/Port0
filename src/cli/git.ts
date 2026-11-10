import { execa } from "execa";
import { realpathSync } from "node:fs";
import { EXIT, Port0Error } from "./errors.js";
import { isDenylistedPath, type DenylistOptions } from "../core/redactor.js";
import {
  compareByteOrder,
  normalizeLF,
} from "../core/serializer.js";
import type {
  FileState,
  FileStatus,
  RecentCommit,
  UntrackedFile,
} from "../core/schema.js";
import { safeReadText } from "./guard.js";

const GIT_ENV = {
  GIT_OPTIONAL_LOCKS: "0",
  GIT_PAGER: "cat",
  GIT_TERMINAL_PROMPT: "0",
  GIT_EXTERNAL_DIFF: "",
  LC_ALL: "C",
};

const BASE_ARGS = [
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.pager=cat",
  "-c",
  "color.ui=false",
  "-c",
  "diff.external=",
];

const UNTRACKED_FILE_CAP = 20 * 1024;
const UNTRACKED_FILE_COUNT = 50;

interface GitResult {
  stdout: string;
  ok: boolean;
}

async function run(
  root: string,
  args: string[],
  allowFailure = false,
): Promise<GitResult> {
  const result = await execa("git", [...BASE_ARGS, ...args], {
    cwd: root,
    env: GIT_ENV,
    reject: false,
    stripFinalNewline: false,
  });
  const ok = result.exitCode === 0;
  if (!ok && !allowFailure) {
    throw new Port0Error(
      `git ${args[0] ?? ""} failed in ${root}`,
      EXIT.ENVIRONMENT,
    );
  }
  return { stdout: result.stdout, ok };
}

export async function assertGitAvailable(): Promise<void> {
  try {
    const result = await execa("git", ["--version"], {
      reject: false,
      env: GIT_ENV,
      stripFinalNewline: false,
    });
    if (result.exitCode !== 0) throw new Error("git missing");
  } catch {
    throw new Port0Error(
      "git is not installed or is not on PATH",
      EXIT.ENVIRONMENT,
    );
  }
}

export async function findGitRoot(input: string): Promise<string> {
  let result;
  try {
    result = await execa("git", [...BASE_ARGS, "rev-parse", "--show-toplevel"], {
      cwd: input,
      env: GIT_ENV,
      reject: false,
      stripFinalNewline: false,
    });
  } catch {
    throw new Port0Error(`Not a git repository: ${input}`, EXIT.ENVIRONMENT);
  }
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    throw new Port0Error(`Not a git repository: ${input}`, EXIT.ENVIRONMENT);
  }
  try {
    return realpathSync(result.stdout.trim());
  } catch {
    throw new Port0Error(
      `Could not resolve repository root: ${input}`,
      EXIT.ENVIRONMENT,
    );
  }
}

function mapState(character: string): FileState {
  switch (character) {
    case "A":
      return "A";
    case "D":
      return "D";
    case "R":
      return "R";
    case "C":
      return "C";
    case "U":
      return "U";
    case "?":
      return "?";
    default:
      return "M";
  }
}

function statusItem(
  xy: string,
  filePath: string,
  renamedFrom?: string,
): FileStatus {
  const index = xy[0] ?? ".";
  const worktree = xy[1] ?? ".";
  const staged = index !== "." && index !== " ";
  const unstaged = worktree !== "." && worktree !== " ";

  let state: FileState;
  if (index === "R" || worktree === "R") state = "R";
  else if (index === "C" || worktree === "C") state = "C";
  else if (index === "U" || worktree === "U") state = "U";
  else if (staged) state = mapState(index);
  else state = mapState(worktree);

  const item: FileStatus = {
    path: filePath,
    state,
    staged,
    unstaged,
  };
  if (renamedFrom !== undefined && (state === "R" || state === "C")) {
    item.renamedFrom = renamedFrom;
  }
  return item;
}

function parsePorcelain(output: string): {
  status: FileStatus[];
  untrackedPaths: string[];
} {
  const tokens = output.split("\0");
  const status: FileStatus[] = [];
  const untrackedPaths: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    index += 1;
    if (!token) continue;

    if (token.startsWith("? ")) {
      const filePath = token.slice(2);
      untrackedPaths.push(filePath);
      status.push({
        path: filePath,
        state: "?",
        staged: false,
        unstaged: false,
      });
      continue;
    }

    if (token.startsWith("1 ")) {
      const fields = token.split(" ");
      const xy = fields[1] ?? "..";
      const filePath = fields.slice(8).join(" ");
      if (filePath) status.push(statusItem(xy, filePath));
      continue;
    }

    if (token.startsWith("2 ")) {
      const fields = token.split(" ");
      const xy = fields[1] ?? "..";
      const filePath = fields.slice(9).join(" ");
      const renamedFrom = tokens[index] ?? undefined;
      index += 1;
      if (filePath) status.push(statusItem(xy, filePath, renamedFrom));
      continue;
    }

    if (token.startsWith("u ")) {
      const fields = token.split(" ");
      const filePath = fields.slice(10).join(" ");
      if (filePath) {
        status.push({
          path: filePath,
          state: "U",
          staged: false,
          unstaged: true,
        });
      }
    }
  }

  status.sort((left, right) => compareByteOrder(left.path, right.path));
  return { status, untrackedPaths };
}

function splitCommits(output: string): RecentCommit[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const tab = line.indexOf("\t");
      if (tab < 0) return { hash: line.trim(), subject: "" };
      return {
        hash: line.slice(0, tab).trim(),
        subject: line.slice(tab + 1).trim(),
      };
    })
    .filter((commit) => /^[0-9a-f]{7,40}$/.test(commit.hash));
}

export interface GitState {
  name: string;
  branch: string | null;
  detached: boolean;
  headCommit: string | null;
  recentCommits: RecentCommit[];
  status: FileStatus[];
  untrackedPaths: string[];
  stagedDiff: string;
  unstagedDiff: string;
}

export async function collectGitState(root: string): Promise<GitState> {
  const headResult = await run(root, ["rev-parse", "HEAD"], true);
  const headCommit = headResult.ok
    ? headResult.stdout.trim().toLowerCase() || null
    : null;

  const branchResult = await run(root, ["symbolic-ref", "--short", "-q", "HEAD"], true);
  const branch =
    branchResult.ok && branchResult.stdout.trim()
      ? branchResult.stdout.trim()
      : null;

  const logResult = await run(
    root,
    ["log", "-n", "5", "--format=%h%x09%s"],
    true,
  );
  const recentCommits = logResult.ok ? splitCommits(logResult.stdout) : [];

  const statusResult = await run(
    root,
    ["status", "--porcelain=v2", "-z", "--untracked-files=all"],
  );
  const parsed = parsePorcelain(statusResult.stdout);

  const stagedResult = await run(
    root,
    ["diff", "--cached", "--no-ext-diff", "--no-textconv", "--no-color"],
    true,
  );
  const unstagedResult = await run(
    root,
    ["diff", "--no-ext-diff", "--no-textconv", "--no-color"],
    true,
  );

  return {
    name: root.split(/[\\/]/).filter(Boolean).pop() ?? "repo",
    branch,
    detached: branch === null,
    headCommit,
    recentCommits,
    status: parsed.status,
    untrackedPaths: parsed.untrackedPaths,
    stagedDiff: stagedResult.ok ? normalizeLF(stagedResult.stdout) : "",
    unstagedDiff: unstagedResult.ok ? normalizeLF(unstagedResult.stdout) : "",
  };
}

export function collectUntracked(
  root: string,
  paths: string[],
  options: { noContent: boolean; exclude?: readonly string[] },
): UntrackedFile[] {
  const denylistOptions: DenylistOptions = options.exclude
    ? { exclude: options.exclude }
    : {};
  const sorted = [...paths].sort(compareByteOrder);
  const files: UntrackedFile[] = [];

  for (const [index, filePath] of sorted.entries()) {
    if (isDenylistedPath(filePath, denylistOptions)) {
      files.push({ path: filePath, omittedReason: "denylist" });
      continue;
    }
    if (options.noContent) {
      files.push({ path: filePath, omittedReason: "requested" });
      continue;
    }
    if (index >= UNTRACKED_FILE_COUNT) {
      files.push({ path: filePath, omittedReason: "budget" });
      continue;
    }
    const result = safeReadText(root, filePath, UNTRACKED_FILE_CAP);
    if (result.text === null) {
      files.push({
        path: filePath,
        omittedReason: result.reason ?? "binary",
      });
    } else {
      files.push({ path: filePath, content: result.text });
    }
  }

  return files;
}

export function removeDiffBlocks(diff: string, paths: readonly string[]): string {
  if (!diff || paths.length === 0) return diff;
  const starts = Array.from(diff.matchAll(/^diff --git /gm), (match) => match.index ?? 0);
  if (starts.length === 0) return diff;

  const blocks = starts.map((start, index) =>
    diff.slice(start, starts[index + 1] ?? diff.length),
  );
  const denied = new Set(paths.map((item) => item.replace(/\\/g, "/")));
  const kept = blocks.filter((block) => {
    const header = block.split("\n", 1)[0] ?? "";
    const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(header);
    const filePath = match?.[2] ?? match?.[1] ?? "";
    return !denied.has(filePath);
  });

  return kept.join("");
}
