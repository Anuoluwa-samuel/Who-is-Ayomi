import { useState } from "react"
import { Moon, Sun } from "lucide-react"

/** Light / dark switch. The theme lives on <html data-theme> (set before first paint in index.html). */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark")

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? "dark" : "light"
    try { localStorage.setItem("theme", next ? "dark" : "light") } catch { /* private mode */ }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="theme-toggle"
      onClick={toggle}
    >
      <span className="theme-toggle__knob">
        <Sun className="theme-toggle__sun" />
        <Moon className="theme-toggle__moon" />
      </span>
    </button>
  )
}
