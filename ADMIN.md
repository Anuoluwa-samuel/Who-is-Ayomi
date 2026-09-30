# Editing your site (built-in admin)

Your site has its own admin at **`/admin`** — one password, just you. No code, no third-party editor.

## Use it locally

```bash
npm run dev
```

1. Open <http://localhost:5173/admin>.
2. **First time only:** create your admin password (8+ characters).
3. Pick a section on the left, edit the form, press **Save changes** (or Cmd/Ctrl + S).
   The live preview on the right updates immediately, and so does the site.

What you can edit: name & contact details, photo and CV, the loading screen, hero text and buttons,
About text and numbers, every skill, every project (with screenshots), the testimonial and social links.
Upload images and your CV straight from the forms — big photos are shrunk automatically in your browser.

Tips
- Put *stars* around words in headings to make them the italic accent: `Technologies I *master*`.
- Icons use [devicon](https://devicon.dev) names (`react`, `nodejs`, `python`, `figma`…) or an uploaded image.
- Every save keeps the previous version — use **Version history** at the bottom of a section to go back.
- **Backup** (top bar) downloads all your content as one file.
- Colours and layout are still code (`src/styles/portfolio.css`).

`src/content/*.json` are the built-in defaults (used until you save something, and if the server is unreachable).
Locally your edits live in `data/` (ignored by git).

---

## Deploy on Vercel  ✅

The admin API runs as a Vercel function (`api/index.js`) and your edits and uploads are stored in **Vercel Blob**,
so no server or disk is needed.

0. **Carry over your local edits** (one time, only if you already edited locally): `npm run carry-over` copies your saved content
   and uploads (e.g. your CV) into the project so they go live with the first deploy.
1. **Push the project to GitHub.**
2. On <https://vercel.com/new>, **import the repo**. Vercel detects Vite; keep the defaults (`vercel.json` is already set up).
3. **Storage → Create → Blob**, choose a **Public** store (images are shown to visitors), and **connect it to this project**.
   Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
4. **Settings → Environment Variables:** add
   - `ADMIN_PASSWORD` — your admin password (long is good: 16+ characters)
   - optional `SESSION_SECRET` — any long random string (otherwise derived from the password)
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the variables and store are picked up.
6. Open `https://your-site.vercel.app/admin` and sign in.

Notes
- Before you save anything, the public site simply shows the built-in content from the repo.
- Visitors get content cached for ~30 s; the admin and its preview always see the newest version.
- Uploads are limited to **4 MB** (Vercel's request limit); photos are compressed in the browser first. PDFs must be under 4 MB.
- The first-run password screen is **disabled online**; the password only comes from `ADMIN_PASSWORD`.
- Login is rate-limited per server instance and every wrong attempt is delayed; use a long password.
- Vercel's free Hobby plan is meant for personal, non-commercial sites — fine for a portfolio.
- The `data/` folder and `.env` are not deployed (`.vercelignore`).

---

## "Hire me" contact form → your inbox

The **Hire me** button (and **Get In Touch**) opens a popup form. Messages are emailed to you through
[Resend](https://resend.com) (free plan is plenty).

1. Create a free Resend account and copy an **API key** (Resend → API Keys).
2. Set these environment variables (Vercel: *Settings → Environment Variables*, then redeploy; locally: put them in your shell or `.env`):

   | Variable | Value |
   | --- | --- |
   | `RESEND_API_KEY` | your Resend API key |
   | `CONTACT_TO` | the inbox that should receive enquiries (defaults to the **Email** you set in `/admin → General`) |
   | `CONTACT_FROM` | optional sender, e.g. `Portfolio <hello@yourdomain.com>` (needs a domain verified in Resend) |

3. That's it. Replies go straight to the visitor (the message's *Reply-To* is their email).

Notes
- Without a verified domain, Resend only lets its shared test sender (`onboarding@resend.dev`) deliver to **your own Resend account email** — perfect for a personal inbox. Use that email as `CONTACT_TO`.
- Until `RESEND_API_KEY` is set (or while the email is still the `you@example.com` placeholder), the popup **falls back to opening the visitor's email app** with the message pre-filled, so it always works.
- Spam protection: hidden honeypot field, a rate limit of 4 messages / 10 min per visitor, input length limits, and same-site-only posting.
- Set your real email in **/admin → General & loading screen → Email**; it's also what the fallback uses.

## Other hosts (VPS, Render, Railway, Fly…)

```bash
npm ci && npm run build
NODE_ENV=production ADMIN_PASSWORD='your-long-password' DATA_DIR=/var/data/portfolio npm start
```

`DATA_DIR` must be on a **persistent disk**. Serve over HTTPS. Optional: `PORT` (default 8787).
To use Vercel Blob from another host, set `STORAGE=blob` and `BLOB_READ_WRITE_TOKEN`.

## Checks

```bash
npm run test:server   # runs the admin API end-to-end against file storage and a fake Vercel Blob
```
