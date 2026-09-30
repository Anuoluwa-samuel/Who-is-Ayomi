import { useEffect, useState } from "react"
import { CalendarDays, Code2, Smile, Trophy, User } from "lucide-react"
import { about } from "@/data/portfolio"
import { Rich } from "@/components/site/rich"
import { useInView } from "@/hooks/use-in-view"
import { Reveal } from "@/components/site/reveal"
import { cn } from "@/lib/utils"

const statIcons = [CalendarDays, Code2, Smile, Trophy]

/** Counts up to `to` with an ease-out curve once scrolled into view. */
function CountUp({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(to)

  useEffect(() => {
    if (!run) return
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1400, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setN(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, to])

  return <span>{n}</span>
}

export function About() {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <section className="about" id="about">
      <div className="page about__inner">
        <Reveal className="about__text">
          <span className="tag glass">{about.tag}</span>
          <h2><Rich text={about.heading} /></h2>
          <p>{about.text}</p>
          <a href="#contact" className="btn btn--glass magnetic">
            {about.button} <User className="ico" />
          </a>
        </Reveal>

        <Reveal className="stats">
          <div ref={ref} className="contents">
            {about.stats.map((s, i) => {
              const Icon = statIcons[i % statIcons.length]
              const tone = (i % 2) + (Math.floor(i / 2) % 2) === 1 ? "ink" : ""
              return (
                <div key={s.label} className="stat glass glass--liquid">
                  <span className={cn("stat__icon", tone)}><Icon /></span>
                  <strong><CountUp to={s.value} run={inView} />{s.suffix}</strong>
                  <small>{s.label}</small>
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
