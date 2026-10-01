import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/** Open/close state for a dialog, kept mounted a moment after closing so it can animate out. */
export function useGlassDialog() {
  const [mounted, setMounted] = useState(false)
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

  return { mounted, visible, open, close }
}

/**
 * Liquid-glass popup over a blurred, lightly tinted page.
 * Locks page scroll, closes on Esc or a click outside, keeps Tab inside, focuses [data-autofocus] (or the panel).
 */
export function GlassDialog({
  mounted,
  visible,
  onClose,
  labelledBy,
  className,
  children,
}: {
  mounted: boolean
  visible: boolean
  onClose: () => void
  labelledBy: string
  className?: string
  children: React.ReactNode
}) {
  if (!mounted) return null
  return createPortal(
    <DialogFrame visible={visible} onClose={onClose} labelledBy={labelledBy} className={className}>{children}</DialogFrame>,
    document.body,
  )
}

function DialogFrame({ visible, onClose, labelledBy, className, children }: { visible: boolean; onClose: () => void; labelledBy: string; className?: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.add("modal-open")
    const focusTimer = window.setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current
      target?.focus({ preventScroll: true }) // keep the popup's top (and close button) in view
      panel.current?.parentElement?.scrollTo({ top: 0 })
    }, 120)
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

  return (
    <div className="modal-overlay" data-open={visible} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} tabIndex={-1} className={cn("glass-dialog glass", className)} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button type="button" className="cm-close" aria-label="Close" onClick={onClose}><X /></button>
        {children}
      </div>
    </div>
  )
}
