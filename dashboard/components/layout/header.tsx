"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "#features", label: "Features", number: "01" },
  { href: "#how-it-works", label: "How it works", number: "02" },
  { href: "#cli-demo", label: "CLI", number: "03" },
  { href: "#inspector-demo", label: "Inspector", number: "04" },
]

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault()
    const element = document.querySelector(href)
    if (element) {
      const headerOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition =
        elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({ top: offsetPosition, behavior: "smooth" })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-50 transition-all duration-300",
          isScrolled
            ? "border-b border-border bg-background/80 backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto max-w-[1280px] px-6 md:px-12">
          <nav className="flex h-16 items-center justify-between md:h-20">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight"
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                }}
              >
                0
              </span>
              Port0
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                  <span className="ml-1 text-xs opacity-50">
                    ({item.number})
                  </span>
                </Link>
              ))}
            </div>

            <div className="hidden md:block">
              <Link
                href="/inspector"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all hover:shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                  boxShadow: "0 4px 20px rgba(32, 62, 236, 0.3)",
                }}
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  Open Inspector
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
                <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="-mr-2 p-2 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <div className="flex h-full flex-col p-6">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                  }}
                >
                  0
                </span>
                Port0
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="-mr-2 p-2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-12 flex flex-col gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="text-3xl font-semibold transition-colors hover:text-muted-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto">
              <Link
                href="/inspector"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-medium text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #203eec 0%, #00d4ff 100%)",
                }}
              >
                Open Packet Inspector
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
