// Vercel serverless function: the whole admin API. vercel.json rewrites /api/* here.
// Data lives in Vercel Blob (connect a PUBLIC Blob store to the project); the admin password is ADMIN_PASSWORD.

import { createApp } from "../server/app.js"
import { createBlobStorage } from "../server/storage-blob.js"

export default createApp({ storage: createBlobStorage(), isProd: true })
