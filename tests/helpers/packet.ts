import type { Packet } from "../../src/core/schema";

export function makePacket(overrides: Partial<Packet> = {}): Packet {
  return {
    schemaVersion: "1",
    port0Version: "1.0.0",
    contentHash: "0".repeat(64),
    intent: "",
    repo: {
      name: "demo",
      branch: "main",
      detached: false,
      headCommit: "a".repeat(40),
      recentCommits: [],
    },
    status: [],
    diffs: {
      staged: { text: "", truncated: false },
      unstaged: { text: "", truncated: false },
    },
    untracked: [],
    testLog: null,
    redaction: { counts: {}, deniedPaths: [] },
    budget: {
      maxBytes: 204_800,
      usedBytes: 0,
      truncatedSections: [],
      omittedFiles: [],
    },
    ...overrides,
  };
}
