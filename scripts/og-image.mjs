// Builds the 1200×630 link-preview image (WhatsApp, LinkedIn, X, Slack…) from the site content.
// Rendered at build time with satori (layout → SVG) and resvg (SVG → PNG), so it always matches your name, role and photo.

import fs from "node:fs"
import path from "node:path"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"

const font = (pkg, file) => fs.readFileSync(path.join(process.cwd(), "node_modules", pkg, "files", file))

const FONTS = [
  { name: "DM Sans", data: font("@fontsource/dm-sans", "dm-sans-latin-400-normal.woff"), weight: 400, style: "normal" },
  { name: "DM Sans", data: font("@fontsource/dm-sans", "dm-sans-latin-600-normal.woff"), weight: 600, style: "normal" },
  { name: "Fraunces", data: font("@fontsource/fraunces", "fraunces-latin-400-italic.woff"), weight: 400, style: "italic" },
  { name: "Fraunces", data: font("@fontsource/fraunces", "fraunces-latin-400-normal.woff"), weight: 400, style: "normal" },
]

const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif" }

/** The profile photo as a data URI (local /public path or uploaded URL). Returns null if it can't be used. */
async function loadPhoto(src, publicDir) {
  if (!src) return null
  try {
    let buf
    let type
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src)
      if (!res.ok) return null
      buf = Buffer.from(await res.arrayBuffer())
      type = (res.headers.get("content-type") || "").split(";")[0]
    } else {
      const file = path.join(publicDir, src.replace(/^\//, ""))
      buf = fs.readFileSync(file)
      type = TYPES[path.extname(file).toLowerCase()]
    }
    if (!Object.values(TYPES).includes(type)) return null // e.g. WebP/AVIF: the renderer can't draw them
    return `data:${type};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}

// tiny element helper for satori (every element with several children must be display:flex)
const el = (type, style, ...children) => ({
  type,
  props: { style, children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children },
})

/** @returns {Promise<Buffer>} PNG bytes */
export async function renderOgImage({ name, jobTitle, credential, headline, host, photo, publicDir, cta = "View my work" }) {
  const photoUri = await loadPhoto(photo, publicDir)
  const textWidth = photoUri ? 640 : 1000
  // Fraunces italic averages ~0.47em per character: size the name to fit its column
  const nameSize = Math.round(Math.min(96, textWidth / (Math.max(name.length, 8) * 0.47)))

  const tree = el(
    "div",
    {
      width: 1200, height: 630, display: "flex", position: "relative", overflow: "hidden",
      backgroundImage: "linear-gradient(135deg, #f4f6ff 0%, #e8ecff 55%, #d9e0ff 100%)",
      fontFamily: "DM Sans", color: "#0b0f24",
    },
    // soft shapes
    el("div", { position: "absolute", right: -140, top: -170, width: 640, height: 640, borderRadius: 9999, backgroundColor: "rgba(0, 0, 139, 0.08)" }),
    el("div", { position: "absolute", left: -120, bottom: -200, width: 440, height: 440, borderRadius: 9999, backgroundColor: "rgba(91, 107, 255, 0.12)" }),
    // text
    el(
      "div",
      { display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 76, width: textWidth + 76, height: 630 },
      el(
        "div",
        {
          display: "flex", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, marginBottom: 30,
          backgroundColor: "rgba(255, 255, 255, 0.8)", border: "1px solid rgba(255, 255, 255, 0.95)",
          fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "#00008B",
        },
        jobTitle,
      ),
      el("div", { display: "flex", fontFamily: "Fraunces", fontStyle: "italic", fontSize: nameSize, lineHeight: 1.05, letterSpacing: -1, color: "#00008B" }, name),
      headline ? el("div", { display: "flex", marginTop: 14, fontFamily: "Fraunces", fontSize: 36, color: "#0b0f24" }, headline) : el("div", { display: "flex" }),
      credential ? el("div", { display: "flex", marginTop: 12, fontSize: 27, color: "#46507a" }, credential) : el("div", { display: "flex" }),
      // call to action + address
      el(
        "div",
        { display: "flex", alignItems: "center", marginTop: 40 },
        el(
          "div",
          {
            display: "flex", alignItems: "center", padding: "16px 30px", borderRadius: 999,
            backgroundImage: "linear-gradient(135deg, #2b2bc8 0%, #00008B 60%, #00006b 100%)",
            boxShadow: "0 14px 30px rgba(0, 0, 139, 0.35)", color: "#ffffff", fontSize: 26, fontWeight: 600,
          },
          cta,
          // arrow drawn as a shape (the bundled font subset has no → glyph)
          {
            type: "svg",
            props: {
              width: 26, height: 26, viewBox: "0 0 24 24", style: { marginLeft: 12 },
              children: { type: "path", props: { d: "M5 12h14M13 6l6 6-6 6", fill: "none", stroke: "#ffffff", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } },
            },
          },
        ),
        el("div", { display: "flex", marginLeft: 22, fontSize: 22, fontWeight: 600, color: "#46507a" }, host),
      ),
    ),
    // photo in the same arch shape as the hero
    photoUri
      ? el(
          "div",
          {
            position: "absolute", right: 84, top: 68, width: 380, height: 494, display: "flex", overflow: "hidden",
            borderRadius: "190px 190px 32px 32px", border: "8px solid rgba(255, 255, 255, 0.92)",
            boxShadow: "0 30px 60px rgba(0, 0, 139, 0.22)", backgroundColor: "#dfe5ff",
          },
          { type: "img", props: { src: photoUri, width: 364, height: 478, style: { width: 364, height: 478, objectFit: "cover" } } },
        )
      : el("div", { display: "flex" }),
  )

  const svg = await satori(tree, { width: 1200, height: 630, fonts: FONTS })
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng()
}
