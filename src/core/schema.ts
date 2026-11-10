import { z } from "zod";

export const SchemaVersion = "1" as const;
export const PORT0_VERSION = "1.0.0";
export const DEFAULT_MAX_BYTES = 204_800;
export const MIN_MAX_BYTES = 20_000;

export const FileStateSchema = z.enum(["A", "M", "D", "R", "C", "U", "?"]);
export type FileState = z.infer<typeof FileStateSchema>;

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.includes("\\") &&
    !value.startsWith("/") &&
    !/^[A-Za-z]:/.test(value) &&
    !value.split("/").includes("..")
  );
}

export const RelativePathSchema = z
  .string()
  .refine(isSafeRelativePath, "expected a relative POSIX path without ..");

export const OmissionReasonSchema = z.enum([
  "denylist",
  "binary",
  "too-large",
  "symlink",
  "budget",
]);
export type OmissionReason = z.infer<typeof OmissionReasonSchema>;

export const RecentCommitSchema = z
  .object({
    hash: z.string().regex(/^[0-9a-f]{7,40}$/),
    subject: z.string(),
  })
  .strict();
export type RecentCommit = z.infer<typeof RecentCommitSchema>;

export const RepoStateSchema = z
  .object({
    name: z.string().min(1),
    branch: z.string().nullable(),
    detached: z.boolean(),
    headCommit: z.string().regex(/^[0-9a-f]{40}$/).nullable(),
    recentCommits: z.array(RecentCommitSchema).max(5),
  })
  .strict();
export type RepoState = z.infer<typeof RepoStateSchema>;

export const FileStatusSchema = z
  .object({
    path: RelativePathSchema,
    state: FileStateSchema,
    staged: z.boolean(),
    unstaged: z.boolean(),
    renamedFrom: RelativePathSchema.optional(),
    contentOmitted: OmissionReasonSchema.optional(),
  })
  .strict();
export type FileStatus = z.infer<typeof FileStatusSchema>;

export const DiffSectionSchema = z
  .object({
    text: z.string(),
    truncated: z.boolean(),
  })
  .strict();
export type DiffSection = z.infer<typeof DiffSectionSchema>;

export const UntrackedFileSchema = z
  .object({
    path: RelativePathSchema,
    content: z.string().optional(),
    omittedReason: z.string().min(1).optional(),
  })
  .strict();
export type UntrackedFile = z.infer<typeof UntrackedFileSchema>;

export const TestLogSchema = z
  .object({
    text: z.string(),
    truncated: z.boolean(),
    source: z.enum(["file", "stdin"]),
  })
  .strict()
  .nullable();
export type TestLog = z.infer<typeof TestLogSchema>;

export const RedactionReportSchema = z
  .object({
    counts: z.record(z.string(), z.number().int().nonnegative()),
    deniedPaths: z.array(RelativePathSchema),
  })
  .strict();
export type RedactionReport = z.infer<typeof RedactionReportSchema>;

export const BudgetSchema = z
  .object({
    maxBytes: z.number().int().positive(),
    usedBytes: z.number().int().nonnegative(),
    truncatedSections: z.array(z.string()),
    omittedFiles: z.array(RelativePathSchema),
  })
  .strict();
export type Budget = z.infer<typeof BudgetSchema>;

const PacketFields = {
  schemaVersion: z.literal(SchemaVersion),
  port0Version: z.string().min(1),
  intent: z.string().max(2000),
  repo: RepoStateSchema,
  status: z.array(FileStatusSchema),
  diffs: z
    .object({
      staged: DiffSectionSchema,
      unstaged: DiffSectionSchema,
    })
    .strict(),
  untracked: z.array(UntrackedFileSchema),
  testLog: TestLogSchema,
  redaction: RedactionReportSchema,
  budget: BudgetSchema,
} as const;

export const PacketSchema = z
  .object({
    schemaVersion: PacketFields.schemaVersion,
    port0Version: PacketFields.port0Version,
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    intent: PacketFields.intent,
    repo: PacketFields.repo,
    status: PacketFields.status,
    diffs: PacketFields.diffs,
    untracked: PacketFields.untracked,
    testLog: PacketFields.testLog,
    redaction: PacketFields.redaction,
    budget: PacketFields.budget,
  })
  .strict();

export const PacketWithoutHashSchema = z
  .object({
    schemaVersion: PacketFields.schemaVersion,
    port0Version: PacketFields.port0Version,
    intent: PacketFields.intent,
    repo: PacketFields.repo,
    status: PacketFields.status,
    diffs: PacketFields.diffs,
    untracked: PacketFields.untracked,
    testLog: PacketFields.testLog,
    redaction: PacketFields.redaction,
    budget: PacketFields.budget,
  })
  .strict();

export type Packet = z.infer<typeof PacketSchema>;
export type PacketWithoutHash = z.infer<typeof PacketWithoutHashSchema>;
