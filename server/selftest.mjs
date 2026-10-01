// Runs the admin API end-to-end against both storage backends:
//   - file storage (local / VPS)
//   - Vercel Blob storage, using an in-memory fake of the @vercel/blob SDK
// Usage: npm run test:server

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createApp } from "./app.js"
import { createBlobStorage } from "./storage-blob.js"
import { createFsStorage } from "./storage-fs.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PASSWORD = `selftest-${Math.random().toString(36).slice(2)}`
process.env.ADMIN_PASSWORD = PASSWORD

let failures = 0
const check = (name, ok, detail = "") => {
  if (!ok) failures++
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && detail ? `  → ${detail}` : ""}`)
}

/** Minimal in-memory stand-in for @vercel/blob (same call shapes and rules we rely on). */
function fakeBlobClient() {
  const store = new Map()
  const HOST = "https://fake-store.public.blob.vercel-storage.com/"
  let n = 0
  const pathOf = (u) => (u.startsWith(HOST) ? u.slice(HOST.length) : u).split("?")[0]
  return {
    store,
    async put(pathname, body, opts = {}) {
      if (!opts.access) throw new Error("access is required")
      let p = pathname
      if (opts.addRandomSuffix) p = p.replace(/(\.[^./]+)?$/, (m) => `-r${++n}${m}`)
      else if (store.has(p) && !opts.allowOverwrite) throw new Error(`blob already exists: ${p}`)
      store.set(p, { body: Buffer.from(body), contentType: opts.contentType, uploadedAt: new Date() })
      return { url: HOST + p, pathname: p }
    },
    async get(urlOrPath, opts = {}) {
      if (!opts.access) throw new Error("access is required")
      const e = store.get(pathOf(urlOrPath))
      if (!e) return null
      return { statusCode: 200, stream: new Response(e.body).body, headers: new Headers(), blob: { contentType: e.contentType, size: e.body.length } }
    },
    async list({ prefix = "" } = {}) {
      const blobs = [...store.entries()].filter(([p]) => p.startsWith(prefix)).map(([p, v]) => ({ pathname: p, url: HOST + p, uploadedAt: v.uploadedAt, size: v.body.length }))
      return { blobs, hasMore: false }
    },
    async del(urls) {
      for (const u of [].concat(urls)) store.delete(pathOf(u))
    },
  }
}

async function run(label, storage, extra = () => {}) {
  console.log(`\n${label}`)
  const app = createApp({ storage, isProd: true })
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}`
  let cookie = ""
  const call = async (method, url, body, { form, headers = {} } = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    })
    const set = res.headers.get("set-cookie")
    if (set) cookie = set.split(";")[0]
    const type = res.headers.get("content-type") || ""
    return { status: res.status, headers: res.headers, data: type.includes("json") ? await res.json() : await res.text() }
  }

  try {
    let r = await call("GET", "/api/content")
    check("public content falls back to the built-in defaults", r.status === 200 && r.data.home?.headline?.length > 0)
    check("visitors get a short CDN cache", /s-maxage=30/.test(r.headers.get("cache-control") || ""))
    r = await call("GET", "/api/content?fresh=1")
    check("?fresh=1 is never cached", r.headers.get("cache-control") === "no-store")

    r = await call("GET", "/api/admin/me")
    check("not signed in yet, password configured, no first-run setup online", r.data.authed === false && r.data.passwordSet === true && r.data.canSetup === false)
    r = await call("POST", "/api/admin/setup", { password: "abcdefghij" })
    check("first-run setup is refused in production", r.status === 409 || r.status === 403)

    r = await call("PUT", "/api/admin/content/home", { headline: "nope" })
    check("saving without signing in is refused", r.status === 401)
    r = await call("POST", "/api/admin/login", { password: "wrong" })
    check("wrong password is rejected", r.status === 401)
    r = await call("POST", "/api/admin/login", { password: PASSWORD })
    check("correct password signs in", r.status === 200 && /HttpOnly/.test(r.headers.get("set-cookie") || "") && /Secure/.test(r.headers.get("set-cookie") || ""))

    const original = (await call("GET", "/api/content")).data.home
    r = await call("PUT", "/api/admin/content/home", { ...original, headline: "Edited headline" })
    check("save works", r.status === 200)
    r = await call("GET", "/api/content?fresh=1")
    check("the edit is served immediately", r.data.home.headline === "Edited headline")
    r = await call("PUT", "/api/admin/content/home", { ...original, headline: "Second edit" })
    r = await call("GET", "/api/admin/history/home")
    check("previous version was kept", r.data.versions.length === 1, JSON.stringify(r.data))
    r = await call("POST", `/api/admin/restore/home`, { version: (await call("GET", "/api/admin/history/home")).data.versions[0] })
    check("restore brings it back", r.status === 200 && r.data.data.headline === "Edited headline")
    check("…and is live", (await call("GET", "/api/content?fresh=1")).data.home.headline === "Edited headline")
    r = await call("PUT", "/api/admin/content/../secret", { a: 1 })
    check("unknown section names are refused", r.status === 404 || r.status === 401)
    r = await call("PUT", "/api/admin/content/nope", { a: 1 })
    check("unknown section is refused", r.status === 404)

    for (let i = 0; i < 18; i++) await call("PUT", "/api/admin/content/about", { tag: `v${i}` })
    r = await call("GET", "/api/admin/history/about")
    check("history keeps the latest 15 versions", r.data.versions.length === 15, String(r.data.versions.length))

    const jpg = new FormData()
    jpg.append("file", new Blob([Buffer.from("fakejpegbytes")], { type: "image/jpeg" }), "My Photo!.JPG")
    r = await call("POST", "/api/admin/upload", null, { form: jpg })
    check("image upload returns a URL", r.status === 200 && typeof r.data.url === "string" && /my-photo/.test(r.data.url), JSON.stringify(r.data))
    const js = new FormData()
    js.append("file", new Blob(["alert(1)"]), "evil.js")
    r = await call("POST", "/api/admin/upload", null, { form: js })
    check("scripts can't be uploaded", r.status === 400)
    const svg = new FormData()
    svg.append("file", new Blob(["<svg><script>1</script></svg>"]), "x.svg")
    r = await call("POST", "/api/admin/upload", null, { form: svg })
    check("SVG can't be uploaded", r.status === 400)
    const big = new FormData()
    big.append("file", new Blob([Buffer.alloc(5 * 1024 * 1024)]), "big.jpg")
    r = await call("POST", "/api/admin/upload", null, { form: big })
    check("files over 4 MB are refused with a clear message", r.status === 400 && /4 MB/.test(r.data.error || ""), JSON.stringify(r.data))

    r = await call("GET", "/api/admin/export")
    check("backup export works", r.status === 200 && r.data.home && r.data.contact)
    await call("POST", "/api/admin/logout")
    cookie = ""
    r = await call("PUT", "/api/admin/content/home", original)
    check("signed out → saving refused again", r.status === 401)
    r = await call("POST", "/api/admin/login", { password: PASSWORD }, { headers: { Origin: "https://evil.example" } })
    check("cross-site requests are rejected", r.status === 403)

    await extra({ call })
  } finally {
    server.close()
  }
}

// ---- file storage
const tmp = path.join(ROOT, "data", `.selftest-${process.pid}`)
await run("File storage", createFsStorage(tmp))
fs.rmSync(tmp, { recursive: true, force: true })

// ---- Vercel Blob storage (fake SDK)
const fake = fakeBlobClient()
await run("Vercel Blob storage (fake SDK)", createBlobStorage({ client: fake }), async () => {
  const paths = [...fake.store.keys()]
  check("content is stored as JSON blobs under content/", paths.some((p) => p === "content/home.json"))
  check("uploads go under uploads/ with a random suffix", paths.some((p) => /^uploads\/my-photo-r\d+\.jpg$/.test(p)))
  check("uploaded file kept its content type", [...fake.store.entries()].find(([p]) => p.startsWith("uploads/"))?.[1].contentType === "image/jpeg")
})

// ---- contact form (the "Hire me" popup)
{
  console.log("\nContact form → email")
  const sent = []
  let resendOk = true
  const fakeFetch = async (url, init) => {
    sent.push({ url, init, body: JSON.parse(init.body) })
    return { ok: resendOk, status: resendOk ? 200 : 500, text: async () => "" }
  }
  const app = createApp({ storage: createFsStorage(path.join(ROOT, "data", `.selftest-contact-${process.pid}`)), isProd: true, fetchImpl: fakeFetch })
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}`
  const post = async (body, headers = {}) => {
    const res = await fetch(`${base}/api/contact`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })
    return { status: res.status, data: await res.json() }
  }
  const good = { name: "Ada Client", email: "ada@client.io", type: "New website", message: "I need a portfolio for my studio, launching in June." }

  delete process.env.RESEND_API_KEY
  delete process.env.CONTACT_TO
  let r = await post(good)
  check("not configured → asks the browser to fall back to email", r.status === 503 && r.data.fallback === true)

  process.env.RESEND_API_KEY = "re_test_key"
  process.env.CONTACT_TO = "owner@mysite.dev"
  check("empty name is rejected", (await post({ ...good, name: "" })).status === 400)
  check("bad email is rejected", (await post({ ...good, email: "not-an-email" })).status === 400)
  check("too-short message is rejected", (await post({ ...good, message: "hi" })).status === 400)
  r = await post({ ...good, company: "Spam Inc" })
  check("honeypot: bots get a fake success and nothing is sent", r.status === 200 && sent.length === 0)
  r = await post(good, { Origin: "https://evil.example" })
  check("other websites can't post to it", r.status === 403 && sent.length === 0)

  r = await post({ ...good, message: 'Hello <script>alert(1)</script> & "quotes"\nsecond line' })
  const mail = sent[0]?.body
  check("valid message is sent through Resend", r.status === 200 && sent.length === 1 && sent[0].url === "https://api.resend.com/emails")
  check("goes to the owner, replies go to the visitor", mail?.to?.[0] === "owner@mysite.dev" && mail?.reply_to === "ada@client.io", JSON.stringify(mail?.to))
  check("subject names the visitor and project type", /Ada Client/.test(mail?.subject || "") && /New website/.test(mail?.subject || ""))
  check("API key is sent as a bearer token", sent[0]?.init.headers.Authorization === "Bearer re_test_key")
  check("message is HTML-escaped in the email", !/<script>/.test(mail?.html || "") && /&lt;script&gt;/.test(mail?.html || ""))

  process.env.CONTACT_TO = "you@example.com"
  r = await post(good)
  check("placeholder recipient (@example.com) counts as not configured", r.status === 503 && r.data.fallback === true)
  process.env.CONTACT_TO = "owner@mysite.dev"

  resendOk = false
  r = await post({ ...good, email: "grace@client.io" })
  check("provider failure gives a friendly error", r.status === 502 && /email me directly/.test(r.data.error))
  resendOk = true
  r = await post({ ...good, email: "grace2@client.io" })
  r = await post({ ...good, email: "grace3@client.io" })
  check("rate limit stops floods", r.status === 429, String(r.status))

  delete process.env.RESEND_API_KEY
  delete process.env.CONTACT_TO
  server.close()
  fs.rmSync(path.join(ROOT, "data", `.selftest-contact-${process.pid}`), { recursive: true, force: true })
}

// ---- rebuild after saving (Vercel Deploy Hook)
{
  console.log("\nRebuild after saving")
  const calls = []
  const fakeFetch = async (url, init) => { calls.push({ url, method: init?.method }); return { ok: true, status: 201, text: async () => "" } }
  const dir = path.join(ROOT, "data", `.selftest-hook-${process.pid}`)
  const app = createApp({ storage: createFsStorage(dir), isProd: true, fetchImpl: fakeFetch })
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}`
  const login = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: PASSWORD }) })
  const cookie = login.headers.get("set-cookie").split(";")[0]
  const save = () => fetch(`${base}/api/admin/content/site`, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ name: "Test" }) }).then((r) => r.json())

  delete process.env.VERCEL_DEPLOY_HOOK_URL
  let r = await save()
  check("without a hook: saves, no rebuild", r.ok === true && r.rebuilding === false && calls.length === 0)
  process.env.VERCEL_DEPLOY_HOOK_URL = "https://api.vercel.com/v1/integrations/deploy/test-hook"
  r = await save()
  check("with a hook: every save triggers a rebuild", r.rebuilding === true && calls.length === 1 && calls[0].method === "POST" && calls[0].url.includes("deploy"))
  const versions = (await fetch(`${base}/api/admin/history/site`, { headers: { Cookie: cookie } }).then((x) => x.json())).versions
  r = await fetch(`${base}/api/admin/restore/site`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify({ version: versions[0] }) }).then((x) => x.json())
  check("restoring a version also rebuilds", r.ok === true && r.rebuilding === true && calls.length === 2)
  const pub = await fetch(`${base}/api/content`).then((x) => x.json())
  check("the case study is part of the public content", Array.isArray(pub.casestudy?.metrics) && pub.casestudy.metrics.length > 0)
  delete process.env.VERCEL_DEPLOY_HOOK_URL
  server.close()
  fs.rmSync(dir, { recursive: true, force: true })
}

// ---- Blob store not connected yet (first deploy): site still loads, admin explains what to do
{
  console.log("\nVercel Blob not connected yet")
  delete process.env.BLOB_READ_WRITE_TOKEN
  const app = createApp({ storage: createBlobStorage(), isProd: true })
  const server = app.listen(0)
  const base = `http://127.0.0.1:${server.address().port}`
  let res = await fetch(`${base}/api/content`)
  const content = await res.json()
  check("public site still gets the built-in content", res.status === 200 && content.home?.headline?.length > 0)
  const login = await fetch(`${base}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: PASSWORD }) })
  const cookie = login.headers.get("set-cookie").split(";")[0]
  res = await fetch(`${base}/api/admin/content/home`, { method: "PUT", headers: { "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(content.home) })
  const err = await res.json()
  check("saving explains how to connect Blob", res.status === 500 && /Storage/.test(err.error || ""), JSON.stringify(err))
  server.close()
}

console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed")
process.exit(failures ? 1 : 0)
