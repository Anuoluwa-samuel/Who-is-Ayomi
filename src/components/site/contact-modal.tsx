import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent } from "react"
import { createPortal } from "react-dom"
import { Check, Loader2, Mail, Send, X } from "lucide-react"
import { profile } from "@/data/portfolio"

const PROJECT_TYPES = ["New website", "Web app / dashboard", "Redesign", "Something else"]

const ContactModalContext = createContext<{ open: () => void }>({ open: () => {} })
export const useContactModal = () => useContext(ContactModalContext)

/** Wrap the app once; any button can then call `useContactModal().open()` to show the "Hire me" popup. */
export function ContactModalProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false) // in the DOM (kept a moment after closing for the exit animation)
  const [visible, setVisible] = useState(false)
  const lastFocus = useRef<HTMLElement | null>(null)

  const open = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  const close = useCallback(() => {
    setVisible(false)
    window.setTimeout(() => {
      setMounted(false)
      lastFocus.current?.focus?.()
    }, 300)
  }, [])

  return (
    <ContactModalContext.Provider value={{ open }}>
      {children}
      {mounted && createPortal(<ContactDialog visible={visible} onClose={close} />, document.body)}
    </ContactModalContext.Provider>
  )
}

type Status = "idle" | "sending" | "sent" | "mailto" | "error"

function ContactDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: "", email: "", type: PROJECT_TYPES[0], message: "", company: "" })
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState("")

  // lock page scroll, focus the first field, close on Esc, keep Tab inside the dialog
  useEffect(() => {
    document.documentElement.classList.add("modal-open")
    const focusTimer = window.setTimeout(() => firstField.current?.focus(), 120)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose()
      if (e.key !== "Tab" || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    addEventListener("keydown", onKey)
    return () => {
      clearTimeout(focusTimer)
      removeEventListener("keydown", onKey)
      document.documentElement.classList.remove("modal-open")
    }
  }, [onClose])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const openMailApp = () => {
    const subject = `Project enquiry — ${form.type}`
    const body = `Hi ${profile.name.split(" ")[0]},\n\n${form.message}\n\n— ${form.name} (${form.email})`
    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === "sending") return
    setStatus("sending")
    setError("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const isJson = (res.headers.get("content-type") ?? "").includes("json")
      const data = isJson ? await res.json() : null

      if (res.ok && data?.ok) return setStatus("sent")
      // email sending isn't set up (or there's no server at all): hand the message to the visitor's email app instead
      if (!isJson || data?.fallback || res.status === 404 || res.status === 405) {
        setStatus("mailto")
        return openMailApp()
      }
      setError(data?.error || "Something went wrong. Please try again.")
      setStatus("error")
    } catch {
      setStatus("mailto")
      openMailApp()
    }
  }

  const done = status === "sent" || status === "mailto"

  return (
    <div
      className="modal-overlay"
      data-open={visible}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panel}
        className="contact-modal glass glass--liquid"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cm-title"
      >
        <button type="button" className="cm-close" aria-label="Close" onClick={onClose}><X /></button>

        {done ? (
          <div className="cm-done">
            <span className="cm-done__icon">{status === "sent" ? <Check /> : <Mail />}</span>
            <h2 id="cm-title">{status === "sent" ? <>Message <em>sent</em></> : <>Almost <em>there</em></>}</h2>
            {status === "sent" ? (
              <p>Thank you, {form.name.split(" ")[0]}! I'll reply to <b>{form.email}</b> as soon as I can.</p>
            ) : (
              <p>Your email app should open with the message ready to send. If nothing happens, write to me at <a href={`mailto:${profile.email}`}><b>{profile.email}</b></a>.</p>
            )}
            <button type="button" className="btn btn--primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate={false}>
            <span className="tag glass"><i className="pulse" />Hire me</span>
            <h2 id="cm-title">Let's build something <em>together</em></h2>
            <p className="cm-lead">Tell me about your project and I'll get back to you by email.</p>

            <div className="cm-row">
              <label className="cm-field">
                <span>Your name</span>
                <input ref={firstField} className="cm-input" required maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} placeholder="Jane Doe" />
              </label>
              <label className="cm-field">
                <span>Your email</span>
                <input className="cm-input" type="email" required maxLength={200} autoComplete="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" />
              </label>
            </div>

            <label className="cm-field">
              <span>What do you need?</span>
              <select className="cm-input" value={form.type} onChange={set("type")}>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>

            <label className="cm-field">
              <span>Tell me about it</span>
              <textarea className="cm-input" required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={set("message")} placeholder="What are you building, and when do you need it?" />
            </label>

            {/* honeypot: real people never see or fill this */}
            <input className="cm-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="company" value={form.company} onChange={set("company")} />

            {status === "error" && <p className="cm-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn--primary btn--lg cm-submit" disabled={status === "sending"}>
              {status === "sending" ? <><Loader2 className="ico cm-spin" /> Sending…</> : <>Send message <Send className="ico" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
