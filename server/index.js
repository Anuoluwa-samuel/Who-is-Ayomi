// Local / Node-host entry: admin API + uploads + (in production) the built site.
//   npm run dev     → this runs next to Vite (API on :8787)
//   npm start       → NODE_ENV=production, also serves dist/ and /admin
// On Vercel this file is not used — see api/index.js.

import fs from "node:fs"
import path from "node:path"
import express from "express"
import { createApp, ROOT } from "./app.js"
import { createBlobStorage } from "./storage-blob.js"
import { createFsStorage } from "./storage-fs.js"

const PORT = Number(process.env.PORT || 8787)
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"))
const DIST_DIR = path.join(ROOT, "dist")
const IS_PROD = process.env.NODE_ENV === "production"

const storage = process.env.STORAGE === "blob" ? createBlobStorage() : createFsStorage(DATA_DIR)
const app = createApp({ storage, isProd: IS_PROD })

if (storage.kind === "fs") {
  app.use("/uploads", express.static(storage.uploadDir, { maxAge: "7d", index: false, dotfiles: "deny" }))
}

// production: serve the built site (also /admin, which is part of the same app)
if (fs.existsSync(path.join(DIST_DIR, "index.html"))) {
  app.use(express.static(DIST_DIR, { index: false, redirect: false, maxAge: "1h" }))
  const adminPage = path.join(DIST_DIR, "admin", "index.html")
  app.get(/^\/admin(\/.*)?$/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache")
    res.sendFile(fs.existsSync(adminPage) ? adminPage : path.join(DIST_DIR, "index.html"))
  })
  app.get(/.*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache")
    res.sendFile(path.join(DIST_DIR, "index.html"))
  })
}

app.listen(PORT, async () => {
  const where = storage.kind === "fs" ? path.relative(ROOT, DATA_DIR) || "." : "Vercel Blob"
  console.log(`[admin] API listening on http://localhost:${PORT}  (data: ${where})`)
  const hasPassword = Boolean(process.env.ADMIN_PASSWORD) || Boolean(await storage.readCreds?.())
  if (!hasPassword) {
    console.log(IS_PROD ? "[admin] ADMIN_PASSWORD is not set — the admin is disabled until you set it." : "[admin] No admin password yet — open /admin to create it (first run only).")
  }
})
