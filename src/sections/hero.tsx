import { useState } from "react"
import { ArrowUpRight, Download } from "lucide-react"
import { home, profile } from "@/data/portfolio"
import { cssVars } from "@/components/site/reveal"

const headline: Array<{ cls: string; words: string[]; em?: boolean }> = [
  { cls: "", words: home.greeting.split(/\s+/).filter(Boolean) },
  { cls: "line--name", words: profile.name.split(/\s+/).filter(Boolean), em: true },
  { cls: "line--sub", words: home.headline.split(/\s+/).filter(Boolean) },
]

const Sparkle = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12z" />
  </svg>
)

export function Hero() {
  const [photoOk, setPhotoOk] = useState(true)
  let i = 0
  return (
    <section className="hero" id="home">
      <div className="page hero__inner">
        <div className="hero__text">
          <span className="tag glass"><i className="pulse" />{home.badge}</span>

          <h1 aria-label={`${home.greeting} ${profile.name}. ${home.headline}`}>
            {headline.map(({ cls, words, em }) => {
              const line = words.map((w, idx) => (
                <span key={idx}>
                  <span className="w" style={cssVars({ "--i": i++ })}>{w}</span>{" "}
                </span>
              ))
              return (
                <span key={cls || "l1"} className={`line ${cls}`} aria-hidden="true">
                  {em ? <em>{line}</em> : line}
                </span>
              )
            })}
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

          <div className="layer l-code" data-depth="1.0">
            <div className="codecard glass glass--liquid">
              <div className="codecard__bar"><span>&lt;/&gt; Code</span><i /></div>
              <pre>
                <span className="k">const</span> developer = {"{"}
                {"\n  name: "}<span className="s">"{profile.name}"</span>,
                {"\n  skills: ["}
                {home.codeSkills.map((s, idx) => (
                  <span key={idx}>{idx > 0 && ", "}<span className="s">"{s}"</span></span>
                ))}
                {"],\n  passion: "}<span className="s">"{home.codePassion}"</span>
                {"\n};"}
              </pre>
            </div>
          </div>

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
