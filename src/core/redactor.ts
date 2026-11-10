export type RedactionCounts = Record<string, number>;

export interface RedactResult {
  text: string;
  counts: RedactionCounts;
}

export interface AuditFinding {
  section: string;
  type: string;
  preview: string;
}

export interface DenylistOptions {
  exclude?: readonly string[];
}

type RuleMode = "literal" | "prefix" | "url" | "env";

interface Rule {
  type: string;
  regex: RegExp;
  mode: RuleMode;
}

const RULES: Rule[] = [
  {
    type: "private-key",
    regex:
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g,
    mode: "literal",
  },
  {
    type: "aws-access-key",
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    mode: "literal",
  },
  {
    type: "github-token",
    regex: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}\b/g,
    mode: "literal",
  },
  {
    type: "github-token",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
    mode: "literal",
  },
  {
    type: "slack-token",
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    mode: "literal",
  },
  {
    type: "stripe-key",
    regex: /\b(?:sk_live_|sk_test_|rk_live_|rk_test_)[A-Za-z0-9]{16,}\b/g,
    mode: "literal",
  },
  {
    type: "google-api-key",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    mode: "literal",
  },
  {
    type: "jwt",
    regex:
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    mode: "literal",
  },
  {
    type: "bearer-token",
    regex: /\b(Bearer[ \t]+)[A-Za-z0-9._~+/=-]{20,}/gi,
    mode: "prefix",
  },
  {
    type: "url-credentials",
    regex: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:)(?!\[REDACTED:)([^\s@/]+)(@)/gi,
    mode: "url",
  },
  {
    type: "env-assignment",
    regex:
      /^([ \t]*(?:export[ \t]+)?[A-Za-z0-9_.-]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL)[A-Za-z0-9_.-]*[ \t]*=[ \t]*)(?!\[REDACTED:)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s#]+)/gim,
    mode: "env",
  },
];

const AWS_SECRET_LINE = /^.*aws.*secret.*access.*key.*$/gim;
const AWS_SECRET_VALUE = /[A-Za-z0-9/+=]{40}/g;

function bump(counts: RedactionCounts, type: string): void {
  counts[type] = (counts[type] ?? 0) + 1;
}

export function redactText(input: string): RedactResult {
  let text = input;
  const counts: RedactionCounts = {};

  for (const rule of RULES) {
    text = text.replace(rule.regex, (...args: unknown[]) => {
      bump(counts, rule.type);
      const groups = args.slice(1).filter((value) => typeof value === "string") as string[];
      switch (rule.mode) {
        case "prefix":
          return `${groups[0] ?? ""}[REDACTED:${rule.type}]`;
        case "url":
          return `${groups[0] ?? ""}[REDACTED:${rule.type}]${groups[2] ?? ""}`;
        case "env":
          return `${groups[0] ?? ""}[REDACTED:${rule.type}]`;
        default:
          return `[REDACTED:${rule.type}]`;
      }
    });
  }

  text = text.replace(AWS_SECRET_LINE, (line) =>
    line.replace(AWS_SECRET_VALUE, () => {
      bump(counts, "aws-secret");
      return "[REDACTED:aws-secret]";
    }),
  );

  return { text, counts };
}

export function mergeCounts(...counts: RedactionCounts[]): RedactionCounts {
  const merged: RedactionCounts = {};
  for (const entry of counts) {
    for (const [type, count] of Object.entries(entry)) {
      merged[type] = (merged[type] ?? 0) + count;
    }
  }
  return merged;
}

function normalize(input: string): string {
  return input.replace(/\\/g, "/").replace(/^\.\//, "");
}

function globToRegex(glob: string): RegExp {
  const normalized = normalize(glob);
  let source = "";
  for (const character of normalized) {
    if (character === "*") source += ".*";
    else if (character === "?") source += ".";
    else source += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "i");
}

function matchesExclude(path: string, exclude: readonly string[]): boolean {
  const base = path.split("/").pop() ?? path;
  return exclude.some((glob) => {
    const matcher = globToRegex(glob);
    return matcher.test(path) || matcher.test(base);
  });
}

export function isDenylistedPath(
  input: string,
  options: DenylistOptions = {},
): boolean {
  const filePath = normalize(input);
  const base = filePath.split("/").pop() ?? filePath;

  if (options.exclude && matchesExclude(filePath, options.exclude)) {
    return true;
  }

  if (/^\.env(?:\..+)?$/.test(base)) {
    return base !== ".env.example" && base !== ".env.sample";
  }
  if (/\.(?:pem|key|p12|pfx|keystore)$/i.test(base)) return true;
  if (/^id_rsa/i.test(base) || /^id_ed25519/i.test(base)) return true;
  if ([".npmrc", ".netrc", ".pgpass"].includes(base)) return true;
  if (/^credentials/i.test(base)) return true;
  if (/^secrets\./i.test(base)) return true;

  const segments = filePath.split("/");
  if (segments.includes(".aws") || segments.includes(".ssh")) return true;

  return false;
}

export function scanText(input: string): { type: string; match: string }[] {
  const findings: { type: string; match: string }[] = [];

  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    for (const match of input.matchAll(rule.regex)) {
      findings.push({ type: rule.type, match: match[0] });
      if (findings.length >= 100) return findings;
    }
  }

  AWS_SECRET_LINE.lastIndex = 0;
  for (const line of input.matchAll(AWS_SECRET_LINE)) {
    AWS_SECRET_VALUE.lastIndex = 0;
    for (const value of line[0].matchAll(AWS_SECRET_VALUE)) {
      findings.push({ type: "aws-secret", match: value[0] });
      if (findings.length >= 100) return findings;
    }
  }

  return findings;
}

function maskPreview(value: string): string {
  const visible = value.slice(0, Math.min(4, value.length));
  return `${visible}${"*".repeat(8)}`;
}

function collectStrings(
  value: unknown,
  section: string,
  out: { section: string; text: string }[],
): void {
  if (typeof value === "string") {
    out.push({ section, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectStrings(item, `${section}[${index}]`, out),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      collectStrings(child, section ? `${section}.${key}` : key, out);
    }
  }
}

export function auditPacket(value: unknown): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const strings: { section: string; text: string }[] = [];
  collectStrings(value, "", strings);

  for (const { section, text } of strings) {
    for (const finding of scanText(text)) {
      findings.push({
        section: section || "root",
        type: finding.type,
        preview: maskPreview(finding.match),
      });
      if (findings.length >= 100) return findings;
    }
  }

  if (value && typeof value === "object") {
    const packet = value as {
      status?: unknown;
      untracked?: unknown;
    };
    for (const [section, files] of [
      ["status", packet.status],
      ["untracked", packet.untracked],
    ] as const) {
      if (!Array.isArray(files)) continue;
      for (const file of files) {
        if (!file || typeof file !== "object") continue;
        const path = (file as { path?: unknown }).path;
        if (typeof path === "string" && isDenylistedPath(path)) {
          findings.push({
            section,
            type: "denylisted-path",
            preview: maskPreview(path),
          });
          if (findings.length >= 100) return findings;
        }
      }
    }
  }

  return findings;
}
