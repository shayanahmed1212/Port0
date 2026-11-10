"use client"

import { useState } from "react"
import Image from "next/image"
import { SectionTitle } from "@/components/ui/section-title"

const testimonials = [
  {
    id: 1,
    quote:
      "Their AI design expertise transformed our product. The vibe coding approach allowed us to iterate rapidly and ship features 3x faster than traditional methods.",
    author: "Sarah Chen",
    role: "CEO at AI Startup",
    avatar: "/images/imgi_97_user77.webp",
    company: "Neural Labs",
    blurColor: "bg-blue-500",
  },
  {
    id: 2,
    quote:
      "Incredible work integrating GPT-4 into our interface. They understand both the technical AI capabilities and how to make them feel natural to users.",
    author: "Marcus Johnson",
    role: "Product Lead at OpenAI Partner",
    avatar: "/images/imgi_106_user86.webp",
    company: "Synthetics",
    blurColor: "bg-purple-500",
  },
  {
    id: 3,
    quote:
      "The prompt engineering skills are world-class. They built our entire design system using AI tools and it's production-ready and beautiful.",
    author: "Emily Rodriguez",
    role: "Founder at AI Design Tool",
    avatar: "/images/imgi_105_user85.webp",
    company: "DesignAI",
    blurColor: "bg-pink-500",
  },
  {
    id: 4,
    quote:
      "Working with an AI-native designer was eye-opening. They leveraged Midjourney and v0 to create concepts we never would have imagined.",
    author: "David Park",
    role: "CTO at ML Platform",
    avatar: "/images/imgi_102_user82.webp",
    company: "Tensor",
    blurColor: "bg-emerald-500",
  },
  {
    id: 5,
    quote:
      "Their mastery of generative design tools allowed us to explore 100+ variations in days, not months. Game-changing for our design process.",
    author: "Lisa Wang",
    role: "VP Design at Enterprise AI",
    avatar: "/images/imgi_100_user80.webp",
    company: "Cognition",
    blurColor: "bg-orange-500",
  },
  {
    id: 6,
    quote:
      "They don't just use AI tools—they think in AI. The conversational interfaces they designed feel genuinely intelligent and human.",
    author: "James Mitchell",
    role: "Director at Voice AI",
    avatar: "/images/imgi_107_user87.webp",
    company: "VoiceTech",
    blurColor: "bg-cyan-500",
  },
  {
    id: 7,
    quote:
      "The combination of design skills and AI engineering knowledge is rare. They built our AI assistant from concept to production in record time.",
    author: "Nina Patel",
    role: "CEO at Automation Platform",
    avatar: "/images/imgi_108_user88.webp",
    company: "AutoFlow",
    blurColor: "bg-rose-500",
  },
]

export function Testimonials() {
  const [isPaused, setIsPaused] = useState(false)

  const duplicatedTestimonials = [...testimonials, ...testimonials]
  const duplicatedTestimonialsReverse = [...testimonials.slice().reverse(), ...testimonials.slice().reverse()]
  const mobileTestimonials = testimonials.slice(0, 6)

  return (
    <section id="testimonials" className="py-20 border-border overflow-hidden md:py-32 border-t-[0] pb-0 relative">
      <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20 hidden lg:block" />

      <div className="hidden lg:block pl-6 md:pl-12">
        {/* Section Header */}
        <div className="mb-12 md:mb-16 max-w-[1280px]">
          <SectionTitle className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            What clients say
          </SectionTitle>
        </div>

        <div className="relative mb-6">
          <div
            className="flex gap-6 animate-scroll-left"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            style={{ animationPlayState: isPaused ? "paused" : "running" }}
          >
            {duplicatedTestimonials.map((testimonial, index) => (
              <article
                key={`${testimonial.id}-${index}`}
                className="relative flex-shrink-0 w-[85vw] md:w-[400px] p-6 md:p-8 border bg-card hover:shadow-lg transition-shadow overflow-hidden border-zinc-100 md:px-6 md:py-6 rounded-3xl"
              >
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-base leading-relaxed font-semibold text-zinc-950 relative z-10">
                  "{testimonial.quote}"
                </blockquote>

                <div
                  className={`absolute -bottom-12 -right-12 w-48 h-48 ${testimonial.blurColor} rounded-full opacity-10`}
                  style={{ filter: "blur(72px)" }}
                />
              </article>
            ))}
          </div>
        </div>

        <div className="relative">
          <div
            className="flex gap-6 animate-scroll-right"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            style={{ animationPlayState: isPaused ? "paused" : "running" }}
          >
            {duplicatedTestimonialsReverse.map((testimonial, index) => (
              <article
                key={`reverse-${testimonial.id}-${index}`}
                className="relative flex-shrink-0 w-[85vw] md:w-[400px] p-6 md:p-8 border bg-card hover:shadow-lg transition-shadow overflow-hidden border-zinc-100 md:px-6 md:py-6 rounded-3xl"
              >
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-base leading-relaxed font-semibold text-zinc-950 relative z-10">
                  "{testimonial.quote}"
                </blockquote>

                <div
                  className={`absolute -bottom-12 -right-12 w-48 h-48 ${testimonial.blurColor} rounded-full opacity-10`}
                  style={{ filter: "blur(72px)" }}
                />
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:hidden max-w-[1280px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="mb-12 md:mb-16">
          <SectionTitle className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            What clients say
          </SectionTitle>
        </div>

        <div className="relative">
          {mobileTestimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="sticky pt-10"
              style={{
                top: `${70 + index * 0}px`,
                zIndex: index + 1,
              }}
            >
              <article className="relative p-6 md:p-8 border bg-card transition-shadow overflow-hidden border-zinc-100 rounded-3xl">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>

                {/* Quote */}
                <blockquote className="text-base leading-relaxed font-semibold text-zinc-950 relative z-10">
                  "{testimonial.quote}"
                </blockquote>

                <div
                  className={`absolute -bottom-12 -right-12 w-48 h-48 ${testimonial.blurColor} rounded-full opacity-10`}
                  style={{ filter: "blur(72px)" }}
                />
              </article>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none z-10 lg:hidden" />
    </section>
  )
}
