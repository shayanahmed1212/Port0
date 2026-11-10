"use client"

import Link from "next/link"
import { Github, Lock, ShieldCheck, Terminal } from "lucide-react"

const productLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#cli-demo", label: "CLI reference" },
  { href: "/inspector", label: "Packet inspector" },
]

const trustLinks = [
  { icon: Lock, label: "No accounts or telemetry" },
  { icon: Terminal, label: "Read-only, offline CLI" },
  { icon: ShieldCheck, label: "Fail-closed redaction" },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 md:gap-8">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-semibold tracking-tight"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                }}
              >
                0
              </span>
              Port0
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Switch tools. Keep the context. Leave the secrets behind. Port0
              captures your uncommitted Git state into one deterministic,
              secret-redacted, size-bounded handoff packet.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="https://github.com/shayanahmed1212/Port0"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Link>
              <Link
                href="/inspector"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                }}
              >
                Try the inspector
              </Link>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">By design</h4>
            <ul className="space-y-3">
              {trustLinks.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <item.icon className="h-4 w-4" style={{ color: "#203eec" }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Port0. Built by Team Hallucinati.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-xs text-muted-foreground">
              Packet schema v1
            </span>
            <span className="text-xs text-muted-foreground">
              No network calls with your data
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
