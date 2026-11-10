import { execa } from "execa";

const ENV = {
  GIT_OPTIONAL_LOCKS: "0",
  GIT_PAGER: "cat",
  LC_ALL: "C",
  GIT_TERMINAL_PROMPT: "0",
};

const BASE_ARGS = ["-c", "core.fsmonitor=false"];

export async function git(root: string, args: string[]): Promise<string> {
  const r = await execa("git", [...BASE_ARGS, ...args], { cwd: root, env: ENV });
  return r.stdout;
}

export async function isGitRepo(root: string): Promise<boolean> {
  try {
    await git(root, ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export async function collectGitState(root: string) {
  const branch = (await git(root, ["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  const head = (await git(root, ["rev-parse", "HEAD"])).trim();
  const recentCommits = (await git(root, ["log", "-5", "--oneline"])).trim().split("\n").filter(Boolean);
  const status = await git(root, ["status", "--porcelain"]);
  const stagedDiff = await git(root, ["diff", "--cached", "--no-ext-diff", "--no-textconv"]);
  const unstagedDiff = await git(root, ["diff", "--no-ext-diff", "--no-textconv"]);
  const untrackedRaw = await git(root, ["ls-files", "--others", "--exclude-standard"]);
  const untrackedPaths = untrackedRaw.trim().split("\n").filter(Boolean).filter((p) => !/^port0-packet\./.test(p)).sort();
  return { branch, head, recentCommits, status, stagedDiff, unstagedDiff, untrackedPaths };
}
