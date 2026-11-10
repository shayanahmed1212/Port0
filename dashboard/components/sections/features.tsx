"use client"

import { SectionTitle } from "@/components/ui/section-title"
import { Shield, Zap, Globe, Terminal, FileCode, Lock, Hash, ArrowUpRight } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: Shield,
    title: "Secret Redaction",
    description: "Automatically detects and redacts API keys, tokens, passwords, and other secrets from diffs and files before they leave your machine.",
    href: "#how-it-works",
  },
  {
    icon: Hash,
    title: "Deterministic Output",
    description: "Same input always produces the same packet with an identical SHA-256 hash. Verify integrity with port0 verify or the web inspector.",
    href: "#how-it-works",
  },
  {
    icon: FileCode,
    title: "Size-Bounded Packets",
    description: "A configurable budget (default 200 KB, minimum 20 KB) prevents context overflow. Oversized sections are truncated at file or line boundaries, never mid-line.",
    href: "#how-it-works",
  },
  {
    icon: Terminal,
    title: "CLI-First Design",
    description: "Runs locally with npx port0 export. No accounts, no servers, and no network calls. Your code never leaves your machine.",
    href: "#cli-demo",
  },
  {
    icon: Globe,
    title: "Static Web Inspector",
    description: "Drop a packet JSON into the browser-based inspector. Verify, audit, browse tabs, and copy AI-ready prompts. Zero backend.",
    href: "#inspector-demo",
  },
  {
    icon: Zap,
    title: "Three Handoff Paths",
    description: "File-to-inspector, Markdown for local agents, or shareable URL fragment links. Choose the path that fits your workflow.",
    href: "#how-it-works",
  },
  {
    icon: Lock,
    title: "Fail-Safe Redaction",
    description: "Denylist + regex patterns + final fail-closed scan. If a secret slips through, the export fails with exit code 3.",
    href: "#how-it-works",
  },
  {
    icon: ArrowUpRight,
    title: "Open Standards",
    description: "JSON schema (Zod), Markdown prompts, deterministic serialization. Integrates with any AI tool or custom pipeline.",
    href: "#cli-demo",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 md:py-32 border-border border-t-0 md:pt-0 md:pb-0">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <SectionTitle className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-12 md:mb-16 section-title-animate">
          Built for AI-Native Workflows
        </SectionTitle>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative p-6 md:p-8 border border-border rounded-2xl hover:bg-secondary/50 transition-all hover:border-primary/20 hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-xl mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
              <div className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Learn more
                <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
