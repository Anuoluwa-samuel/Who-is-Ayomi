import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { projects, projectsSection, type Project } from "@/data/portfolio"
import { projectArt } from "@/components/site/project-art"
import { GlassDialog, useGlassDialog } from "@/components/site/glass-dialog"
import { Reveal } from "@/components/site/reveal"
import { Rich } from "@/components/site/rich"
import { cn } from "@/lib/utils"

const isBest = (item: string) => /\(best\)/i.test(item)

/** A project's case study, shown in a glass popup when its card is opened. */
function CaseStudy({ project }: { project: Project }) {
  const d = project.details!
  return (
    <article className="cs">
      <span className="tag glass">Case study</span>
      <h2 id="cs-title">{project.title}</h2>
      {d.summary && <p className="cs-summary">{d.summary}</p>}

      {d.metrics && d.metrics.length > 0 && (
        <dl className="cs-metrics">
          {d.metrics.map((m) => (
            <div key={m.label} className="cs-metric">
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {d.blocks && d.blocks.length > 0 && (
        <ol className="cs-story">
          {d.blocks.map((b) => (
            <li key={b.title}>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </li>
          ))}
        </ol>
      )}

      {(d.list?.length || d.stack?.length) ? (
        <div className="cs-lists">
          {d.list && d.list.length > 0 && (
            <div>
              <h3>{d.listTitle || "Highlights"}</h3>
              <ul className="cs-chips">{d.list.map((m) => <li key={m} className={isBest(m) ? "is-best" : undefined}>{m}</li>)}</ul>
            </div>
          )}
          {d.stack && d.stack.length > 0 && (
            <div>
              <h3>Tools used</h3>
              <ul className="cs-chips">{d.stack.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          )}
        </div>
      ) : null}

      {(d.liveUrl || d.repoUrl) && (
        <div className="cs-links">
          {d.liveUrl && <a className="btn btn--primary" href={d.liveUrl} target="_blank" rel="noreferrer">Open the app <ArrowUpRight className="ico" /></a>}
          {d.repoUrl && <a className="btn btn--glass" href={d.repoUrl} target="_blank" rel="noreferrer">View the code <ArrowUpRight className="ico" /></a>}
        </div>
      )}
    </article>
  )
}

/** Desktop / tablet: grid. Phones (≤720px): swipe carousel with arrows and dots (styles in portfolio.css). */
export function Projects() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const [active, setActive] = useState<Project | null>(null)
  const dialog = useGlassDialog()
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

  const openCaseStudy = useCallback((p: Project) => {
    setActive(p)
    dialog.open()
    history.replaceState(null, "", `#${p.slug}`) // shareable link straight to the case study
  }, [dialog.open])

  const closeCaseStudy = useCallback(() => {
    dialog.close()
    history.replaceState(null, "", location.pathname + location.search)
  }, [dialog.close])

  useEffect(() => {
    addEventListener("resize", syncPage)
    return () => removeEventListener("resize", syncPage)
  }, [syncPage])

  // open a case study from a shared link (#slug), or the old #case-study link
  useEffect(() => {
    const hash = decodeURIComponent(location.hash.slice(1))
    if (!hash) return
    const match = projects.find((p) => p.details && (p.slug === hash || hash === "case-study"))
    if (!match) return
    const timer = window.setTimeout(() => {
      document.getElementById("projects")?.scrollIntoView({ block: "start" })
      openCaseStudy(match)
    }, document.documentElement.classList.contains("intro-active") ? 2600 : 300)
    return () => clearTimeout(timer)
  }, [openCaseStudy])

  return (
    <section className="projects" id="projects">
      <div className="page">
        <Reveal as="header" className="section-head">
          <span className="tag glass">{projectsSection.tag}</span>
          <h2><Rich text={projectsSection.heading} /></h2>
        </Reveal>

        <div className="projects__grid" ref={trackRef} onScroll={syncPage} role="region" aria-roledescription="carousel" aria-label="Projects">
          {projects.map((p, i) => {
            const Art = projectArt[p.art]
            const hasCase = Boolean(p.details)
            return (
              <Reveal
                as="a"
                key={p.title + i}
                href={hasCase ? `#${p.slug}` : p.href}
                onClick={hasCase ? (e: React.MouseEvent) => { e.preventDefault(); openCaseStudy(p) } : undefined}
                aria-label={hasCase ? `${p.title} — read the case study` : p.title}
                aria-haspopup={hasCase ? "dialog" : undefined}
                aria-roledescription="slide"
                className={cn("card glass", hasCase && "card--case")}
              >
                <div className="card__thumb">
                  <span className="card__num glass">{String(i + 1).padStart(2, "0")}</span>
                  {hasCase && <span className="card__badge">Case study</span>}
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Art />}
                </div>
                <div className="card__body">
                  <h3>{p.title}</h3>
                  <p>{p.blurb}</p>
                  <span className="card__link">{hasCase ? "Read the case study" : projectsSection.linkLabel} <ArrowUpRight className="ico" /></span>
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
                <button key={p.title + i} type="button" role="tab" aria-selected={i === page} aria-label={`Project ${i + 1}: ${p.title}`} className={cn(i === page && "on")} onClick={() => goTo(i)} />
              ))}
            </div>
            <button type="button" className="carousel__btn glass" aria-label="Next project" disabled={page === last} onClick={() => goTo(page + 1)}>
              <ChevronRight />
            </button>
          </div>
        )}
      </div>

      <GlassDialog mounted={dialog.mounted} visible={dialog.visible} onClose={closeCaseStudy} labelledBy="cs-title" className="cs-dialog">
        {active && <CaseStudy project={active} />}
      </GlassDialog>
    </section>
  )
}
