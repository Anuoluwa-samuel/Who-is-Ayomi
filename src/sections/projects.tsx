import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { projects, projectsSection } from "@/data/portfolio"
import { projectArt } from "@/components/site/project-art"
import { Reveal } from "@/components/site/reveal"
import { Rich } from "@/components/site/rich"
import { cn } from "@/lib/utils"

/** Desktop / tablet: grid. Phones (≤720px): swipe carousel with arrows and dots (styles in portfolio.css). */
export function Projects() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const last = projects.length - 1

  const syncPage = useCallback(() => {
    const el = trackRef.current
    if (!el || el.children.length < 2) return
    const kids = Array.from(el.children) as HTMLElement[]
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) return setPage(kids.length - 1)
    const step = kids[1].offsetLeft - kids[0].offsetLeft
    setPage(Math.max(0, Math.min(kids.length - 1, Math.round(el.scrollLeft / step))))
  }, [])

  const goTo = (i: number) => {
    const card = trackRef.current?.children[Math.max(0, Math.min(last, i))] as HTMLElement | undefined
    card?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
  }

  // keep the dots right when the window is resized / rotated
  useEffect(() => {
    addEventListener("resize", syncPage)
    return () => removeEventListener("resize", syncPage)
  }, [syncPage])

  return (
    <section className="projects" id="projects">
      <div className="page">
        <Reveal as="header" className="section-head">
          <span className="tag glass">{projectsSection.tag}</span>
          <h2><Rich text={projectsSection.heading} /></h2>
        </Reveal>

        <div
          className="projects__grid"
          ref={trackRef}
          onScroll={syncPage}
          role="region"
          aria-roledescription="carousel"
          aria-label="Projects"
        >
          {projects.map((p, i) => {
            const Art = projectArt[p.art]
            return (
              <Reveal
                as="a"
                key={p.title + i}
                href={p.href}
                aria-label={p.title}
                aria-roledescription="slide"
                className="card glass"
              >
                <div className="card__thumb">
                  <span className="card__num glass">{String(i + 1).padStart(2, "0")}</span>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Art />}
                </div>
                <div className="card__body">
                  <h3>{p.title}</h3>
                  <p>{p.blurb}</p>
                  <span className="card__link">{projectsSection.linkLabel} <ArrowUpRight className="ico" /></span>
                </div>
              </Reveal>
            )
          })}
        </div>

        {projects.length > 1 && (
          <div className="carousel-controls">
            <button type="button" className="carousel__btn glass" aria-label="Previous project" disabled={page === 0} onClick={() => goTo(page - 1)}>
              <ChevronLeft />
            </button>
            <div className="pager" role="tablist" aria-label="Choose project">
              {projects.map((p, i) => (
                <button
                  key={p.title + i}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  aria-label={`Project ${i + 1}: ${p.title}`}
                  className={cn(i === page && "on")}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <button type="button" className="carousel__btn glass" aria-label="Next project" disabled={page === last} onClick={() => goTo(page + 1)}>
              <ChevronRight />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
