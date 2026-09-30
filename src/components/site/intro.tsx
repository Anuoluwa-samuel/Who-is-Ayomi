import { useCallback, useEffect, useRef, useState } from "react"
import PortfolioHero from "@/components/ui/portfolio-hero"
import { profile } from "@/data/portfolio"
import { cn } from "@/lib/utils"
import { cssVars } from "./reveal"

const MIN_MS = 3900 // long enough to play the full name + tagline sequence
const REDUCED_MS = 900
const MAX_MS = 9000 // never trap a visitor if an asset hangs
const EXIT_MS = 1900 // matches the iris close in portfolio.css

/**
 * Black-and-blue intro: renders <PortfolioHero
          showHeader={false}
          showScrollIndicator={false}
          firstLine={profile.intro.first}
          secondLine={profile.intro.second}
          tagline={profile.intro.tagline}
          photo={profile.photo}
          photoAlt={profile.name}
        /> untouched, then closes like an iris
 * (black first, navy rim trailing) to reveal the site. Skippable by click, key, scroll or touch.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false)
  const [progress, setProgress] = useState(0)
  const leaving = useRef(false)
  const skipRef = useRef<() => void>(() => {})

  const leave = useCallback(() => {
    if (leaving.current) return
    leaving.current = true
    setProgress(1)
    setOut(true)
    const root = document.documentElement
    // hero animations start as the iris closes; drop the `dark` class the component adds
    setTimeout(() => {
      root.classList.remove("intro-active")
      root.classList.remove("dark")
    }, 450)
    setTimeout(onDone, EXIT_MS)
  }, [onDone])

  useEffect(() => {
    const root = document.documentElement
    root.classList.add("intro-active")
    leaving.current = false

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const minMs = reduce ? REDUCED_MS : MIN_MS
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - t0) / minMs, 1)
      setProgress(1 - Math.pow(1 - p, 2))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const timers: number[] = []
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))
    const loaded = document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((r) => addEventListener("load", () => r(), { once: true }))
    const fonts = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve()
    const skipped = new Promise<void>((r) => { skipRef.current = r })

    Promise.race([Promise.all([wait(minMs), loaded, fonts]), skipped, wait(MAX_MS)]).then(leave)

    const skip = () => skipRef.current()
    const onKey = (e: KeyboardEvent) => { if (e.key !== "Tab") skip() }
    addEventListener("keydown", onKey)
    addEventListener("wheel", skip, { passive: true })
    addEventListener("touchstart", skip, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      removeEventListener("keydown", onKey)
      removeEventListener("wheel", skip)
      removeEventListener("touchstart", skip)
    }
  }, [leave])

  // With the scroll cue gone, a click anywhere on the intro enters the site
  const onClick = () => skipRef.current()

  return (
    <div className={cn("intro", out && "out")} onClick={onClick} role="presentation">
      <div className="intro__black">
        <PortfolioHero
          showHeader={false}
          showScrollIndicator={false}
          firstLine={profile.intro.first}
          secondLine={profile.intro.second}
          tagline={profile.intro.tagline}
          photo={profile.photo}
          photoAlt={profile.name}
        />
        <span className="intro__hint" aria-hidden="true">Loading portfolio</span>
        <span className="intro__count" aria-hidden="true">{Math.round(progress * 100)}%</span>
        <div className="intro__bar" aria-hidden="true">
          <i style={cssVars({ "--p": progress })} />
        </div>
      </div>
    </div>
  )
}
