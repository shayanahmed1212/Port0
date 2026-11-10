"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { SectionTitle } from "@/components/ui/section-title"

const awards = [
  { title: "Best AI Design Implementation", year: "2024", organization: "AI Design Awards", link: "#" },
  { title: "Innovation in Generative UI", year: "2024", organization: "v0 Showcase", link: "#" },
  { title: "Excellence in AI UX", year: "2023", organization: "UX AI Conference", link: "#" },
  { title: "Top AI Product Designer", year: "2023", organization: "Product Hunt", link: "#" },
  { title: "Outstanding Prompt Engineering", year: "2023", organization: "OpenAI Community", link: "#" },
  { title: "Vibe Coding Pioneer", year: "2022", organization: "Vercel Community", link: "#" },
]

export function Awards() {
  return (
    <section id="awards" className="py-20 md:py-32 border-border border-t-0 md:pt-0 md:pb-0">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <SectionTitle className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-12 md:mb-16">
          Awards & Recognition
        </SectionTitle>

        <div className="flex flex-col gap-4">
          {awards.map((award, index) => (
            <Link
              key={index}
              href={award.link}
              className="group flex items-center justify-between p-5 md:p-6 border border-border rounded-2xl hover:bg-secondary/50 transition-all hover:border-foreground/20"
            >
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-1">
                  <h3 className="font-semibold text-xl md:text-2xl">{award.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{award.organization}</p>
                </div>
                <span className="text-sm text-muted-foreground font-medium">{award.year}</span>
              </div>
              <ArrowUpRight
                className="w-8 h-8 md:w-10 md:h-10 ml-6 text-muted-foreground transition-all group-hover:translate-x-1"
                strokeWidth={1}
                style={{ color: "#203eec" }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
