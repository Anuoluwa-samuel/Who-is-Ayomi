import { useCallback, useEffect, useState } from "react"
import { Background } from "@/components/site/background"
import { Intro } from "@/components/site/intro"
import { Navbar } from "@/components/site/navbar"
import { profile } from "@/data/portfolio"
import { useAmbientEffects } from "@/hooks/use-ambient-effects"
import { Hero } from "@/sections/hero"
import { About } from "@/sections/about"
import { Skills } from "@/sections/skills"
import { Projects } from "@/sections/projects"
import { Contact } from "@/sections/contact"
import { Footer } from "@/sections/footer"

export default function App() {
  const isPreview = new URLSearchParams(location.search).has("preview")
  const [showIntro, setShowIntro] = useState(!isPreview)
  const onIntroDone = useCallback(() => setShowIntro(false), [])

  useAmbientEffects()

  useEffect(() => {
    if (isPreview) document.documentElement.classList.remove("intro-active")
    document.title = profile.title
    document.querySelector('meta[name="description"]')?.setAttribute("content", profile.description)
  }, [isPreview])

  return (
    <>
      <Background />
      {showIntro && <Intro onDone={onIntroDone} />}
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
