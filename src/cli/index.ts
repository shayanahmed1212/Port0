#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  DEFAULT_MAX_BYTES,
  MIN_MAX_BYTES,
  PacketSchema,
  PacketWithoutHashSchema,
  PORT0_VERSION,
  SchemaVersion,
  type OmissionReason,
  type Packet,
  type PacketWithoutHash,
} from "../core/schema.js";
import {
  byteLength,
  canonicalJson,
  compareByteOrder,
  computeHash,
  normalizeLF,
} from "../core/serializer.js";
import {
  auditPacket,
  isDenylistedPath,
  mergeCounts,
  redactText,
  scanText,
  type DenylistOptions,
  type RedactionCounts,
} from "../core/redactor.js";
import { applyBudget, type BudgetInput } from "../core/budget.js";
import { renderMarkdown } from "../core/prompt.js";
import { EXIT, Port0Error } from "./errors.js";
import {
  assertGitAvailable,
  collectGitState,
  collectUntracked,
  findGitRoot,
  removeDiffBlocks,
} from "./git.js";
import {
  ensureInside,
  isInside,
  safeReadAllText,
  safeReadText,
} from "./guard.js";
import { readFileText, writeFileAtomic } from "./io.js";

const HELP = `port0 ${PORT0_VERSION}

Usage:
  port0 export [options]            Capture the working tree into a handoff packet
  port0 verify <packet.json>        Validate schema, integrity and secrets
  port0 render <packet.json>        Print the Markdown prompt
  port0 share <packet.json>         Not available in this build

Export options:
  --root <path>                Repository to capture (default: current directory)
  --out <path>                 Output path inside the repository (default: port0-packet.json)
  --format <json|md|both>      Output format (default: json)
  --stdout                     Write the chosen format to stdout instead of a file
  --intent <text>              Task intent
  --intent-file <path>         Read task intent from a file inside the repository
  --test-log <path|->          Test output file inside the repository, or - for stdin
  --max-bytes <n>              Total packet cap in bytes (default: ${DEFAULT_MAX_BYTES}, min: ${MIN_MAX_BYTES})
  --no-untracked-content       List untracked files by path only
  --exclude <glob>             Add a path or glob to the denylist (repeatable)
  --quiet                      Suppress the summary line
  --help, -h                   Show this help
  --version, -v                Print the version

Exit codes:
  0 success
  1 usage error
  2 not a git repository or git missing
  3 fail-closed secret that survived redaction
  4 I/O error
  5 verification failed
`;

interface ExportOptions {
  root: string;
  out: string;
  format: "json" | "md" | "both";
  stdout: boolean;
  intent: string | undefined;
  intentFile: string | undefined;
  testLog: string | undefined;
  maxBytes: number;
  noUntrackedContent: boolean;
  exclude: string[];
  quiet: boolean;
}

function parseExportOptions(values: Record<string, unknown>): ExportOptions {
  const formatRaw = String(values.format ?? "json").toLowerCase();
  if (formatRaw !== "json" && formatRaw !== "md" && formatRaw !== "both") {
    throw new Port0Error("--format must be json, md or both", EXIT.USAGE);
  }

  const maxRaw = String(values["max-bytes"] ?? DEFAULT_MAX_BYTES);
  if (!/^\d+$/.test(maxRaw)) {
    throw new Port0Error("--max-bytes must be a positive integer", EXIT.USAGE);
  }
  const maxBytes = Number(maxRaw);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < MIN_MAX_BYTES) {
    throw new Port0Error(
      `--max-bytes must be at least ${MIN_MAX_BYTES}`,
      EXIT.USAGE,
    );
  }

  if (values.intent !== undefined && values["intent-file"] !== undefined) {
    throw new Port0Error(
      "Use either --intent or --intent-file, not both",
      EXIT.USAGE,
    );
  }

  const exclude = Array.isArray(values.exclude)
    ? values.exclude.map((item) => String(item))
    : [];

  return {
    root: String(values.root ?? "."),
    out: String(values.out ?? "port0-packet.json"),
    format: formatRaw,
    stdout: Boolean(values.stdout),
    intent: values.intent === undefined ? undefined : String(values.intent),
    intentFile:
      values["intent-file"] === undefined
        ? undefined
        : String(values["intent-file"]),
    testLog:
      values["test-log"] === undefined
        ? undefined
        : String(values["test-log"]),
    maxBytes,
    noUntrackedContent: Boolean(values["no-untracked-content"]),
    exclude,
    quiet: Boolean(values.quiet),
  };
}

function assertOutputParentInside(root: string, outputPath: string): void {
  const parent = path.dirname(outputPath);
  if (!existsSync(parent)) return;
  const realParent = realpathSync(parent);
  if (!isInside(root, realParent)) {
    throw new Port0Error(
      "Output path must stay inside the repository root",
      EXIT.USAGE,
    );
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return normalizeLF(Buffer.concat(chunks).toString("utf8"));
}

function markdownPathFor(jsonPath: string): string {
  return jsonPath.toLowerCase().endsWith(".json")
    ? `${jsonPath.slice(0, -5)}.md`
    : `${jsonPath}.md`;
}

function relativePath(root: string, absolute: string): string {
  return path.relative(root, absolute).replace(/\\/g, "/");
}

function ownOutputMatcher(paths: readonly string[]): (filePath: string) => boolean {
  const normalized = new Set(paths.map((item) => item.replace(/\\/g, "/")));
  return (filePath: string) => {
    const candidate = filePath.replace(/\\/g, "/");
    if (normalized.has(candidate)) return true;
    return /(^|\/)port0-packet\.(json|md)$/.test(candidate);
  };
}

interface CollectedExport {
  packet: Packet;
  json: string;
  markdown: string;
}

async function buildExport(options: ExportOptions): Promise<CollectedExport> {
  await assertGitAvailable();
  const root = await findGitRoot(options.root);
  const state = await collectGitState(root);

  const outPath = options.stdout
    ? path.resolve(root, options.out)
    : ensureInside(root, options.out);
  const mdPath = markdownPathFor(outPath);
  if (!options.stdout) {
    ensureInside(root, outPath);
    ensureInside(root, mdPath);
    assertOutputParentInside(root, outPath);
    assertOutputParentInside(root, mdPath);
  }

  const ownOutputPaths = options.stdout
    ? []
    : [relativePath(root, outPath), relativePath(root, mdPath)];
  const isOwnOutput = ownOutputMatcher(ownOutputPaths);

  const status = state.status
    .filter((item) => !isOwnOutput(item.path))
    .map((item) => item);

  const untrackedPaths = state.untrackedPaths.filter(
    (item) => !isOwnOutput(item),
  );

  const denylistOptions: DenylistOptions = { exclude: options.exclude };
  const denied = new Set<string>();

  const markedStatus = status.map((item) => {
    if (isDenylistedPath(item.path, denylistOptions)) {
      denied.add(item.path);
      return { ...item, contentOmitted: "denylist" as OmissionReason };
    }
    return item;
  });

  const untracked = collectUntracked(root, untrackedPaths, {
    noContent: options.noUntrackedContent,
    exclude: options.exclude,
  });
  for (const file of untracked) {
    if (file.omittedReason === "denylist") denied.add(file.path);
  }

  const deniedPaths = Array.from(denied).sort(compareByteOrder);
  const diffExclusions = [
    ...deniedPaths,
    ...ownOutputPaths,
  ];

  const stagedDiff = removeDiffBlocks(state.stagedDiff, diffExclusions);
  const unstagedDiff = removeDiffBlocks(state.unstagedDiff, diffExclusions);

  const intentSource =
    options.intentFile !== undefined
      ? safeReadAllText(root, options.intentFile)
      : (options.intent ?? "");

  let testLogInput: { text: string; source: "file" | "stdin" } | null = null;
  if (options.testLog !== undefined) {
    if (options.testLog === "-") {
      testLogInput = { text: await readStdin(), source: "stdin" };
    } else {
      testLogInput = {
        text: safeReadAllText(root, options.testLog),
        source: "file",
      };
    }
  }

  const intentRedacted = redactText(normalizeLF(intentSource));
  const branchRedacted =
    state.branch === null ? null : redactText(state.branch);
  const repoNameRedacted = redactText(state.name);
  const recentCommits = state.recentCommits.map((commit) => {
    const subject = redactText(commit.subject);
    return { hash: commit.hash, subject: subject.text, counts: subject.counts };
  });

  const stagedRedacted = redactText(stagedDiff);
  const unstagedRedacted = redactText(unstagedDiff);
  const testRedacted =
    testLogInput === null ? null : redactText(testLogInput.text);

  const untrackedRedacted = untracked.map((file) => {
    if (file.content === undefined) return { file, counts: {} as RedactionCounts };
    const content = redactText(file.content);
    return {
      file: { ...file, content: content.text },
      counts: content.counts,
    };
  });

  const counts: RedactionCounts = mergeCounts(
    intentRedacted.counts,
    branchRedacted?.counts ?? {},
    repoNameRedacted.counts,
    ...recentCommits.map((commit) => commit.counts),
    stagedRedacted.counts,
    unstagedRedacted.counts,
    testRedacted?.counts ?? {},
    ...untrackedRedacted.map((entry) => entry.counts),
  );

  const budgetInput: BudgetInput = {
    intent: intentRedacted.text,
    testLog:
      testLogInput === null || testRedacted === null
        ? null
        : { text: testRedacted.text, source: testLogInput.source },
    stagedDiff: stagedRedacted.text,
    unstagedDiff: unstagedRedacted.text,
    untracked: untrackedRedacted.map((entry) => entry.file),
  };

  const redaction = {
    counts,
    deniedPaths,
  };

  let internalCap = Math.max(0, options.maxBytes - 2_048);
  let packet: Packet | null = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const budgeted = applyBudget(budgetInput, internalCap);

    const packetWithoutHash: PacketWithoutHash = {
      schemaVersion: SchemaVersion,
      port0Version: PORT0_VERSION,
      intent: budgeted.intent,
      repo: {
        name: repoNameRedacted.text,
        branch: branchRedacted?.text ?? null,
        detached: state.detached,
        headCommit: state.headCommit,
        recentCommits: recentCommits.map((commit) => ({
          hash: commit.hash,
          subject: commit.subject,
        })),
      },
      status: markedStatus,
      diffs: {
        staged: {
          text: budgeted.diffs.staged.text,
          truncated: budgeted.diffs.staged.truncated,
        },
        unstaged: {
          text: budgeted.diffs.unstaged.text,
          truncated: budgeted.diffs.unstaged.truncated,
        },
      },
      untracked: budgeted.untracked,
      testLog:
        budgeted.testLog === null
          ? null
          : {
              text: budgeted.testLog.text,
              truncated: budgeted.testLog.truncated,
              source: budgeted.testLog.source,
            },
      redaction,
      budget: {
        maxBytes: options.maxBytes,
        usedBytes: budgeted.usedBytes,
        truncatedSections: budgeted.truncatedSections,
        omittedFiles: [...new Set(budgeted.omittedFiles)].sort(compareByteOrder),
      },
    };

    PacketWithoutHashSchema.parse(packetWithoutHash);
    const contentHash = await computeHash(packetWithoutHash);
    const candidate: Packet = { ...packetWithoutHash, contentHash };
    PacketSchema.parse(candidate);
    packet = candidate;

    const size = byteLength(canonicalJson(candidate));
    if (size <= options.maxBytes || internalCap === 0) break;

    internalCap = Math.max(0, internalCap - (size - options.maxBytes) - 512);
  }

  if (packet === null) {
    throw new Port0Error("Could not build a packet", EXIT.IO);
  }

  const json = canonicalJson(packet);
  const markdown = renderMarkdown(packet, PORT0_VERSION);

  const jsonFindings = scanText(json);
  const markdownFindings = scanText(markdown);
  const survived = jsonFindings[0] ?? markdownFindings[0];
  if (survived) {
    throw new Port0Error(
      `Fail-closed: a ${survived.type} value survived redaction; no output written`,
      EXIT.SECRET,
    );
  }

  return { packet, json, markdown };
}

async function runExport(options: ExportOptions): Promise<void> {
  const result = await buildExport(options);
  const { packet, json, markdown } = result;

  const outPath = ensureInside(
    await findGitRoot(options.root),
    options.out,
  );
  const mdPath = markdownPathFor(outPath);

  if (options.stdout) {
    if (options.format === "json") {
      process.stdout.write(json);
    } else if (options.format === "md") {
      process.stdout.write(markdown);
    } else {
      process.stdout.write(`${json}\n${markdown}`);
    }
  } else {
    if (options.format === "json" || options.format === "both") {
      writeFileAtomic(outPath, json);
    }
    if (options.format === "md" || options.format === "both") {
      writeFileAtomic(mdPath, markdown);
    }
  }

  if (!options.quiet) {
    const secrets = Object.values(packet.redaction.counts).reduce(
      (total, count) => total + count,
      0,
    );
    const size = byteLength(
      options.format === "md" ? markdown : json,
    );
    const target =
      options.stdout
        ? "stdout"
        : options.format === "md"
          ? path.basename(mdPath)
          : path.basename(outPath);
    process.stderr.write(
      `Wrote ${target} (${(size / 1024).toFixed(1)} KB of ${(options.maxBytes / 1024).toFixed(0)} KB) · ${packet.redaction.deniedPaths.length} files denied · ${secrets} secrets redacted · ${packet.budget.truncatedSections.length} sections truncated · sha256 ${packet.contentHash.slice(0, 6)}…\n`,
    );
  }
}

function loadPacketFile(filePath: string): Packet {
  const raw = readFileText(filePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Port0Error("Packet is not valid JSON", EXIT.VERIFY);
  }
  const result = PacketSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
    throw new Port0Error(
      `Packet does not match schema v${SchemaVersion}\n${issues.join("\n")}`,
      EXIT.VERIFY,
    );
  }
  return result.data;
}

async function runVerify(filePath: string | undefined): Promise<void> {
  if (!filePath) {
    throw new Port0Error("verify requires a packet path", EXIT.USAGE);
  }
  const packet = loadPacketFile(filePath);
  const recomputed = await computeHash(packet);
  if (recomputed !== packet.contentHash) {
    throw new Port0Error(
      "Integrity check failed: contentHash does not match the packet",
      EXIT.VERIFY,
    );
  }

  const findings = auditPacket(packet).filter(
    (finding) => finding.type !== "denylisted-path",
  );
  if (findings.length > 0) {
    const detail = Array.from(
      new Set(findings.map((finding) => `${finding.section}:${finding.type}`)),
    ).join(", ");
    throw new Port0Error(
      `Secret re-scan failed: ${detail}`,
      EXIT.VERIFY,
    );
  }

  process.stdout.write(
    `OK ${path.basename(filePath)} sha256:${packet.contentHash.slice(0, 12)}…\n`,
  );
}

function runRender(filePath: string | undefined): void {
  if (!filePath) {
    throw new Port0Error("render requires a packet path", EXIT.USAGE);
  }
  const packet = loadPacketFile(filePath);
  process.stdout.write(renderMarkdown(packet, PORT0_VERSION));
}

async function main(): Promise<void> {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        root: { type: "string", default: "." },
        out: { type: "string", default: "port0-packet.json" },
        format: { type: "string", default: "json" },
        stdout: { type: "boolean", default: false },
        intent: { type: "string" },
        "intent-file": { type: "string" },
        "test-log": { type: "string" },
        "max-bytes": { type: "string", default: String(DEFAULT_MAX_BYTES) },
        "no-untracked-content": { type: "boolean", default: false },
        exclude: { type: "string", multiple: true, default: [] },
        quiet: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Port0Error(message, EXIT.USAGE);
  }

  if (parsed.values.version) {
    process.stdout.write(`${PORT0_VERSION}\n`);
    return;
  }
  if (parsed.values.help) {
    process.stdout.write(HELP);
    return;
  }

  const command = parsed.positionals[0] ?? "export";

  if (command === "verify") {
    if (parsed.positionals.length > 2) {
      throw new Port0Error("verify accepts one packet path", EXIT.USAGE);
    }
    await runVerify(parsed.positionals[1]);
    return;
  }

  if (command === "render") {
    if (parsed.positionals.length > 2) {
      throw new Port0Error("render accepts one packet path", EXIT.USAGE);
    }
    runRender(parsed.positionals[1]);
    return;
  }

  if (command === "share") {
    throw new Port0Error(
      "share is not available in this build",
      EXIT.USAGE,
    );
  }

  if (command !== "export") {
    throw new Port0Error(`Unknown command: ${command}`, EXIT.USAGE);
  }

  if (parsed.positionals.length > 1) {
    throw new Port0Error(
      `Unexpected argument: ${parsed.positionals[1]}`,
      EXIT.USAGE,
    );
  }

  const options = parseExportOptions(parsed.values as Record<string, unknown>);
  await runExport(options);
}

main().catch((error: unknown) => {
  if (error instanceof Port0Error) {
    process.stderr.write(`port0: ${error.message}\n`);
    process.exit(error.exitCode);
  }
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`port0: ${message}\n`);
  process.exit(EXIT.USAGE);
});
