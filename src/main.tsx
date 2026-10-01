import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'

const container = document.getElementById('root')!
type Content = Record<string, unknown>
const g = globalThis as { __CONTENT__?: Content }

/** Content the page was prerendered with (embedded by scripts/prerender.mjs). */
function embeddedContent(): Content | undefined {
  const el = document.getElementById('__CONTENT__')
  if (!el?.textContent) return undefined
  try { return JSON.parse(el.textContent) } catch { return undefined }
}

/** Latest content from the admin API (edits show up before the next rebuild). */
async function latestContent(fresh: boolean): Promise<Content | undefined> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2500)
    // the admin's live preview (?preview) always asks for the newest content; visitors may get a short CDN cache
    const res = await fetch('/api/content' + (fresh ? '?fresh=1' : ''), { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return await res.json()
  } catch {
    /* no server: use what the page was built with, or the bundled defaults */
  }
  return undefined
}

async function boot() {
  if (location.pathname.startsWith('/admin')) {
    document.documentElement.classList.remove('intro-active') // the intro overlay belongs to the public site
    const { Admin } = await import('./admin/admin')
    container.replaceChildren()
    createRoot(container).render(<StrictMode><Admin /></StrictMode>)
    return
  }

  const isPreview = new URLSearchParams(location.search).has('preview')
  const embedded = embeddedContent()
  const latest = await latestContent(isPreview)
  g.__CONTENT__ = latest ?? embedded // must be set before the app modules are evaluated

  const { default: App } = await import('./App.tsx')
  const app = <StrictMode><App /></StrictMode>

  // Reuse the prerendered HTML when it was built from the same content; otherwise render fresh.
  const prerendered = embedded !== undefined && container.firstElementChild !== null
  const unchanged = latest === undefined || JSON.stringify(latest) === JSON.stringify(embedded)
  if (prerendered && unchanged && !isPreview) {
    hydrateRoot(container, app)
  } else {
    container.replaceChildren()
    createRoot(container).render(app)
  }
}

void boot()
