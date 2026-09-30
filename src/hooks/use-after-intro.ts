import { useEffect, useState } from "react"

/** False while the loading screen is up (html.intro-active), true once it has let go. */
export function useAfterIntro() {
  const [done, setDone] = useState(() => !document.documentElement.classList.contains("intro-active"))

  useEffect(() => {
    const root = document.documentElement
    const check = () => setDone(!root.classList.contains("intro-active"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return done
}
