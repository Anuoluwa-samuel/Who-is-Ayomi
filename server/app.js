// The admin API, independent of where data lives. Used by:
//  - server/index.js  (local dev / any Node host)  with file storage
//  - api/index.js     (Vercel serverless function) with Vercel Blob storage
//
// Routes
//   GET  /api/content                     public: all site content (the site reads this on load)
//   /api/admin/*                          private (single admin): login, save, uploads, history, export

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import multer from "multer"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, "..")
const DEFAULTS_DIR = path.join(ROOT, "src", "content")

export const SECTIONS = ["site", "home", "about", "skills", "projects", "contact"]
const SESSION_MS = 1000 * 60 * 60 * 12 // 12 hours
export const UPLOAD_LIMIT = 4 * 1024 * 1024 // Vercel functions accept ~4.5 MB request bodies
const UPLOAD_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
}

const readDefault = (id) => {
  try { return JSON.parse(fs.readFileSync(path.join(DEFAULTS_DIR, `${id}.json`), "utf8")) } catch { return {} }
}

/**
 * @param {object} opts
 * @param {import('./storage-fs.js').Storage} opts.storage   where content / uploads live
 * @param {boolean} [opts.isProd]                            production: no first-run password screen, Secure cookies
 */
export function createApp({ storage, isProd = process.env.NODE_ENV === "production", fetchImpl = globalThis.fetch }) {
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

  // ---------------------------------------------------------------- content
  const readContent = async () => {
    let stored = {}
    try {
      stored = await storage.readAll()
    } catch (err) {
      console.error("[admin] couldn't read stored content, serving the built-in defaults:", err.message) // the public site must never break
    }
    return Object.fromEntries(SECTIONS.map((id) => [id, stored[id] ?? readDefault(id)]))
  }

  // ---------------------------------------------------------------- auth
  const sha = (s) => crypto.createHash("sha256").update(String(s)).digest()
  const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b))
  const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => ({
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString("hex"),
  })

  let secretCache
  const getSecret = async () => {
    if (secretCache) return secretCache
    secretCache =
      process.env.SESSION_SECRET ||
      (await storage.secret?.()) ||
      // serverless: no disk, so derive a stable secret from the admin password (changing it signs you out)
      (process.env.ADMIN_PASSWORD ? crypto.createHash("sha256").update(`portfolio-admin:${process.env.ADMIN_PASSWORD}`).digest("hex") : crypto.randomBytes(32).toString("hex"))
    return secretCache
  }

  const hasPassword = async () => Boolean(process.env.ADMIN_PASSWORD) || Boolean(await storage.readCreds?.())
  const passwordOk = async (password) => {
    if (typeof password !== "string" || !password) return false
    if (process.env.ADMIN_PASSWORD) return safeEqual(password, process.env.ADMIN_PASSWORD)
    const creds = await storage.readCreds?.()
    if (!creds) return false
    const { hash } = hashPassword(password, creds.salt)
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(creds.hash, "hex"))
  }

  const sign = async (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const mac = crypto.createHmac("sha256", await getSecret()).update(body).digest("base64url")
    return `${body}.${mac}`
  }
  const verify = async (token) => {
    if (typeof token !== "string") return null
    const [body, mac] = token.split(".")
    if (!body || !mac) return null
    const expected = crypto.createHmac("sha256", await getSecret()).update(body).digest("base64url")
    if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
    try {
      const data = JSON.parse(Buffer.from(body, "base64url").toString())
      return data.exp > Date.now() ? data : null
    } catch { return null }
  }
  const parseCookies = (header = "") =>
    Object.fromEntries(header.split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((p) => p[0]))

  const isSecure = (req) => req.secure || req.headers["x-forwarded-proto"] === "https"
  const setSession = async (req, res) => {
    const token = await sign({ exp: Date.now() + SESSION_MS })
    const flags = ["HttpOnly", "SameSite=Strict", "Path=/", `Max-Age=${SESSION_MS / 1000}`]
    if (isSecure(req) || isProd) flags.push("Secure")
    res.setHeader("Set-Cookie", `admin_session=${token}; ${flags.join("; ")}`)
  }
  const clearSession = (res) => res.setHeader("Set-Cookie", "admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0")
  const isAuthed = async (req) => Boolean(await verify(parseCookies(req.headers.cookie).admin_session))
  const requireAuth = wrap(async (req, res, next) => ((await isAuthed(req)) ? next() : res.status(401).json({ error: "Not signed in" })))

  // brute-force guard: 6 failed logins / 10 min / IP (per server instance — on serverless this is best-effort,
  // the long password + the 600 ms delay on every miss are the real protection)
  const failures = new Map()
  const tooMany = (ip) => { const f = failures.get(ip); return Boolean(f && f.count >= 6 && Date.now() - f.first < 10 * 60 * 1000) }
  const noteFailure = (ip) => {
    const f = failures.get(ip)
    if (!f || Date.now() - f.first > 10 * 60 * 1000) failures.set(ip, { count: 1, first: Date.now() })
    else f.count += 1
  }

  // ---------------------------------------------------------------- app
  const app = express()
  app.disable("x-powered-by")
  app.set("trust proxy", 1)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "SAMEORIGIN")
    res.setHeader("Referrer-Policy", "same-origin")
    next()
  })
  app.use(express.json({ limit: "1mb" }))

  // mutating requests must come from this site (extra CSRF protection on top of SameSite=Strict)
  const sameOrigin = (req) => {
    if (!req.headers.origin) return true
    try {
      const originHost = new URL(req.headers.origin).host
      return [req.headers.host, req.headers["x-forwarded-host"]].filter(Boolean).includes(originHost)
    } catch { return false }
  }
  app.use("/api/admin", (req, res, next) => {
    if (req.method !== "GET" && !sameOrigin(req)) return res.status(403).json({ error: "Bad origin" })
    next()
  })

  // ---- public
  app.get("/api/content", wrap(async (req, res) => {
    // ?fresh=1 (admin preview) is never cached; visitors get a short CDN cache so the API isn't hit per page view
    res.setHeader("Cache-Control", isProd && !req.query.fresh ? "public, max-age=0, s-maxage=30, stale-while-revalidate=300" : "no-store")
    res.json(await readContent())
  }))

  // ---- public contact form (the "Hire me" popup) → emails the site owner via Resend
  //   env: RESEND_API_KEY (required to send), CONTACT_TO (defaults to the email set in the admin),
  //        CONTACT_FROM (defaults to Resend's shared test sender, which can deliver to your own Resend account email)
  const contactHits = new Map()
  const contactLimited = (ip) => {
    const now = Date.now()
    const hits = (contactHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000)
    contactHits.set(ip, hits)
    if (hits.length >= 4) return true
    hits.push(now)
    return false
  }
  const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max)
  const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200

  app.post("/api/contact", wrap(async (req, res) => {
    if (!sameOrigin(req)) return res.status(403).json({ error: "Bad origin" })
    const body = req.body || {}
    if (body.company) return res.json({ ok: true }) // honeypot: bots fill the hidden field; pretend it worked

    const name = clean(body.name, 100)
    const email = clean(body.email, 200)
    const type = clean(body.type, 60) || "General enquiry"
    const message = String(body.message ?? "").replace(/\r\n/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, 5000)
    if (!name) return res.status(400).json({ error: "Please tell me your name." })
    if (!validEmail(email)) return res.status(400).json({ error: "That email address doesn't look right." })
    if (message.length < 10) return res.status(400).json({ error: "Please add a few words about your project." })
    if (contactLimited(req.ip)) return res.status(429).json({ error: "You've sent a few messages already — please try again later." })

    const to = clean(process.env.CONTACT_TO || (await readContent()).site?.email, 200)
    const key = process.env.RESEND_API_KEY
    if (!key || !validEmail(to) || /@example\.com$/i.test(to)) {
      // not configured: the site falls back to opening the visitor's email app
      return res.status(503).json({ fallback: true, error: "Email sending isn't set up yet." })
    }

    const subject = `New enquiry from ${name} — ${type}`
    const text = `Name: ${name}\nEmail: ${email}\nProject type: ${type}\n\n${message}\n`
    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.55;color:#0b0f24"><h2 style="margin:0 0 12px">New enquiry from your portfolio</h2><p style="margin:0"><b>Name:</b> ${escapeHtml(name)}<br><b>Email:</b> ${escapeHtml(email)}<br><b>Project type:</b> ${escapeHtml(type)}</p><hr style="border:none;border-top:1px solid #dde;margin:16px 0"><p style="white-space:pre-wrap;margin:0">${escapeHtml(message)}</p></div>`

    let ok = false
    try {
      const r = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.CONTACT_FROM || "Portfolio <onboarding@resend.dev>", to: [to], reply_to: email, subject, text, html }),
      })
      ok = r.ok
      if (!r.ok) console.error("[contact] Resend refused the message:", r.status, await r.text().catch(() => ""))
    } catch (err) {
      console.error("[contact] couldn't reach Resend:", err.message)
    }
    if (!ok) return res.status(502).json({ error: "I couldn't send that just now — please email me directly." })
    res.json({ ok: true })
  }))

  // ---- session
  app.get("/api/admin/me", wrap(async (req, res) => {
    res.setHeader("Cache-Control", "no-store")
    const passwordSet = await hasPassword()
    res.json({ authed: await isAuthed(req), passwordSet, canSetup: !passwordSet && !isProd })
  }))

  app.post("/api/admin/setup", wrap(async (req, res) => {
    if (await hasPassword()) return res.status(409).json({ error: "A password is already set" })
    if (isProd || !storage.writeCreds) return res.status(403).json({ error: "Set the ADMIN_PASSWORD environment variable on the server" })
    const { password } = req.body || {}
    if (typeof password !== "string" || password.length < 8) return res.status(400).json({ error: "Use at least 8 characters" })
    await storage.writeCreds(hashPassword(password))
    await setSession(req, res)
    res.json({ ok: true })
  }))

  app.post("/api/admin/login", wrap(async (req, res) => {
    const ip = req.ip
    if (tooMany(ip)) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." })
    if (!(await passwordOk((req.body || {}).password))) {
      noteFailure(ip)
      await new Promise((r) => setTimeout(r, 600))
      return res.status(401).json({ error: "Wrong password" })
    }
    failures.delete(ip)
    await setSession(req, res)
    res.json({ ok: true })
  }))

  app.post("/api/admin/logout", (_req, res) => {
    clearSession(res)
    res.json({ ok: true })
  })

  // ---- content (private)
  const isSection = (id) => SECTIONS.includes(id)

  app.put("/api/admin/content/:section", requireAuth, wrap(async (req, res) => {
    const id = req.params.section
    if (!isSection(id)) return res.status(404).json({ error: "Unknown section" })
    const data = req.body
    if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "Invalid content" })
    // keep the previous version so a bad edit can be undone
    const previous = await storage.readSection(id)
    if (previous) await storage.pushHistory(id, previous)
    await storage.writeSection(id, data)
    res.json({ ok: true })
  }))

  app.get("/api/admin/history/:section", requireAuth, wrap(async (req, res) => {
    if (!isSection(req.params.section)) return res.status(404).json({ error: "Unknown section" })
    res.json({ versions: await storage.listHistory(req.params.section) })
  }))

  app.post("/api/admin/restore/:section", requireAuth, wrap(async (req, res) => {
    const id = req.params.section
    const version = Number((req.body || {}).version)
    if (!isSection(id) || !Number.isFinite(version)) return res.status(400).json({ error: "Bad request" })
    const data = await storage.readHistory(id, version)
    if (!data) return res.status(404).json({ error: "Version not found" })
    const current = await storage.readSection(id)
    if (current) await storage.pushHistory(id, current)
    await storage.writeSection(id, data)
    res.json({ ok: true, data })
  }))

  app.get("/api/admin/export", requireAuth, wrap(async (_req, res) => {
    res.setHeader("Content-Disposition", 'attachment; filename="site-content.json"')
    res.json(await readContent())
  }))

  // ---- uploads (private)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: UPLOAD_LIMIT, files: 1 },
    fileFilter: (_req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() in UPLOAD_TYPES),
  })

  app.post("/api/admin/upload", requireAuth, (req, res) => {
    upload.single("file")(req, res, async (err) => {
      if (err) return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is over 4 MB" : "Upload failed" })
      if (!req.file) return res.status(400).json({ error: "Unsupported file type (use JPG, PNG, WebP, GIF, AVIF or PDF)" })
      try {
        const ext = path.extname(req.file.originalname).toLowerCase()
        const base = path.basename(req.file.originalname, path.extname(req.file.originalname)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file"
        const url = await storage.saveUpload({ buffer: req.file.buffer, filename: `${base}${ext}`, contentType: UPLOAD_TYPES[ext] })
        res.json({ url })
      } catch (e) {
        console.error("[admin] upload failed:", e)
        res.status(500).json({ error: "Couldn't store the file" })
      }
    })
  })

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }))

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error("[admin]", err)
    res.status(500).json({ error: err.publicMessage || "Server error" })
  })

  return app
}
