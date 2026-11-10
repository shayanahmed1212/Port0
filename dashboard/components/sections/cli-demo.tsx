"use client"

import { SectionTitle } from "@/components/ui/section-title"
import { AlertTriangle, Check, Copy } from "lucide-react"
import { useState } from "react"

const cliCommands = [
  {
    title: "Export a packet",
    command: `npx port0 export --intent "Fix login validation"`,
    description:
      "Captures branch, HEAD, staged and unstaged diffs, untracked files and your intent into port0-packet.json.",
  },
  {
    title: "Pipe a failing test log",
    command: `pnpm test 2>&1 | npx port0 export --test-log - --intent "Fix failing tests"`,
    description:
      "Sends the tail of your test output straight into the packet so the next tool sees the failure.",
  },
  {
    title: "Write JSON and Markdown",
    command: `npx port0 export --intent "Refactor auth" --format both`,
    description:
      "Writes port0-packet.json for the inspector and port0-packet.md for an AI chat or teammate.",
  },
  {
    title: "Verify an existing packet",
    command: `npx port0 verify port0-packet.json`,
    description:
      "Validates the schema, recomputes the hash and re-scans for secrets. Exit 0 only if clean.",
  },
  {
    title: "Render the prompt",
    command: `npx port0 render port0-packet.json`,
    description:
      "Prints the Markdown handoff prompt from an existing packet, for CLI-to-CLI or teammate handoff.",
  },
]

const importantFlags = [
  {
    flag: "--intent",
    text: "Describes what you were doing and what to do next. Max 2,000 characters.",
  },
  {
    flag: "--test-log -",
    text: "Read failing tests from stdin: pnpm test 2>&1 | npx port0 export --test-log -",
  },
  {
    flag: "--format both",
    text: "Writes JSON and Markdown in one run.",
  },
  {
    flag: "--stdout",
    text: "Print the chosen format for piping: --format md --stdout | clip",
  },
  {
    flag: "--max-bytes",
    text: "Raise or lower the packet cap. Default 204800, minimum 20000.",
  },
  {
    flag: "--no-untracked-content",
    text: "List untracked files by path only, without their contents.",
  },
]

export function CLIDemo() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      setCopiedIndex(null)
    }
  }

  return (
    <section
      id="cli-demo"
      className="border-border bg-secondary/30 py-20 md:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionTitle className="section-title-animate mb-6 text-3xl font-semibold tracking-tight md:mb-8 md:text-4xl lg:text-5xl">
              CLI Reference
            </SectionTitle>
            <p className="mb-8 leading-relaxed text-muted-foreground">
              Port0 is a read-only CLI. Run it with{" "}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono text-sm">
                npx port0 export
              </code>{" "}
              — no accounts, no servers, and no network calls with your code.
            </p>

            <div
              className="overflow-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 font-mono text-sm text-zinc-300"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              <pre>{`$ npx port0 export --help

Port0 v1.0.0 — Switch tools. Keep the context.
Leave the secrets behind.

USAGE:
  port0 export [OPTIONS]
  port0 verify <packet>
  port0 render <packet>

EXPORT OPTIONS:
  --root <dir>              Project root (default: current directory)
  --out <path>              Output file (default: port0-packet.json)
  --format <json|md|both>   Output format (default: json)
  --stdout                  Write the chosen format to stdout
  --intent <text>           What you were doing and what to do next
  --intent-file <path>      Read intent from a file inside the root
  --test-log <path|->       Failing test output from a file or stdin
  --max-bytes <n>           Total cap (default 204800, min 20000)
  --no-untracked-content    List untracked files by path only
  --exclude <glob>          Extra denylist pattern (repeatable)
  --quiet                   Suppress the summary line

EXIT CODES:
  0  Success
  1  Usage error
  2  Not a git repo, or git not installed
  3  Fail-closed: a secret survived the final scan
  4  I/O error
  5  verify failed`}</pre>
            </div>
          </div>

          <div className="space-y-4">
            {cliCommands.map((cmd, index) => (
              <div
                key={cmd.title}
                className="group rounded-xl border border-zinc-700 bg-zinc-900 p-5 transition-all hover:border-[#203eec]/40"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-zinc-100">{cmd.title}</h4>
                  <button
                    onClick={() => copyToClipboard(cmd.command, index)}
                    className="shrink-0 rounded-lg bg-zinc-800 p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
                    aria-label="Copy command"
                  >
                    {copiedIndex === index ? (
                      <Check
                        className="h-4 w-4 text-green-400"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
                <code
                  className="block break-all font-mono text-sm text-zinc-300"
                  style={{ fontFamily: "var(--font-geist-mono)" }}
                >
                  {cmd.command}
                </code>
                <p className="mt-2 text-xs text-zinc-400">{cmd.description}</p>
              </div>
            ))}

            <div className="mt-6 rounded-xl border border-[#203eec]/20 bg-[#203eec]/10 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-[#203eec] dark:text-[#5b8cff]">
                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                Flags worth knowing
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {importantFlags.map((item) => (
                  <li key={item.flag} className="flex flex-col gap-1">
                    <code className="w-fit rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                      {item.flag}
                    </code>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
