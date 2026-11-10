import { describe, expect, it } from "vitest";
import { renderMarkdown, renderPrompt } from "../src/core/prompt";
import { makePacket } from "./helpers/packet";

const packet = makePacket({
  intent: "Fix login validation",
  repo: {
    name: "demo-app",
    branch: "fix/login",
    detached: false,
    headCommit: "a".repeat(40),
    recentCommits: [{ hash: "abcdef1", subject: "add tests" }],
  },
  status: [
    {
      path: "src/login.ts",
      state: "M",
      staged: true,
      unstaged: false,
    },
  ],
  diffs: {
    staged: {
      text: "diff --git a/src/login.ts b/src/login.ts\n+change\n",
      truncated: false,
    },
    unstaged: { text: "", truncated: false },
  },
  untracked: [{ path: "debug.log", content: "line\n" }],
  testLog: { text: "FAIL login", truncated: false, source: "file" },
  redaction: { counts: { "aws-access-key": 1 }, deniedPaths: [".env"] },
});

describe("prompt", () => {
  it("renders the spec section order", () => {
    const markdown = renderMarkdown(packet, "1.0.0");
    const headings = [
      "## Task intent",
      "## Repo state",
      "## Failing tests",
      "## Changed files",
      "## Staged diff",
      "## Unstaged diff",
      "## Untracked files",
      "## Safety note",
    ];
    let previous = -1;
    for (const heading of headings) {
      const index = markdown.indexOf(heading);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
    expect(markdown).toContain("Fix login validation");
    expect(markdown).toContain("contentHash: sha256:");
    expect(markdown).toContain("Port0 v1.0.0");
  });

  it("keeps diffs out of terminal-agent by default", () => {
    const markdown = renderPrompt(packet, "terminal-agent");
    expect(markdown).toContain("## Failing tests");
    expect(markdown).toContain("## Changed files");
    expect(markdown).not.toContain("## Staged diff");
    expect(markdown).not.toContain("## Untracked files");
    expect(markdown).toContain("Do not re-apply the diffs");
  });

  it("honors explicit prompt options", () => {
    const markdown = renderPrompt(packet, "terminal-agent", {
      diffs: true,
      untracked: true,
      testLog: false,
    });
    expect(markdown).toContain("## Staged diff");
    expect(markdown).toContain("## Untracked files");
    expect(markdown).not.toContain("## Failing tests");
  });

  it("renders a teammate review prompt without the web preamble", () => {
    const markdown = renderPrompt(packet, "teammate");
    expect(markdown).not.toContain("You are receiving an in-progress coding task");
    expect(markdown).toContain("Please review and suggest the next step.");
  });
});
