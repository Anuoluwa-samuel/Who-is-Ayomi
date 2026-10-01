import { useCallback, useEffect, useState } from "react"
import { Background } from "@/components/site/background"
import { Intro } from "@/components/site/intro"
import { ContactModalProvider } from "@/components/site/contact-modal"
import { Navbar } from "@/components/site/navbar"
import { profile } from "@/data/portfolio"
import { useAmbientEffects } from "@/hooks/use-ambient-effects"
import { Hero } from "@/sections/hero"
import { About } from "@/sections/about"
import { Skills } from "@/sections/skills"
import { Projects } from "@/sections/projects"
import { CaseStudy } from "@/sections/case-study"
import { Contact } from "@/sections/contact"
import { Footer } from "@/sections/footer"

export default function App() {
  // (render-safe: also runs at build time when the page is prerendered)
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview")
  const [showIntro, setShowIntro] = useState(!isPreview)
  const onIntroDone = useCallback(() => setShowIntro(false), [])

  useAmbientEffects()

  useEffect(() => {
    if (isPreview) document.documentElement.classList.remove("intro-active")
    document.title = profile.title
    document.querySelector('meta[name="description"]')?.setAttribute("content", profile.description)
  }, [isPreview])

  return (
    <ContactModalProvider>
      <Background />
      {showIntro && <Intro onDone={onIntroDone} />}
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <CaseStudy />
        <Contact />
      </main>
      <Footer />
    </ContactModalProvider>
  )
}
