import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Check, Download, ExternalLink, History, Loader2, LogOut, PanelRight, Save } from "lucide-react"
import { api, ApiError, type Content } from "./api"
import { Fields } from "./fields"
import { sections } from "./schema"

type Obj = Record<string, unknown>
type Auth = "loading" | "offline" | "unconfigured" | "login" | "setup" | "authed"

const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#00008B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1616b0] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
const ghost =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
const input =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#00008B] focus:ring-4 focus:ring-[#00008B]/10"

/* ------------------------------------------------------------------ login / first-time setup */
function AuthScreen({ mode, onDone }: { mode: "login" | "setup"; onDone: () => void }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const setup = mode === "setup"

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (setup && password !== confirm) return setError("The two passwords don't match")
    setBusy(true)
    try {
      await (setup ? api.setup(password) : api.login(password))
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
        <div className="mb-1 grid size-11 place-items-center rounded-xl bg-[#00008B] text-white">
          <Save className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-neutral-900" style={{ fontFamily: "var(--font-sans)" }}>
          {setup ? "Create your admin password" : "Site admin"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {setup ? "This is a one-time step. Only you will be able to edit the site." : "Sign in to edit your portfolio."}
        </p>
        <div className="mt-5 space-y-3">
          <input className={input} type="password" autoFocus autoComplete={setup ? "new-password" : "current-password"} placeholder={setup ? "New password (8+ characters)" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          {setup && <input className={input} type="password" autoComplete="new-password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button className={`${primary} mt-5 w-full`} disabled={busy || !password}>
          {busy && <Loader2 className="size-4 animate-spin" />} {setup ? "Create password & sign in" : "Sign in"}
        </button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ dashboard */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [saved, setSaved] = useState<Content>({})
  const [drafts, setDrafts] = useState<Content>({})
  const [active, setActive] = useState(sections[0].id)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [preview, setPreview] = useState(true)
  const [versions, setVersions] = useState<number[] | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)

  const section = sections.find((s) => s.id === active)!
  const draft = (drafts[active] ?? saved[active] ?? {}) as Obj
  const isDirty = useCallback((id: string) => id in drafts && JSON.stringify(drafts[id]) !== JSON.stringify(saved[id]), [drafts, saved])
  const dirty = isDirty(active)
  const anyDirty = useMemo(() => sections.some((s) => isDirty(s.id)), [isDirty])

  useEffect(() => {
    api.content().then(setSaved).catch((e) => setNotice({ text: e.message, error: true }))
  }, [])

  // warn before closing with unsaved edits
  useEffect(() => {
    if (!anyDirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    addEventListener("beforeunload", warn)
    return () => removeEventListener("beforeunload", warn)
  }, [anyDirty])

  const flash = (text: string, error = false) => {
    setNotice({ text, error })
    setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 3500)
  }

  const save = useCallback(async () => {
    if (!isDirty(active)) return
    setSaving(true)
    try {
      const result = await api.save(active, drafts[active])
      setSaved((s) => ({ ...s, [active]: drafts[active] as Obj }))
      setVersions(null)
      flash(result.rebuilding ? "Saved — live now · Google & link previews refresh in ~1 min" : "Saved — your site is updated")
      frame.current?.contentWindow?.location.reload()
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return onLogout()
      flash(e instanceof Error ? e.message : "Couldn't save", true)
    } finally {
      setSaving(false)
    }
  }, [active, drafts, isDirty, onLogout])

  // Cmd/Ctrl + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void save() }
    }
    addEventListener("keydown", onKey)
    return () => removeEventListener("keydown", onKey)
  }, [save])

  const discard = () => setDrafts((d) => { const n = { ...d }; delete n[active]; return n })

  const loadHistory = async () => {
    try { setVersions((await api.history(active)).versions) } catch (e) { flash(e instanceof Error ? e.message : "Couldn't load history", true) }
  }
  const restore = async (v: number) => {
    if (!confirm("Restore this earlier version? Your current content is kept in history too.")) return
    try {
      const { data } = await api.restore(active, v)
      setSaved((s) => ({ ...s, [active]: data }))
      discard()
      setVersions(null)
      flash("Earlier version restored")
      frame.current?.contentWindow?.location.reload()
    } catch (e) { flash(e instanceof Error ? e.message : "Couldn't restore", true) }
  }

  const choose = (id: string) => setActive(id)
  const logout = async () => {
    if (anyDirty && !confirm("You have unsaved changes. Sign out anyway?")) return
    await api.logout().catch(() => {})
    onLogout()
  }

  const ready = active in saved

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900" style={{ fontFamily: "var(--font-sans)" }}>
      {/* top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-[#00008B] text-white"><Save className="size-4" /></div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Site admin</div>
            <div className="hidden text-xs text-neutral-500 sm:block">{anyDirty ? "Unsaved changes" : "All changes saved"}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <a className={ghost} href="/" target="_blank" rel="noreferrer" aria-label="View site"><ExternalLink className="size-4" /><span className="hidden sm:inline">View site</span></a>
          <div className="hidden xl:block"><button className={ghost} onClick={() => setPreview((p) => !p)}><PanelRight className="size-4" />{preview ? "Hide" : "Show"} preview</button></div>
          <div className="hidden sm:block"><a className={ghost} href="/api/admin/export"><Download className="size-4" />Backup</a></div>
          <button className={ghost} onClick={logout} aria-label="Sign out"><LogOut className="size-4" /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-0 lg:gap-6 lg:px-6">
        {/* section navigation */}
        <nav className="sticky top-[57px] z-20 hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto py-6 lg:block">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">Sections</p>
          {sections.map((s) => (
            <button key={s.id} onClick={() => choose(s.id)} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${s.id === active ? "bg-[#00008B] text-white" : "text-neutral-700 hover:bg-neutral-200/60"}`}>
              {s.label}
              {isDirty(s.id) && <span className={`size-2 rounded-full ${s.id === active ? "bg-white" : "bg-amber-500"}`} />}
            </button>
          ))}
        </nav>

        {/* editor */}
        <main className="min-w-0 flex-1 px-4 pb-32 pt-4 lg:px-0 lg:pt-6">
          <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-3 py-2 lg:hidden">
            {sections.map((s) => (
              <button key={s.id} onClick={() => choose(s.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium ${s.id === active ? "bg-[#00008B] text-white" : "bg-neutral-100 text-neutral-700"}`}>
                {s.label.split(" ")[0]}{isDirty(s.id) ? " •" : ""}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">{section.label}</h2>
            <p className="mb-6 mt-1 text-sm text-neutral-500">{section.blurb}</p>

            {!ready ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="size-4 animate-spin" /> Loading…</div>
            ) : (
              <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
                <Fields fields={section.fields} value={draft} onChange={(v) => setDrafts((d) => ({ ...d, [active]: v }))} />
              </div>
            )}

            {/* history */}
            <div className="mt-6">
              {versions === null ? (
                <button className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800" onClick={loadHistory}><History className="size-4" /> Version history</button>
              ) : versions.length === 0 ? (
                <p className="text-sm text-neutral-500">No earlier versions yet — one is kept every time you save.</p>
              ) : (
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="mb-2 text-sm font-semibold">Earlier versions</p>
                  <ul className="space-y-1">
                    {versions.map((v) => (
                      <li key={v} className="flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-neutral-50">
                        <span>{new Date(v).toLocaleString()}</span>
                        <button className="font-medium text-[#00008B] hover:underline" onClick={() => restore(v)}>Restore</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* live preview */}
        {preview && (
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-[400px] shrink-0 py-6 xl:block 2xl:w-[460px]">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-sm">
              <div className="border-b border-neutral-200 bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">Live preview · updates when you save</div>
              <iframe ref={frame} title="Site preview" src="/?preview=1" className="w-full flex-1 border-0" />
            </div>
          </aside>
        )}
      </div>

      {/* save bar */}
      <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur transition-transform ${dirty ? "translate-y-0" : "translate-y-full"}`}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 lg:ml-[calc(15rem+1.5rem+max(0px,(100vw-1600px)/2))] xl:mr-[440px]">
          <span className="text-sm text-neutral-600">You have unsaved changes in <b>{section.label}</b></span>
          <div className="flex gap-2">
            <button className={ghost} onClick={discard} disabled={saving}>Discard</button>
            <button className={primary} onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save changes</button>
          </div>
        </div>
      </div>

      {/* toast */}
      {notice && (
        <div role="status" className={`fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${notice.error ? "bg-red-600" : "bg-neutral-900"}`}>
          {!notice.error && <Check className="size-4 text-emerald-400" />} {notice.text}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ root */
export function Admin() {
  const [auth, setAuth] = useState<Auth>("loading")

  const check = useCallback(async () => {
    try {
      const me = await api.me()
      setAuth(me.authed ? "authed" : me.passwordSet ? "login" : me.canSetup ? "setup" : "unconfigured")
    } catch {
      setAuth("offline")
    }
  }, [])

  useEffect(() => { void check() }, [check])
  useEffect(() => { document.title = "Site admin" }, [])

  if (auth === "loading") return <div className="grid min-h-screen place-items-center bg-neutral-50"><Loader2 className="size-6 animate-spin text-neutral-400" /></div>
  if (auth === "offline")
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold">The admin server isn't running</h1>
          <p className="mt-2 text-sm text-neutral-600">Start the site and admin together with <code className="rounded bg-neutral-200 px-1.5 py-0.5">npm run dev</code>, then reload this page.</p>
          <button className={`${primary} mt-4`} onClick={() => { setAuth("loading"); void check() }}>Try again</button>
        </div>
      </div>
    )
  if (auth === "unconfigured")
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-lg font-semibold">The admin isn't set up yet</h1>
          <p className="mt-2 text-sm text-neutral-600">Set the <code className="rounded bg-neutral-200 px-1.5 py-0.5">ADMIN_PASSWORD</code> environment variable on the server, restart it, then reload this page.</p>
        </div>
      </div>
    )
  if (auth === "login" || auth === "setup") return <AuthScreen mode={auth} onDone={() => setAuth("authed")} />
  return <Dashboard onLogout={() => setAuth("login")} />
}
