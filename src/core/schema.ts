import { z } from "zod";

export const SchemaVersion = "1" as const;

export const RepoStateSchema = z.object({
  name: z.string(),
  branch: z.string(),
  head: z.string(),
  recentCommits: z.array(z.string()),
});

export const RedactionReportSchema = z.object({
  counts: z.record(z.string(), z.number().int().nonnegative()),
  denylisted: z.array(z.string()),
});

export const BudgetSchema = z.object({
  maxBytes: z.number(),
  omittedFiles: z.array(z.string()),
  truncated: z.array(z.string()),
});

export const PacketSchema = z.object({
  schemaVersion: z.literal(SchemaVersion),
  repo: RepoStateSchema,
  intent: z.string(),
  status: z.string(),
  stagedDiff: z.string(),
  unstagedDiff: z.string(),
  untracked: z.array(z.object({ path: z.string(), content: z.string().optional(), contentOmitted: z.string().optional() })),
  testLog: z.string(),
  redaction: RedactionReportSchema,
  budget: BudgetSchema,
  contentHash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type Packet = z.infer<typeof PacketSchema>;
