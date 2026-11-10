import Link from "next/link"
import Image from "next/image"
import { ArrowDown, ArrowUpRight, ShieldCheck, Terminal } from "lucide-react"

const lineOne = "Switch tools. Keep the context.".split(" ")
const lineTwo = "Leave the secrets behind.".split(" ")

const highlights = [
  "Read-only CLI",
  "Zero network calls",
  "Deterministic SHA-256",
  "Fail-closed redaction",
]

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden pt-20">
      <div className="pointer-events-none absolute -right-32 top-32 -z-10 h-[500px] w-[500px] animate-orb-rotate scale-125 md:-right-48 md:top-40 md:h-[750px] md:w-[750px]">
        <Image
          src="/images/orb.png"
          alt=""
          width={750}
          height={750}
          className="h-full w-full"
          priority
        />
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-6 py-20 md:px-12 md:pb-16 md:pt-32">
        <div className="max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[#203eec]" />
            Team Hallucinati &middot; CUI Tech Fest FA&apos;26
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
            <span className="block">
              {lineOne.map((word, index) => (
                <span
                  key={`one-${word}-${index}`}
                  className="hero-word mr-[0.25em] inline-block font-mono font-normal"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {word}
                </span>
              ))}
            </span>
            <span className="mt-2 block">
              {lineTwo.map((word, index) => (
                <span
                  key={`two-${word}-${index}`}
                  className={`hero-word mr-[0.25em] inline-block font-mono font-normal ${
                    word === "secrets"
                      ? "hero-word-accent ai-gradient-word"
                      : ""
                  }`}
                  style={{
                    animationDelay: `${(lineOne.length + index) * 0.08}s`,
                    ...(word === "secrets"
                      ? {
                          background:
                            "linear-gradient(135deg, #ff006e 0%, #8b5cf6 33%, #203eec 66%, #00d4ff 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }
                      : {}),
                  }}
                >
                  {word}
                </span>
              ))}
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-left text-lg leading-relaxed text-muted-foreground">
            Port0 captures your uncommitted Git state into one deterministic,
            secret-redacted, size-bounded handoff packet. Move work between AI
            agents, IDEs, and teammates without re-explaining the task or leaking
            credentials.
          </p>

          <div className="mt-10 flex flex-row flex-wrap items-center gap-4">
            <Link
              href="/inspector"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-4 text-base font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                boxShadow: "0 4px 20px rgba(32, 62, 236, 0.3)",
              }}
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                Open Packet Inspector
                <ArrowUpRight className="h-4 w-4" />
              </span>
              <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full px-6 py-4 text-base font-medium transition-colors hover:bg-secondary"
              style={{ color: "#203eec" }}
            >
              See how it works
              <ArrowDown className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {highlights.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#203eec]" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-950/60 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-2 inline-flex items-center gap-2 text-xs text-zinc-400">
              <Terminal className="h-3.5 w-3.5" />
              terminal
            </span>
          </div>
          <pre
            className="overflow-x-auto p-5 text-xs leading-relaxed text-zinc-300 md:text-sm"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
{`$ pnpm test 2>&1 | npx port0 export --test-log - \\
    --intent "Fix login validation" --format both

✓ Repository captured       branch fix/login
✓ Secrets redacted          5
✓ Files denied              2
✓ Size budget               84.2 KB of 200 KB
✓ contentHash               sha256 9f3a1c...

Wrote port0-packet.json and port0-packet.md`}
          </pre>
        </div>
      </div>
    </section>
  )
}
