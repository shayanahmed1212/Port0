import { describe, expect, it } from "vitest";
import {
  auditPacket,
  isDenylistedPath,
  mergeCounts,
  redactText,
  scanText,
} from "../src/core/redactor";
import { makePacket } from "./helpers/packet";

const githubToken = `ghp_${"a".repeat(36)}`;
const slackToken = `xoxb-${"1".repeat(12)}`;
const stripeKey = `sk_live_${"2".repeat(20)}`;
const googleKey = `AIza${"3".repeat(35)}`;
const jwt = `eyJ${"4".repeat(12)}.${"5".repeat(12)}.${"6".repeat(12)}`;
const bearer = `Bearer ${"7".repeat(24)}`;
const privateKey =
  "-----BEGIN RSA PRIVATE KEY-----\nMIIEexample\n-----END RSA PRIVATE KEY-----";

describe("redactor", () => {
  it("redacts AWS access keys", () => {
    const key = `AKIA${"A".repeat(16)}`;
    const result = redactText(`const key = "${key}"`);
    expect(result.text).not.toContain(key);
    expect(result.text).toContain("[REDACTED:aws-access-key]");
    expect(result.counts["aws-access-key"]).toBe(1);
  });

  it("redacts GitHub, Slack, Stripe, Google, JWT and Bearer tokens", () => {
    const result = redactText(
      [githubToken, slackToken, stripeKey, googleKey, jwt, bearer].join("\n"),
    );
    expect(result.text).not.toContain(githubToken);
    expect(result.text).not.toContain(slackToken);
    expect(result.text).not.toContain(stripeKey);
    expect(result.text).not.toContain(googleKey);
    expect(result.text).not.toContain(jwt);
    expect(result.text).not.toContain(bearer);
    expect(result.counts["github-token"]).toBe(1);
    expect(result.counts["slack-token"]).toBe(1);
    expect(result.counts["stripe-key"]).toBe(1);
    expect(result.counts["google-api-key"]).toBe(1);
    expect(result.counts.jwt).toBe(1);
    expect(result.counts["bearer-token"]).toBe(1);
  });

  it("redacts a whole private key block", () => {
    const result = redactText(privateKey);
    expect(result.text).not.toContain("BEGIN RSA PRIVATE KEY");
    expect(result.text).toBe("[REDACTED:private-key]");
    expect(result.counts["private-key"]).toBe(1);
  });

  it("redacts the password in URL credentials", () => {
    const password = "correct-horse-battery";
    const result = redactText(`https://user:${password}@example.com`);
    expect(result.text).not.toContain(password);
    expect(result.text).toContain("https://user:[REDACTED:url-credentials]@");
  });

  it("keeps env names and redacts values", () => {
    const result = redactText("DB_PASSWORD=hunter2\nGITHUB_TOKEN=abc123");
    expect(result.text).toContain("DB_PASSWORD=[REDACTED:env-assignment]");
    expect(result.text).toContain("GITHUB_TOKEN=[REDACTED:env-assignment]");
    expect(result.text).not.toContain("hunter2");
    expect(result.counts["env-assignment"]).toBe(2);
  });

  it("redacts AWS secret access key values", () => {
    const secret = "A".repeat(40);
    const result = redactText(`aws_secret_access_key: ${secret}`);
    expect(result.text).not.toContain(secret);
    expect(result.text).toContain("[REDACTED:aws-secret]");
    expect(result.counts["aws-secret"]).toBe(1);
  });

  it("does not re-flag already redacted markers", () => {
    const already = [
      "[REDACTED:env-assignment]",
      "DB_PASSWORD=[REDACTED:env-assignment]",
      "https://user:[REDACTED:url-credentials]@example.com",
      "Bearer [REDACTED:bearer-token]",
    ].join("\n");
    expect(scanText(already)).toEqual([]);
  });

  it("merges counts", () => {
    expect(mergeCounts({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 3, b: 3 });
  });
});

describe("path denylist", () => {
  it.each([
    ".env",
    ".env.local",
    "server.pem",
    "private.key",
    "id_rsa",
    "id_ed25519.pub",
    ".npmrc",
    ".netrc",
    ".pgpass",
    "credentials.json",
    "secrets.ts",
    ".ssh/id_rsa",
    "config/.aws/credentials",
  ])("denies %s", (filePath) => {
    expect(isDenylistedPath(filePath)).toBe(true);
  });

  it.each([".env.example", ".env.sample", "README.md", "src/app.ts"])(
    "allows %s",
    (filePath) => {
      expect(isDenylistedPath(filePath)).toBe(false);
    },
  );

  it("adds --exclude globs to the denylist", () => {
    expect(isDenylistedPath("test.log", { exclude: ["*.log"] })).toBe(true);
    expect(isDenylistedPath("config/prod.data", { exclude: ["config/*"] })).toBe(
      true,
    );
    expect(isDenylistedPath("src/app.ts", { exclude: ["*.log"] })).toBe(false);
  });
});

describe("audit", () => {
  it("finds secrets anywhere in a packet", () => {
    const packet = makePacket({
      diffs: {
        staged: {
          text: `diff --git a/a.ts b/a.ts\n+const token = "${githubToken}"`,
          truncated: false,
        },
        unstaged: { text: "", truncated: false },
      },
    });
    const findings = auditPacket(packet);
    expect(findings.some((finding) => finding.type === "github-token")).toBe(
      true,
    );
    expect(findings[0]?.preview).not.toContain(githubToken);
  });

  it("finds denylisted paths in status and untracked", () => {
    const packet = makePacket({
      status: [
        { path: ".env", state: "?", staged: false, unstaged: false },
      ],
      untracked: [{ path: ".env", omittedReason: "denylist" }],
    });
    const findings = auditPacket(packet);
    expect(
      findings.filter((finding) => finding.type === "denylisted-path"),
    ).toHaveLength(2);
  });

  it("returns no secret findings for a clean redacted packet", () => {
    const packet = makePacket({
      diffs: {
        staged: {
          text: "diff --git a/a.ts b/a.ts\n+const token = '[REDACTED:github-token]'",
          truncated: false,
        },
        unstaged: { text: "", truncated: false },
      },
    });
    expect(auditPacket(packet)).toEqual([]);
  });
});
