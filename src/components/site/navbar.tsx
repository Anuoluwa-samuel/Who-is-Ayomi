import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { navLinks, profile } from "@/data/portfolio"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useContactModal } from "./contact-modal"

/** Floating glass pill nav with a liquid highlight that follows the active / hovered link. */
export function Navbar() {
  const contact = useContactModal()
  const [active, setActive] = useState<string>(navLinks[0].id)
  const [hovered, setHovered] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pill, setPill] = useState({ x: 0, w: 0, show: false })
  const listRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  // scroll-spy
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    )
    navLinks.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  // position the pill under the target link
  const target = hovered ?? active
  useLayoutEffect(() => {
    const place = () => {
      const a = linkRefs.current[target]
      const list = listRef.current
      if (!a || !list) return
      const r = a.getBoundingClientRect()
      const p = list.getBoundingClientRect()
      setPill({ x: r.left - p.left, w: r.width, show: r.width > 0 })
    }
    place()
    addEventListener("resize", place)
    document.fonts?.ready.then(place)
    return () => removeEventListener("resize", place)
  }, [target])

  return (
    <header className="nav glass glass--liquid" id="top">
      <a href="#home" className="logo" aria-label="Home">
        <span className="logo__mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m8 7-5 5 5 5" /><path d="m16 7 5 5-5 5" /><path d="m14 4-4 16" />
          </svg>
        </span>
        <span className="logo__name">{profile.name}</span>
        <span className="logo__short">{profile.initials}</span>
      </a>

      <nav
        ref={listRef}
        className={cn("nav__links", open && "open")}
        aria-label="Primary"
        onPointerLeave={() => setHovered(null)}
      >
        <i
          className="nav__pill"
          aria-hidden="true"
          style={{ width: pill.w, transform: `translateX(${pill.x}px)`, opacity: pill.show ? 1 : 0 }}
        />
        {navLinks.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            ref={(el) => { linkRefs.current[id] = el }}
            className={cn(active === id && "active")}
            onPointerEnter={() => setHovered(id)}
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}
        {/* the desktop Hire Me button is hidden on small screens, so the menu carries one too */}
        <button type="button" className="btn btn--primary nav__hire" onClick={() => { setOpen(false); contact.open() }}>
          Hire me <ArrowUpRight className="ico" />
        </button>
      </nav>

      <div className="nav__actions">
        <ThemeToggle />
        <button type="button" className="btn btn--primary btn--sm nav__cta magnetic" onClick={contact.open}>
          Hire Me <ArrowUpRight className="ico" />
        </button>
        <button
          className="nav__toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span />
        </button>
      </div>
    </header>
  )
}
