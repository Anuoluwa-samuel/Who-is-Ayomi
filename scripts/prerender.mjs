// Last build step: turn the home page into real HTML.
// Search engines and link previews (WhatsApp, LinkedIn, X…) read the HTML without running JavaScript,
// so this writes the rendered page, the title/description/preview tags, Google's structured data,
// the preview image, robots.txt and sitemap.xml into dist/.
//
// Content comes from the same place the admin saves to (Vercel Blob on Vercel, ./data locally),
// falling back to the defaults in src/content. Set VERCEL_DEPLOY_HOOK_URL so saving in /admin rebuilds this.

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadContent } from "../server/app.js"
import { createBlobStorage } from "../server/storage-blob.js"
import { createFsStorage } from "../server/storage-fs.js"
import { renderOgImage } from "./og-image.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DIST = path.join(ROOT, "dist")
const PUBLIC = path.join(ROOT, "public")
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"))

// The site's public address. Override with SITE_URL (e.g. when you add a custom domain).
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://whoisayomi.vercel.app")
).replace(/\/+$/, "")
const HOST = SITE_URL.replace(/^https?:\/\//, "")

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const LS = String.fromCharCode(0x2028)
const PS = String.fromCharCode(0x2029)
// JSON that is safe inside <script>: no "</script>" break-out, no raw line/paragraph separators
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, "\\u003c").split(LS).join("\\u2028").split(PS).join("\\u2029")
const absolute = (src) => (!src ? undefined : /^https?:\/\//.test(src) ? src : `${SITE_URL}/${src.replace(/^\//, "")}`)

// ---- 1. content
const storage =
  process.env.BLOB_READ_WRITE_TOKEN || process.env.STORAGE === "blob"
    ? createBlobStorage()
    : !process.env.VERCEL && fs.existsSync(path.join(DATA_DIR, "content"))
      ? createFsStorage(DATA_DIR)
      : { readAll: async () => ({}) }
const content = await loadContent(storage)
const site = content.site ?? {}
const name = site.name || "Portfolio"
const jobTitle = site.jobTitle || "Web Developer"
const title = site.title || `${name} — ${jobTitle}`
const description = site.description || ""
const googleCode = String(site.googleVerification ?? "").trim().replace(/^.*content=["']?([^"'\s>]+).*$/s, "$1")
const shareDescription = site.shareDescription || description // link previews show ~125 characters

// ---- 2. render the page
globalThis.__CONTENT__ = content
const { render } = await import(pathToFileURL(path.join(ROOT, "dist-ssr", "entry-server.js")).href)
const appHtml = render()

// ---- 3. link-preview image
let ogFile = "og-image.png"
try {
  const png = await renderOgImage({
    name,
    jobTitle,
    credential: site.credential,
    headline: content.home?.headline,
    host: HOST,
    photo: site.photo,
    publicDir: PUBLIC,
  })
  fs.writeFileSync(path.join(DIST, ogFile), png)
} catch (err) {
  console.warn("[prerender] couldn't draw the preview image, using public/og-image.png:", err.message)
  if (!fs.existsSync(path.join(DIST, ogFile))) ogFile = null
}
const ogVersion = ogFile ? crypto.createHash("sha1").update(fs.readFileSync(path.join(DIST, ogFile))).digest("hex").slice(0, 10) : ""
const ogImage = ogFile ? `${SITE_URL}/${ogFile}?v=${ogVersion}` : null

// ---- 4. structured data (Google's "who is this person" card)
const sameAs = (content.contact?.socials ?? [])
  .map((s) => s.url)
  .filter((u) => typeof u === "string" && /^https?:\/\//.test(u))
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name,
  url: `${SITE_URL}/`,
  jobTitle,
  ...(description && { description }),
  ...(absolute(site.photo) && { image: absolute(site.photo) }),
  ...(site.school && { alumniOf: { "@type": "CollegeOrUniversity", name: site.school } }),
  ...(sameAs.length && { sameAs }),
}
const website = { "@context": "https://schema.org", "@type": "WebSite", name, url: `${SITE_URL}/` }

const headTags = [
  `<link rel="canonical" href="${esc(SITE_URL)}/" />`,
  // Google Search Console ownership check (paste either the code or the whole <meta> tag in /admin)
  ...(googleCode ? [`<meta name="google-site-verification" content="${esc(googleCode)}" />`] : []),
  `<meta name="author" content="${esc(name)}" />`,
  `<meta property="og:type" content="website" />`,
  `<meta property="og:site_name" content="${esc(name)}" />`,
  `<meta property="og:title" content="${esc(title)}" />`,
  `<meta property="og:description" content="${esc(shareDescription)}" />`,
  `<meta property="og:url" content="${esc(SITE_URL)}/" />`,
  ...(ogImage
    ? [
        `<meta property="og:image" content="${esc(ogImage)}" />`,
        `<meta property="og:image:type" content="image/png" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${esc(`${name} — ${jobTitle}`)}" />`,
      ]
    : []),
  `<meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />`,
  `<meta name="twitter:title" content="${esc(title)}" />`,
  `<meta name="twitter:description" content="${esc(shareDescription)}" />`,
  ...(ogImage ? [`<meta name="twitter:image" content="${esc(ogImage)}" />`, `<meta name="twitter:image:alt" content="${esc(`${name} — ${jobTitle}`)}" />`] : []),
  `<script type="application/ld+json">${jsonForScript([person, website])}</script>`,
].join("\n    ")

// ---- 5. write the pages
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8")
if (!template.includes("<!--app-html-->") || !template.includes("<!--app-head-->")) {
  throw new Error("dist/index.html is missing the <!--app-head--> / <!--app-html--> placeholders")
}

const page = template
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
  .replace("<!--app-head-->", headTags)
  .replace(
    "<!--app-html--></div>",
    `${appHtml}</div>\n    <script id="__CONTENT__" type="application/json">${jsonForScript(content)}</script>`,
  )
fs.writeFileSync(path.join(DIST, "index.html"), page)

// the admin is not for search engines and shouldn't flash the prerendered home page
fs.mkdirSync(path.join(DIST, "admin"), { recursive: true })
fs.writeFileSync(
  path.join(DIST, "admin", "index.html"),
  template
    .replace(/<title>[\s\S]*?<\/title>/, "<title>Site admin</title>")
    .replace("<!--app-head-->", '<meta name="robots" content="noindex, nofollow" />')
    .replace("<!--app-html-->", ""),
)

fs.writeFileSync(
  path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
)
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>\n</urlset>\n`,
)

console.log(`[prerender] ${SITE_URL}  ·  content: ${storage.kind ?? "built-in defaults"}  ·  page ${Math.round(page.length / 1024)} KB  ·  preview image ${ogImage ? "ok" : "missing"}`)
