import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root')!)

async function loadContent() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2500)
    // the admin's live preview (?preview) always asks for the newest content; visitors may get a short CDN cache
    const fresh = new URLSearchParams(location.search).has('preview') ? '?fresh=1' : ''
    const res = await fetch('/api/content' + fresh, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
      ;(globalThis as { __CONTENT__?: unknown }).__CONTENT__ = await res.json()
    }
  } catch {
    /* no server: the bundled defaults are used */
  }
}

async function boot() {
  if (location.pathname.startsWith('/admin')) {
    document.documentElement.classList.remove('intro-active') // the intro overlay belongs to the public site
    const { Admin } = await import('./admin/admin')
    root.render(<StrictMode><Admin /></StrictMode>)
    return
  }
  await loadContent() // must finish before the app modules are evaluated
  const { default: App } = await import('./App.tsx')
  root.render(<StrictMode><App /></StrictMode>)
}

void boot()
