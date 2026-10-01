import { cssVars } from "./reveal"

const blobs = [
  { w: "62vmax", c: "#b9c6ff", pos: { left: "-18%", top: "-22%" } },
  { w: "54vmax", c: "#dbe2ff", pos: { right: "-20%", top: "-10%" } },
  { w: "48vmax", c: "#c5d8ff", pos: { left: "-14%", top: "34%" } },
  { w: "58vmax", c: "#d4dcff", pos: { right: "-22%", top: "52%" } },
  { w: "46vmax", c: "#dfe6ff", pos: { left: "8%", bottom: "-24%" } },
]

/** Fixed (static) pastel aurora + cursor light, plus the SVG map that powers Chromium's liquid refraction. */
export function Background() {
  return (
    <>
      <svg className="defs" width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <filter id="liquid" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.014" numOctaves={2} seed={7} result="noise" />
          <feGaussianBlur in="noise" stdDeviation={3} result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale={46} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="aurora" aria-hidden="true">
        {blobs.map((b, i) => (
          <i
            key={i}
            className="blob"
            style={{ ...b.pos, ...cssVars({ "--w": b.w, "--c": b.c }) }}
          />
        ))}
      </div>
      <div className="cursor-glow" id="cursorGlow" aria-hidden="true" />
    </>
  )
}
