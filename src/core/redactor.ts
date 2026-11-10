export type RedactionCounts = Record<string, number>;

const PATTERNS: { type: string; regex: RegExp }[] = [
  { type: "aws-access-key", regex: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { type: "github-token", regex: /\b(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}\b/g },
  { type: "github-token", regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { type: "slack-token", regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { type: "stripe-key", regex: /\b(sk_live_|sk_test_|rk_live_)[A-Za-z0-9]{16,}\b/g },
  { type: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: "jwt", regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g },
  { type: "private-key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: "bearer-token", regex: /\bBearer\s+[A-Za-z0-9._-]{20,}\b/g },
  { type: "url-credentials", regex: /(https?:\/\/[^:\s]+:)([^@\s]+)(@)/g },
  { type: "env-assignment", regex: /^([A-Z_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL)[A-Z_]*)\s*=\s*.+$/gim },
];

export function redactText(input: string): { text: string; counts: RedactionCounts } {
  let text = input;
  const counts: RedactionCounts = {};
  for (const p of PATTERNS) {
    text = text.replace(p.regex, (match, ...groups) => {
      if (p.type === "url-credentials") {
        counts[p.type] = (counts[p.type] ?? 0) + 1;
        return `${groups[0]}[REDACTED:url-credentials]${groups[2]}`;
      }
      if (p.type === "env-assignment") {
        // keep name, redact value
        counts[p.type] = (counts[p.type] ?? 0) + 1;
        return match.replace(/=\s*.+$/, "= [REDACTED:env-assignment]");
      }
      counts[p.type] = (counts[p.type] ?? 0) + 1;
      return `[REDACTED:${p.type}]`;
    });
  }
  // aws-secret: 40-char base64 on line mentioning aws secret access key
  const awsSecretRegex = /^(.*aws.*secret.*access.*key.*)$/gim;
  text = text.replace(awsSecretRegex, (line) => {
    // redact 40-char base64 values
    const replaced = line.replace(/[A-Za-z0-9+/]{40}/g, () => {
      counts["aws-secret"] = (counts["aws-secret"] ?? 0) + 1;
      return "[REDACTED:aws-secret]";
    });
    return replaced;
  });
  return { text, counts };
}

export function isDenylistedPath(p: string): boolean {
  const base = p.split("/").pop() ?? p;
  const patterns = [
    /^\.env/i,
    /\.pem$/i,
    /^id_rsa/i,
    /^id_ed25519/i,
    /^\.npmrc$/i,
    /^\.netrc$/i,
    /^\.pgpass$/i,
    /^credentials/i,
    /^secrets\./i,
  ];
  if (patterns.some((r) => r.test(base))) return true;
  if (p.includes(".aws/") || p.includes(".ssh/")) return true;
  return false;
}
