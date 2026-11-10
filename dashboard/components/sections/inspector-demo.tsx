"use client"

import Link from "next/link"
import { useState } from "react"
import { SectionTitle } from "@/components/ui/section-title"
import {
  ArrowUpRight,
  Check,
  CheckCircle,
  Copy,
  Eye,
  FileJson,
  Shield,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const samplePacket = {
  schemaVersion: "1",
  port0Version: "1.0.0",
  contentHash: "9f3a1c4d2b8e7f60a5c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
  intent: "Fix login validation - reject invalid credentials properly",
  repo: {
    name: "my-project",
    branch: "feature/login-fix",
    detached: false,
    headCommit: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    recentCommits: [
      { hash: "a1b2c3d", subject: "add login validation test" },
      { hash: "9f8e7d6", subject: "wire auth form state" },
      { hash: "7c6b5a4", subject: "initial auth module" },
    ],
  },
  status: [
    { path: "src/auth/login.ts", state: "M", staged: true, unstaged: false },
    { path: "src/auth/validate.ts", state: "M", staged: true, unstaged: false },
    { path: "tests/login.test.ts", state: "A", staged: true, unstaged: false },
    { path: "src/auth/types.ts", state: "M", staged: false, unstaged: true },
    { path: "debug.log", state: "?", staged: false, unstaged: false },
  ],
  diffs: {
    staged: {
      text: "src/auth/login.ts\n@@ -1,4 +1,6 @@\n-export function validate() {}\n+export function validate(input) {\n+  return input.password.length > 0\n+}",
      truncated: false,
    },
    unstaged: {
      text: "src/auth/types.ts\n@@ -1,3 +1,4 @@\n export type LoginInput = {\n+  password: string\n }",
      truncated: false,
    },
  },
  untracked: [{ path: "debug.log", omittedReason: "too-large" }],
  testLog: {
    text: "FAIL tests/login.test.ts\n  Login validation > should reject invalid credentials\n    Expected: false\n    Received: true\n\nTests: 1 failed, 5 passed",
    truncated: false,
    source: "stdin" as const,
  },
  redaction: {
    counts: { "env-assignment": 1, "github-token": 1 },
    deniedPaths: [".env"],
  },
  budget: {
    maxBytes: 204800,
    usedBytes: 47231,
    truncatedSections: [],
    omittedFiles: ["debug.log"],
  },
}

const tabs = [
  { id: "overview", label: "Overview", icon: FileJson },
  { id: "schema", label: "Schema", icon: CheckCircle },
  { id: "integrity", label: "Integrity", icon: Shield },
  { id: "audit", label: "Audit", icon: Eye },
  { id: "prompt", label: "Prompt", icon: Copy },
]

const promptPreview = `# Port0 Handoff Packet

## Intent
Fix login validation - reject invalid credentials properly

## Repo state
- Repository: my-project
- Branch: feature/login-fix
- HEAD: a1b2c3d
- Recent commits: a1b2c3d add login validation test, 9f8e7d6 wire auth form state

## Failing tests
\`\`\`
FAIL tests/login.test.ts
  Login validation > should reject invalid credentials
    Expected: false
    Received: true
\`\`\`

## Changed files
- src/auth/login.ts (staged)
- src/auth/validate.ts (staged)
- tests/login.test.ts (staged)
- src/auth/types.ts (unstaged)

## Staged diff
src/auth/login.ts ...validate(input) { return input.password.length > 0 }

## Safety
- 2 secrets redacted: env-assignment (1), github-token (1)
- Denied paths: .env
- contentHash: sha256:9f3a1c4d...`

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-center">
      <div className="truncate font-mono text-lg font-black text-[#5b8cff] md:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-400">{label}</div>
    </div>
  )
}

export function InspectorDemo() {
  const [activeTab, setActiveTab] = useState("overview")
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptPreview)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const renderTab = () => {
    if (activeTab === "overview") {
      const staged = samplePacket.status.filter((item) => item.staged).length
      const unstaged = samplePacket.status.filter((item) => item.unstaged).length
      const untracked = samplePacket.untracked.length

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Repository" value={samplePacket.repo.name} />
            <StatCard label="Branch" value={samplePacket.repo.branch} />
            <StatCard
              label="HEAD"
              value={samplePacket.repo.headCommit.slice(0, 8)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Staged files" value={staged} />
            <StatCard label="Unstaged files" value={unstaged} />
            <StatCard label="Untracked files" value={untracked} />
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="font-semibold">Size budget</span>
              <span className="text-sm text-zinc-400">
                {samplePacket.budget.usedBytes.toLocaleString()} /{" "}
                {samplePacket.budget.maxBytes.toLocaleString()} bytes
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-[#203eec] transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (samplePacket.budget.usedBytes /
                      samplePacket.budget.maxBytes) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-3 text-sm text-zinc-400">{samplePacket.intent}</p>
          </div>
        </div>
      )
    }

    if (activeTab === "schema") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" strokeWidth={2} />
            <span className="font-semibold">Schema validation: PASSED</span>
          </div>
          <p className="text-sm text-zinc-400">
            Packet conforms to the Port0 v1 schema. Unknown keys are rejected
            before the packet is displayed.
          </p>
          <pre
            className="overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-300"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >{`schemaVersion : "1"
port0Version  : string
contentHash   : 64 lowercase hex
intent        : string (max 2,000 chars)
repo          : { name, branch, detached, headCommit, recentCommits }
status        : FileStatus[] sorted by path
diffs         : { staged: { text, truncated }, unstaged: { ... } }
untracked     : { path, content | omittedReason }[]
testLog       : { text, truncated, source } | null
redaction     : { counts, deniedPaths }
budget        : { maxBytes, usedBytes, truncatedSections, omittedFiles }`}</pre>
        </div>
      )
    }

    if (activeTab === "integrity") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="h-5 w-5" strokeWidth={2} />
            <span className="font-semibold">Integrity check: PASSED</span>
          </div>
          <p className="text-sm text-zinc-400">
            The canonical packet is re-serialized in the browser and hashed with
            SHA-256. The computed hash matches the packet.
          </p>
          <div
            className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-sm"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-zinc-400">Algorithm</span>
              <span className="text-[#5b8cff]">SHA-256</span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-zinc-400">Expected</span>
              <span className="break-all text-[#5b8cff]">
                {samplePacket.contentHash}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-zinc-400">Computed</span>
              <span className="break-all text-green-400">
                {samplePacket.contentHash}
              </span>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === "audit") {
      const counts = Object.entries(samplePacket.redaction.counts)
      return (
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 font-semibold">Redaction and audit</h4>
            <div className="space-y-2">
              {counts.map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-400" strokeWidth={2} />
                    <span className="font-mono text-sm">{type}</span>
                  </div>
                  <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                    {count} REDACTED
                  </span>
                </div>
              ))}
              {samplePacket.redaction.deniedPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-amber-400" strokeWidth={2} />
                    <span className="font-mono text-sm">{path}</span>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400">
                    DENIED
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" strokeWidth={2} />
              <span className="font-semibold">Fail-closed scan: CLEAN</span>
            </div>
            <p className="text-sm text-zinc-400">
              No secret patterns were found in the final packet. Export would
              succeed with exit code 0.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-semibold">AI-ready prompt (web chat template)</h4>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" strokeWidth={2} />
                Copy prompt
              </>
            )}
          </button>
        </div>
        <pre
          className="max-h-[400px] overflow-auto rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-xs text-zinc-300"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {promptPreview}
        </pre>
      </div>
    )
  }

  return (
    <section id="inspector-demo" className="border-border py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <SectionTitle className="section-title-animate text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
            Packet Inspector
          </SectionTitle>
          <Link
            href="/inspector"
            className="inline-flex w-fit items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            style={{ color: "#203eec", borderColor: "#203eec" }}
          >
            Open the live inspector
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900">
          <div className="flex flex-wrap gap-1 border-b border-zinc-700 bg-zinc-950/50 px-4 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-[#203eec] text-white shadow-lg"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                )}
              >
                <tab.icon className="h-4 w-4" strokeWidth={2} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-4 text-zinc-100 md:p-6">{renderTab()}</div>
        </div>
      </div>
    </section>
  )
}
