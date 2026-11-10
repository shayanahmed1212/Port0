#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolveRoot, ensureInside } from "./guard.js";
import { collectGitState, isGitRepo } from "./git.js";
import { writeFile } from "./io.js";
import { PacketSchema } from "../core/schema.js";
import { canonicalJson, computeHash } from "../core/serializer.js";
import { redactText, isDenylistedPath } from "../core/redactor.js";
import { renderMarkdown } from "../core/prompt.js";
import { applyBudget } from "../core/budget.js";

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      root: { type: "string", default: "." },
      out: { type: "string", default: "port0-packet.json" },
      format: { type: "string", default: "json" },
      intent: { type: "string", default: "" },
      "test-log": { type: "string" },
      "max-bytes": { type: "string", default: "204800" },
      stdout: { type: "boolean" },
      version: { type: "boolean" },
      help: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const cmd = positionals[0];
  if (values.version) { console.log("1.0.0"); process.exit(0); }
  if (values.help) { console.log("port0 export|verify|render"); process.exit(0); }
  if (values.help) { console.log("port0 export|verify|render"); process.exit(0); }

  if (cmd === "verify") {
    const fs = await import("node:fs");
    const raw = fs.readFileSync(positionals[1]!, "utf8");
    const parsed = JSON.parse(raw);
    PacketSchema.parse(parsed);
    const recomputed = await computeHash(parsed);
    if (recomputed !== parsed.contentHash) {
      console.error("hash mismatch");
      process.exit(5);
    }
    console.log("OK");
    process.exit(0);
  }

  if (cmd === "render") {
    const fs = await import("node:fs");
    const raw = fs.readFileSync(positionals[1]!, "utf8");
    const parsed = JSON.parse(raw);
    console.log(renderMarkdown(parsed, "1.0.0"));
    process.exit(0);
  }

  // default export
  const root = resolveRoot(values.root as string);
  if (!(await isGitRepo(root))) {
    console.error("Not a git repo");
    process.exit(2);
  }

  const state = await collectGitState(root);
  const denylisted: string[] = [];
  const untracked: { path: string; content?: string; contentOmitted?: string }[] = [];
  for (const p of state.untrackedPaths) {
    if (isDenylistedPath(p)) {
      denylisted.push(p);
      untracked.push({ path: p, contentOmitted: "denylist" });
      continue;
    }
    const fs = await import("node:fs");
    const content = fs.readFileSync(root + "/" + p, "utf8");
    const r = redactText(content);
    untracked.push({ path: p, content: r.text });
  }

  const stagedRedacted = redactText(state.stagedDiff);
  const unstagedRedacted = redactText(state.unstagedDiff);

  let testLog = "";
  if (values["test-log"]) {
    if (values["test-log"] === "-") {
      const chunks: Buffer[] = [];
      for await (const c of process.stdin) chunks.push(c as Buffer);
      testLog = Buffer.concat(chunks).toString("utf8");
    } else {
      const fs = await import("node:fs");
      testLog = fs.readFileSync(values["test-log"] as string, "utf8");
    }
  }
  const testRedacted = redactText(testLog);

  const maxBytes = Number(values["max-bytes"]);
  if (!Number.isFinite(maxBytes) || maxBytes < 1024) {
    console.error("invalid max-bytes");
    process.exit(1);
  }
  const sections: Record<string, string> = {
    staged: stagedRedacted.text,
    unstaged: unstagedRedacted.text,
    untracked: untracked.map((u) => u.content).join("\n"),
    testLog: testRedacted.text,
  };
  const budgeted = applyBudget(sections, maxBytes);

  const packet = {
    schemaVersion: "1",
    repo: {
      name: root.split(/[\\/]/).pop() ?? "repo",
      branch: state.branch,
      head: state.head,
      recentCommits: state.recentCommits,
    },
    intent: values.intent as string,
    status: state.status.split("\n").filter(Boolean).filter((l) => !/port0-packet/.test(l)).map((l) => ({ path: l.slice(3).trim(), contentOmitted: l.slice(3).trim() === ".env" ? "denylist" : undefined })),
    stagedDiff: budgeted.sections.staged,
    unstagedDiff: budgeted.sections.unstaged,
    untracked,
    testLog: budgeted.sections.testLog,
    redaction: {
      counts: { ...stagedRedacted.counts, ...unstagedRedacted.counts, ...testRedacted.counts },
      deniedPaths: denylisted,
    },
    budget: {
      maxBytes,
      omittedFiles: budgeted.omittedFiles,
      truncated: budgeted.truncated,
    },
  };

  const contentHash = await computeHash(packet as Record<string, unknown>);
  const finalPacket = { ...packet, contentHash };
  PacketSchema.parse(finalPacket);

  if (values.stdout) {
    console.log(renderMarkdown(finalPacket, "1.0.0"));
  } else {
    const outPath = ensureInside(root, values.out as string);
    writeFile(outPath, canonicalJson(finalPacket));
    if (values.format === "md" || values.format === "both") {
      const mdPath = outPath.replace(/\.json$/, ".md");
      writeFile(mdPath, renderMarkdown(finalPacket, "1.0.0"));
    }
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
