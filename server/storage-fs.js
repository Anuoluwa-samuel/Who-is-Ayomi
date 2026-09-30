// File storage: content, uploads, history and the password hash live in DATA_DIR (default ./data).
// Used for local development and for hosts with a persistent disk.

import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const KEEP_VERSIONS = 15

/**
 * @typedef {object} Storage
 * @property {() => Promise<Record<string, object>>} readAll        every stored section (missing ones are omitted)
 * @property {(id: string) => Promise<object|null>} readSection
 * @property {(id: string, data: object) => Promise<void>} writeSection
 * @property {(id: string) => Promise<number[]>} listHistory         newest first
 * @property {(id: string, version: number) => Promise<object|null>} readHistory
 * @property {(id: string, data: object) => Promise<void>} pushHistory
 * @property {(file: {buffer: Buffer, filename: string, contentType: string}) => Promise<string>} saveUpload  → public URL
 * @property {() => Promise<object|null>} [readCreds]                first-run password (file storage only)
 * @property {(creds: object) => Promise<void>} [writeCreds]
 * @property {() => Promise<string|null>} [secret]
 */

const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) } catch { return fallback }
}
const writeJsonAtomic = (file, data) => {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n")
  fs.renameSync(tmp, file)
}

/** @returns {Storage & { uploadDir: string, dataDir: string }} */
export function createFsStorage(dataDir) {
  const contentDir = path.join(dataDir, "content")
  const uploadDir = path.join(dataDir, "uploads")
  const historyDir = path.join(dataDir, "history")
  const credsFile = path.join(dataDir, "admin.json")
  const secretFile = path.join(dataDir, "secret.key")
  for (const dir of [contentDir, uploadDir, historyDir]) fs.mkdirSync(dir, { recursive: true })

  const sectionFile = (id) => path.join(contentDir, `${id}.json`)

  return {
    kind: "fs",
    dataDir,
    uploadDir,

    async readAll() {
      const out = {}
      for (const f of fs.readdirSync(contentDir)) {
        if (!f.endsWith(".json")) continue
        const data = readJson(path.join(contentDir, f))
        if (data) out[f.replace(/\.json$/, "")] = data
      }
      return out
    },
    async readSection(id) { return readJson(sectionFile(id)) },
    async writeSection(id, data) { writeJsonAtomic(sectionFile(id), data) },

    async pushHistory(id, data) {
      const dir = path.join(historyDir, id)
      fs.mkdirSync(dir, { recursive: true })
      writeJsonAtomic(path.join(dir, `${Date.now()}.json`), data)
      fs.readdirSync(dir).sort().slice(0, -KEEP_VERSIONS).forEach((f) => fs.unlinkSync(path.join(dir, f)))
    },
    async listHistory(id) {
      const dir = path.join(historyDir, id)
      if (!fs.existsSync(dir)) return []
      return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => Number(f.replace(".json", ""))).filter(Number.isFinite).sort((a, b) => b - a)
    },
    async readHistory(id, version) { return readJson(path.join(historyDir, id, `${version}.json`)) },

    async saveUpload({ buffer, filename }) {
      const ext = path.extname(filename)
      const name = `${path.basename(filename, ext)}-${crypto.randomBytes(3).toString("hex")}${ext}`
      fs.writeFileSync(path.join(uploadDir, name), buffer)
      return `/uploads/${name}`
    },

    async readCreds() { return readJson(credsFile) },
    async writeCreds(creds) {
      writeJsonAtomic(credsFile, creds)
      fs.chmodSync(credsFile, 0o600)
    },
    async secret() {
      if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString("hex"), { mode: 0o600 })
      return fs.readFileSync(secretFile, "utf8")
    },
  }
}
