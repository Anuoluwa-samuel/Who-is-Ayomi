// One-time helper before your first Vercel deploy:
// copies what you edited locally (data/content/*.json, data/uploads/*) into the project as the
// site's starting content (src/content) and static uploads (public/uploads), so it goes live with the code.
// After that, edit on the live site's /admin — those edits are stored in Vercel Blob.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"))
const read = (f) => { try { return fs.readFileSync(f, "utf8") } catch { return null } }
let changed = 0

const contentDir = path.join(DATA, "content")
if (fs.existsSync(contentDir)) {
  for (const f of fs.readdirSync(contentDir).filter((n) => n.endsWith(".json"))) {
    const from = read(path.join(contentDir, f))
    const to = path.join(ROOT, "src", "content", f)
    if (from !== null && JSON.stringify(JSON.parse(from)) !== JSON.stringify(JSON.parse(read(to) ?? "null"))) {
      fs.writeFileSync(to, JSON.stringify(JSON.parse(from), null, 2) + "\n")
      console.log(`content  ${f}  updated`)
      changed++
    }
  }
}

const uploadDir = path.join(DATA, "uploads")
if (fs.existsSync(uploadDir)) {
  const out = path.join(ROOT, "public", "uploads")
  fs.mkdirSync(out, { recursive: true })
  for (const f of fs.readdirSync(uploadDir)) {
    const dest = path.join(out, f)
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(uploadDir, f), dest)
      console.log(`upload   ${f}  copied to public/uploads`)
      changed++
    }
  }
}

console.log(changed ? `\nDone — ${changed} item(s) carried over. Commit and deploy.` : "Nothing to carry over.")
