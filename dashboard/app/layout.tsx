import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Port0 — Switch tools. Keep the context. Leave the secrets behind.",
  description:
    "Port0 captures your uncommitted Git state into a deterministic, secret-redacted, size-bounded handoff packet. Move work between AI agents, IDEs, and teammates without re-explaining or leaking credentials.",
  keywords: [
    "git",
    "handoff",
    "ai",
    "context",
    "packet",
    "port0",
    "developer tools",
    "cli",
  ],
  authors: [{ name: "Team Hallucinati" }],
  creator: "Team Hallucinati",
  publisher: "Port0",
  generator: "Next.js",
  openGraph: {
    title: "Port0 — Switch tools. Keep the context. Leave the secrets behind.",
    description:
      "Port0 captures your uncommitted Git state into a deterministic, secret-redacted, size-bounded handoff packet.",
    type: "website",
    siteName: "Port0",
  },
  twitter: {
    card: "summary_large_image",
    title: "Port0",
    description: "Switch tools. Keep the context. Leave the secrets behind.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
