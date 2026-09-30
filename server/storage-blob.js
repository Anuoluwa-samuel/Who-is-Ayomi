// Vercel Blob storage: content, history and uploads live in a Blob store, so nothing depends on a local disk.
// The store must be a PUBLIC store (uploaded images are shown to visitors). Vercel injects
// BLOB_READ_WRITE_TOKEN when the store is connected to the project.

import path from "node:path"

const KEEP_VERSIONS = 15
const ACCESS = process.env.BLOB_ACCESS === "private" ? "private" : "public"

/**
 * @param {object} [deps]  injectable for tests
 * @param {{put: Function, list: Function, del: Function, get: Function}} [deps.client]
 * @returns {import('./storage-fs.js').Storage}
 */
export function createBlobStorage({ client } = {}) {
  let sdk = client
  const api = async () => {
    if (!sdk && !process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      throw Object.assign(new Error("Vercel Blob is not connected"), {
        publicMessage: "Vercel Blob isn't connected yet — in Vercel open Storage → Create → Blob (Public), connect it to this project, then redeploy.",
      })
    }
    return (sdk ??= await import("@vercel/blob"))
  }

  const sectionPath = (id) => `content/${id}.json`
  const historyPrefix = (id) => `history/${id}/`

  const listAll = async (prefix) => {
    const { list } = await api()
    const out = []
    let cursor
    do {
      const page = await list({ prefix, cursor, limit: 1000 })
      out.push(...page.blobs)
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return out
  }

  // get() with useCache:false always returns the latest saved version (no CDN delay)
  const readJsonBlob = async (pathname) => {
    const { get } = await api()
    try {
      const res = await get(pathname, { access: ACCESS, useCache: false })
      if (!res || res.statusCode !== 200 || !res.stream) return null
      return await new Response(res.stream).json()
    } catch (err) {
      if (err && (err.name === "BlobNotFoundError" || /not found/i.test(err.message || ""))) return null
      throw err
    }
  }

  const putJson = async (pathname, data) => {
    const { put } = await api()
    await put(pathname, JSON.stringify(data, null, 2), {
      access: ACCESS,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  }

  return {
    kind: "blob",

    async readAll() {
      const blobs = await listAll("content/")
      const ids = blobs.map((b) => path.basename(b.pathname, ".json")).filter((id) => id && !id.includes("/"))
      const entries = await Promise.all(ids.map(async (id) => [id, await readJsonBlob(sectionPath(id))]))
      return Object.fromEntries(entries.filter(([, v]) => v))
    },
    readSection: (id) => readJsonBlob(sectionPath(id)),
    writeSection: (id, data) => putJson(sectionPath(id), data),

    async pushHistory(id, data) {
      await putJson(`${historyPrefix(id)}${Date.now()}.json`, data)
      const blobs = (await listAll(historyPrefix(id))).sort((a, b) => a.pathname.localeCompare(b.pathname))
      const old = blobs.slice(0, Math.max(0, blobs.length - KEEP_VERSIONS))
      if (old.length) {
        const { del } = await api()
        await del(old.map((b) => b.url))
      }
    },
    async listHistory(id) {
      return (await listAll(historyPrefix(id)))
        .map((b) => Number(path.basename(b.pathname, ".json")))
        .filter(Number.isFinite)
        .sort((a, b) => b - a)
    },
    readHistory: (id, version) => readJsonBlob(`${historyPrefix(id)}${version}.json`),

    async saveUpload({ buffer, filename, contentType }) {
      const { put } = await api()
      const { url } = await put(`uploads/${filename}`, buffer, { access: ACCESS, contentType, addRandomSuffix: true })
      return url
    },
    // no readCreds / writeCreds / secret: on Vercel the password comes from ADMIN_PASSWORD
  }
}
