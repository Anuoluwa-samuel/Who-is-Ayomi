import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowUpRight, Download } from "lucide-react"
import { home, profile } from "@/data/portfolio"
import { cssVars } from "@/components/site/reveal"
import TypewriterExample from "@/components/ui/motion-typewriter"
import { useAfterIntro } from "@/hooks/use-after-intro"

const headline: Array<{ cls: string; words: string[]; em?: boolean }> = [
  { cls: "", words: home.greeting.split(/\s+/).filter(Boolean) },
  { cls: "line--sub", words: home.headline.split(/\s+/).filter(Boolean) },
]

/** The name is typed out again every 7 s, each round in a different typeface. */
const NAME_FONTS = [
  { family: "Fraunces", style: "italic", weight: 380, spacing: "-0.02em" }, // the site's own serif comes first
  { family: "Playfair Display", style: "italic", weight: 500, spacing: "-0.01em" },
  { family: "Dancing Script", style: "normal", weight: 600, spacing: "0" },
  { family: "Space Grotesk", style: "normal", weight: 600, spacing: "-0.03em" },
  { family: "DM Serif Display", style: "italic", weight: 400, spacing: "-0.01em" },
  { family: "Caveat", style: "normal", weight: 700, spacing: "0" },
  { family: "Cormorant Garamond", style: "italic", weight: 600, spacing: "0" },
] as const
type NameFont = (typeof NAME_FONTS)[number]

const fontSpec = (f: NameFont) => `${f.style} ${f.weight} 48px "${f.family}"`
const fontStyle = (f: NameFont): React.CSSProperties => ({
  fontFamily: `"${f.family}", var(--display), Georgia, serif`,
  fontStyle: f.style,
  fontWeight: f.weight,
  letterSpacing: f.spacing,
  lineHeight: 1.12,
})

function NameLine({ name, start }: { name: string; start: boolean }) {
  const lineRef = useRef<HTMLSpanElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const [fonts, setFonts] = useState<NameFont[]>([NAME_FONTS[0]])
  const [round, setRound] = useState(0)
  const font = fonts[round % fonts.length]
  const style = fontStyle(font)

  // warm up every typeface first, then only rotate through the ones that actually loaded (no flash of a fallback font)
  useEffect(() => {
    let alive = true
    Promise.all(
      NAME_FONTS.map((f) =>
        document.fonts.load(fontSpec(f)).then((faces) => (faces.length ? f : null)).catch(() => null),
      ),
    ).then((list) => {
      const ok = list.filter((f): f is NameFont => Boolean(f))
      if (alive && ok.length) setFonts(ok)
    })
    return () => { alive = false }
  }, [])

  // size the name to exactly fill the column on one line. Fonts change shape with size (optical sizing),
  // so: try a size, measure the probe at that size, adjust, repeat.
  useLayoutEffect(() => {
    const line = lineRef.current
    const probe = probeRef.current
    const column = line?.closest<HTMLElement>(".hero__text")
    if (!line || !probe || !column) return

    const fit = () => {
      const max = parseFloat(getComputedStyle(line.parentElement!).fontSize) * 0.95
      const target = column.clientWidth - 12 // room for the caret
      if (target <= 0) return
      let size = Math.min(max, 40)
      for (let i = 0; i < 8; i++) {
        probe.style.fontSize = `${size}px`
        const width = probe.getBoundingClientRect().width
        if (width <= 0) return
        if (width <= target && (width > target - 3 || size >= max)) break
        size = Math.min(max, size * (target / width) * (width > target ? 0.995 : 1))
      }
      line.style.fontSize = `${size.toFixed(2)}px`
      // every typeface has different heights: keep the line box constant so nothing below jumps between rounds
      line.style.height = `${(max * 1.2).toFixed(1)}px`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(column)
    observer.observe(probe) // fires when a web font finishes loading
    return () => observer.disconnect()
  }, [name, font])

  return (
    <span ref={lineRef} className="line line--name" aria-hidden="true">
      <span ref={probeRef} className="tw-probe" style={style}>{name}</span>
      {/* the ghost reserves the final size so nothing shifts while the name is typed */}
      <span className="tw-wrap">
        <span className="tw-ghost" style={style}>{name}</span>
        <TypewriterExample
          as="span"
          className="tw-live"
          text={name}
          start={start}
          loopEvery={7000}
          style={style}
          onRoundStart={setRound}
        />
      </span>
    </span>
  )
}

const Sparkle = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />
  </svg>
)

export function Hero() {
  const [photoOk, setPhotoOk] = useState(true)
  const introDone = useAfterIntro()
  let i = 0
  return (
    <section className="hero" id="home">
      <div className="page hero__inner">
        <div className="hero__text">
          <span className="tag glass"><i className="pulse" />{home.badge}</span>

          <h1 aria-label={`${home.greeting} ${profile.name}. ${home.headline}`}>
            {headline.map(({ cls, words }, row) => (
              <span key={cls || "l1"} className="contents">
                {row === 1 && <NameLine name={profile.name} start={introDone} />}
                <span className={`line ${cls}`} aria-hidden="true">
                  {words.map((w, idx) => (
                    <span key={idx}>
                      <span className="w" style={cssVars({ "--i": i++ })}>{w}</span>{" "}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </h1>

          <p className="lead fade" style={cssVars({ "--d": ".9s" })}>{home.lead}</p>

          <div className="hero__actions fade" style={cssVars({ "--d": "1.05s" })}>
            <a href={home.primaryLink} className="btn btn--primary btn--lg magnetic">
              {home.primaryButton} <ArrowUpRight className="ico" />
            </a>
            <a href={profile.cv} download className="btn btn--glass btn--lg magnetic">
              {home.secondaryButton} <Download className="ico" />
            </a>
          </div>

          <div className="tech fade" style={cssVars({ "--d": "1.2s" })}>
            <span className="eyebrow">{home.techLabel}</span>
            <ul className="tech__icons">
              {home.techIcons.map((t) => (
                <li key={t.name} className="glass"><img src={t.src} alt={t.name} /></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="layer l-ring" data-depth="0.25"><div className="halo"><i /></div></div>

          <div className="layer l-arch" data-depth="0.5">
            <div className="arch-wrap">
              <div className="arch-outline" />
              <figure className="arch glass">
                {photoOk && <img src={profile.photo} alt="" onError={() => setPhotoOk(false)} />}
                {!photoOk && (
                  <svg className="arch__fallback" viewBox="0 0 200 260">
                    <defs>
                      <linearGradient id="silh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity=".35" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="98" r="40" fill="url(#silh)" />
                    <path d="M18 260c0-58 36-92 82-92s82 34 82 92z" fill="url(#silh)" />
                  </svg>
                )}
              </figure>
            </div>
          </div>

          <div className="layer l-b1" data-depth="1.4"><div className="bubble" style={cssVars({ "--s": "150px", "--d": "8s" })} /></div>
          <div className="layer l-b2" data-depth="1.9"><div className="bubble" style={cssVars({ "--s": "72px", "--d": "6s" })} /></div>
          <div className="layer l-b3" data-depth="1.1"><div className="bubble" style={cssVars({ "--s": "34px", "--d": "5s" })} /></div>
          <div className="layer l-b4" data-depth="0.8"><div className="bubble" style={cssVars({ "--s": "56px", "--d": "9s" })} /></div>

          {home.availability && (
            <div className="layer l-badge" data-depth="1.2">
              <div className="badge glass"><i className="pulse pulse--green" />{home.availability}</div>
            </div>
          )}

          <div className="layer l-s1" data-depth="1.6"><Sparkle className="spark" /></div>
          <div className="layer l-s2" data-depth="0.9"><Sparkle className="spark spark--sm" /></div>
          <div className="layer l-s3" data-depth="1.3"><Sparkle className="spark spark--sm" /></div>
        </div>
      </div>
    </section>
  )
}
