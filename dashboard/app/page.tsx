import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/sections/hero"
import { Features } from "@/components/sections/features"
import { HowItWorks } from "@/components/sections/how-it-works"
import { CLIDemo } from "@/components/sections/cli-demo"
import { InspectorDemo } from "@/components/sections/inspector-demo"
import { FinalCTA } from "@/components/sections/final-cta"
import { GradientBar } from "@/components/ui/gradient-bar"
import { MagneticCursor } from "@/components/ui/magnetic-cursor"

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CLIDemo />
        <InspectorDemo />
        <FinalCTA />
      </main>
      <Footer />
      <GradientBar />
      <MagneticCursor />
    </>
  )
}
