import { ArrowUpRight } from "lucide-react"
import { caseStudy } from "@/data/portfolio"
import { Reveal } from "@/components/site/reveal"
import { Rich } from "@/components/site/rich"

const isBest = (model: string) => /\(best\)/i.test(model)

/** One project told properly: problem → data → approach → result, with the headline numbers. Editable in /admin. */
export function CaseStudy() {
  const { tag, heading, summary, metrics, blocks, models, stack, repoUrl, liveUrl } = caseStudy
  if (!blocks?.length && !metrics?.length) return null

  return (
    <section className="casestudy" id="case-study">
      <div className="page">
        <Reveal as="header" className="section-head">
          <span className="tag glass">{tag}</span>
          <h2><Rich text={heading} /></h2>
          {summary && <p className="cs-summary">{summary}</p>}
        </Reveal>

        {metrics?.length > 0 && (
          <Reveal as="dl" className="cs-metrics">
            {metrics.map((m) => (
              <div key={m.label} className="cs-metric glass glass--liquid">
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </Reveal>
        )}

        <div className="cs-grid">
          <Reveal as="ol" className="cs-story glass">
            {blocks.map((b) => (
              <li key={b.title}>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </li>
            ))}
          </Reveal>

          <Reveal className="cs-side">
            {models?.length > 0 && (
              <div className="cs-card glass">
                <h3>Models compared</h3>
                <ul className="cs-chips">
                  {models.map((m) => (
                    <li key={m} className={isBest(m) ? "is-best" : undefined}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            {stack?.length > 0 && (
              <div className="cs-card glass">
                <h3>Tools used</h3>
                <ul className="cs-chips">
                  {stack.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}
            {(repoUrl || liveUrl) && (
              <div className="cs-links">
                {liveUrl && <a className="btn btn--primary" href={liveUrl} target="_blank" rel="noreferrer">Open the app <ArrowUpRight className="ico" /></a>}
                {repoUrl && <a className="btn btn--glass" href={repoUrl} target="_blank" rel="noreferrer">View the code <ArrowUpRight className="ico" /></a>}
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  )
}
