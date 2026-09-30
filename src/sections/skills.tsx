import { skills, skillsSection } from "@/data/portfolio"
import { Rich } from "@/components/site/rich"
import { useInView } from "@/hooks/use-in-view"
import { Reveal, cssVars } from "@/components/site/reveal"

function SkillRow({ name, level, src, index, run }: (typeof skills)[number] & { index: number; run: boolean }) {
  return (
    <div className="skill">
      <span className="skill__ico"><img src={src} alt="" /></span>
      <div className="skill__body">
        <div className="skill__row"><span>{name}</span><em>{level}%</em></div>
        <div className="bar" role="progressbar" aria-label={name} aria-valuenow={level} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: run ? `${level}%` : 0, transitionDelay: `${index * 70}ms`, ...cssVars({ "--lvl": `${level}%` }) }} />
        </div>
      </div>
    </div>
  )
}

export function Skills() {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <section className="skills" id="skills">
      <div className="page">
        <Reveal as="header" className="section-head">
          <span className="tag glass">{skillsSection.tag}</span>
          <h2><Rich text={skillsSection.heading} /></h2>
        </Reveal>

        <Reveal className="skills__panel glass">
          <div ref={ref} className="skills__grid">
            {skills.map((s, i) => <SkillRow key={s.name} {...s} index={i} run={inView} />)}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
