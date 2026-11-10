"use client"

import { SectionTitle } from "@/components/ui/section-title"
import {
  CheckCircle,
  FileCode,
  FileJson,
  Globe,
  Shield,
  Terminal,
} from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Run the CLI",
    icon: Terminal,
    description:
      "Execute npx port0 export in your repository. Provide your intent, pipe in failing test logs, and choose the output format.",
    details: [
      "Collects branch, HEAD, staged/unstaged diffs and untracked files",
      "Accepts a failing test log from stdin or a file",
      "Captures your stated intent for the receiving tool",
    ],
  },
  {
    number: "02",
    title: "Automatic redaction",
    icon: Shield,
    description:
      "Port0 applies a path denylist, content patterns, and a fail-closed final scan before anything leaves your machine.",
    details: [
      "Redacts API keys, tokens, passwords and private keys",
      "Lists denied paths and redaction counts in packet metadata",
      "Aborts with exit code 3 if a secret slips through",
    ],
  },
  {
    number: "03",
    title: "Deterministic packet",
    icon: FileJson,
    description:
      "A size-bounded JSON packet is serialized canonically and hashed with SHA-256 so both surfaces agree on what is valid and clean.",
    details: [
      "Sorted keys, LF line endings, no timestamps or absolute paths",
      "SHA-256 content hash for tamper detection",
      "Configurable byte budget with truncation markers",
      "Markdown prompt rendered from the same core templates",
    ],
  },
  {
    number: "04",
    title: "Three handoff paths",
    icon: Globe,
    description:
      "Choose how the packet reaches your AI agent, teammate, or web chat. Nothing is sent to a Port0 server.",
    details: [
      "File to Inspector: drag the JSON into the static inspector",
      "Markdown: paste the rendered prompt into any AI chat",
      "Share link: URL fragment with an optional passphrase",
    ],
  },
]

function StepVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <pre
        className="overflow-x-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-xs leading-relaxed text-zinc-300 md:text-sm"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >{`$ npx port0 export \\
    --intent "Fix login validation" \\
    --test-log test.log \\
    --format both

Port0 Export v1.0.0
→ Repository   my-project
→ Branch       feature/login-fix
→ Staged       3 files
→ Unstaged     2 files
→ Test log     23 lines
→ Secrets      1 redacted
→ Budget       47.2 KB / 200 KB
→ Hash         sha256:f7e8d9c0...`}</pre>
    )
  }

  if (index === 1) {
    return (
      <pre
        className="overflow-x-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-xs leading-relaxed text-zinc-300 md:text-sm"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >{`{
  "redaction": {
    "counts": {
      "env-assignment": 2,
      "github-token": 1
    },
    "deniedPaths": [".env", "config/secrets.yaml"]
  }
}

✓ Final scan: CLEAN
✓ Exit code: 0`}</pre>
    )
  }

  if (index === 2) {
    return (
      <pre
        className="overflow-x-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-xs leading-relaxed text-zinc-300 md:text-sm"
        style={{ fontFamily: "var(--font-geist-mono)" }}
      >{`{
  "schemaVersion": "1",
  "contentHash": "9f3a1c...64 hex",
  "repo": { "branch": "main", "detached": false },
  "status": [ ... ],
  "diffs": { "staged": { ... }, "unstaged": { ... } },
  "testLog": { "text": "FAIL login.test.ts", "source": "stdin" },
  "budget": { "maxBytes": 204800, "usedBytes": 47231 }
}`}</pre>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
        <FileJson className="mx-auto mb-2 h-8 w-8 text-[#203eec]" strokeWidth={1.5} />
        <p className="font-semibold">File → Inspector</p>
        <p className="text-xs text-muted-foreground">Drag and drop JSON</p>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
        <FileCode className="mx-auto mb-2 h-8 w-8 text-[#203eec]" strokeWidth={1.5} />
        <p className="font-semibold">Markdown</p>
        <p className="text-xs text-muted-foreground">Copy the prompt</p>
      </div>
      <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-center">
        <Globe className="mx-auto mb-2 h-8 w-8 text-[#203eec]" strokeWidth={1.5} />
        <p className="font-semibold">Share link</p>
        <p className="text-xs text-muted-foreground">URL fragment only</p>
      </div>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-border py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        <SectionTitle className="section-title-animate mb-12 text-3xl font-semibold tracking-tight md:mb-16 md:text-4xl lg:text-5xl">
          How Port0 works
        </SectionTitle>

        <div className="relative">
          <div className="absolute bottom-0 left-1/2 top-0 hidden w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 lg:block" />

          <div className="space-y-16 md:space-y-20">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative flex flex-col gap-8 lg:flex-row lg:items-center"
              >
                <div className="flex items-start gap-6 lg:w-1/2 lg:pr-12">
                  <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <span className="font-mono text-2xl font-black text-primary">
                      {step.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold md:text-2xl">
                      {step.title}
                    </h3>
                    <p className="mb-4 leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2">
                          <CheckCircle
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                            strokeWidth={2.5}
                          />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="lg:w-1/2 lg:pl-12">
                  <StepVisual index={index} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
