"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { SectionTitle } from "@/components/ui/section-title"

const works = [
  {
    id: 1,
    title: "AI Onboarding Assistant",
    category: "AI Product",
    description: "Building an intelligent onboarding flow powered by GPT-4 and natural conversations",
    image: "/images/work-onboarding.png",
    tags: ["AI", "v0", "Next.js", "OpenAI"],
  },
  {
    id: 2,
    title: "AI Fashion Curator",
    category: "E-commerce AI",
    description: "Personalized style recommendations using computer vision and preference learning",
    image: "/images/work-fashion.png",
    tags: ["AI", "Machine Learning", "Midjourney"],
  },
  {
    id: 3,
    title: "Smart Task Manager",
    category: "Productivity AI",
    description: "AI-powered task prioritization and scheduling with natural language processing",
    image: "/images/work-tasks.png",
    tags: ["AI", "Claude", "Vibe Coding"],
  },
  {
    id: 4,
    title: "Crypto AI Analytics",
    category: "FinTech AI",
    description: "Real-time market insights and predictions powered by advanced AI models",
    image: "/images/work-crypto.png",
    tags: ["AI", "Data Viz", "GPT-4"],
  },
]

export function SelectedWorks() {
  return (
    <section id="works" className="py-20 md:py-10 md:pt-32 pb-4">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12 md:mb-16">
          <SectionTitle className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            Selected work
          </SectionTitle>
          <Link
            href="#"
            className="hidden md:inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: "#203eec" }}
          >
            View all works
            <ArrowUpRight className="w-4 h-4" style={{ color: "#203eec" }} />
          </Link>
        </div>

        <div className="relative">
          {works.map((work, index) => (
            <div
              key={work.id}
              className="sticky"
              style={{
                top: `${70 + index * 0}px`,
                zIndex: index + 1,
              }}
            >
              <Link href="#" className="group block pt-10">
                <article className="overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  {/* Image */}
                  <div className="relative aspect-[2/1] overflow-hidden bg-secondary">
                    <Image
                      src={work.image || "/placeholder.svg"}
                      alt={work.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-3 md:p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold">{work.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{work.description}</p>
                      </div>
                      <ArrowUpRight
                        className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                        style={{ color: "#203eec" }}
                      />
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {work.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        <div className="md:hidden mt-8 text-center">
          <Link
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium border rounded-full hover:bg-secondary transition-colors"
            style={{ color: "#203eec", borderColor: "#203eec" }}
          >
            View all works
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
