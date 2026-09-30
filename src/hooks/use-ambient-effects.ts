import { useEffect } from "react"

/**
 * Pointer-driven polish for the whole page:
 *  - hero layers drift at different depths (parallax)
 *  - the aurora background and a soft cursor light follow the pointer / scroll
 *  - glass surfaces get a specular highlight under the cursor
 *  - `.magnetic` buttons lean toward the cursor
 * Also flags Chromium so the refractive `.glass--liquid` layer only runs where supported.
 */
export function useAmbientEffects() {
  useEffect(() => {
    const root = document.documentElement
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches

    const uaData = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData
    const chromium = uaData
      ? uaData.brands.some((b) => b.brand === "Chromium")
      : /Chrome\//.test(navigator.userAgent)
    if (chromium) root.classList.add("refract")

    const layers = [...document.querySelectorAll<HTMLElement>(".layer[data-depth]")]
    const aurora = document.querySelector<HTMLElement>(".aurora")
    const glow = document.getElementById("cursorGlow")

    let tx = 0, ty = 0, cx = 0, cy = 0
    let gx = innerWidth / 2, gy = innerHeight / 2, gcx = gx, gcy = gy
    let lastScroll = -1
    let raf = 0

    const frame = () => {
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      gcx += (gx - gcx) * 0.12
      gcy += (gy - gcy) * 0.12

      for (const l of layers) {
        const d = Number(l.dataset.depth)
        l.style.transform = `translate3d(${(cx * d * -16).toFixed(2)}px, ${(cy * d * -12).toFixed(2)}px, 0)`
      }
      if (aurora) aurora.style.transform = `translate3d(${(cx * -18).toFixed(2)}px, ${(-scrollY * 0.05 + cy * -12).toFixed(2)}px, 0)`
      if (glow) glow.style.transform = `translate3d(${gcx.toFixed(1)}px, ${gcy.toFixed(1)}px, 0)`

      const settled =
        Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001 &&
        Math.abs(gx - gcx) < 0.5 && Math.abs(gy - gcy) < 0.5 &&
        scrollY === lastScroll
      lastScroll = scrollY
      raf = settled ? 0 : requestAnimationFrame(frame)
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame) }

    const cleanups: Array<() => void> = []

    if (!reduceMotion) {
      addEventListener("scroll", wake, { passive: true })
      cleanups.push(() => removeEventListener("scroll", wake))
      wake()
    }

    if (finePointer) {
      const onMove = (e: PointerEvent) => {
        gx = e.clientX
        gy = e.clientY
        glow?.classList.add("on")
        if (!reduceMotion) {
          tx = (e.clientX / innerWidth - 0.5) * 2
          ty = (e.clientY / innerHeight - 0.5) * 2
          wake()
        }
        const g = (e.target as Element | null)?.closest?.<HTMLElement>(".glass")
        if (g) {
          const r = g.getBoundingClientRect()
          g.style.setProperty("--mx", `${e.clientX - r.left}px`)
          g.style.setProperty("--my", `${e.clientY - r.top}px`)
        }
      }
      const onLeave = () => glow?.classList.remove("on")
      addEventListener("pointermove", onMove, { passive: true })
      document.addEventListener("pointerleave", onLeave)
      cleanups.push(() => {
        removeEventListener("pointermove", onMove)
        document.removeEventListener("pointerleave", onLeave)
      })

      if (!reduceMotion) {
        document.querySelectorAll<HTMLElement>(".magnetic").forEach((b) => {
          const move = (e: PointerEvent) => {
            const r = b.getBoundingClientRect()
            b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.2}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`
          }
          const leave = () => { b.style.translate = "" }
          b.addEventListener("pointermove", move)
          b.addEventListener("pointerleave", leave)
          cleanups.push(() => {
            b.removeEventListener("pointermove", move)
            b.removeEventListener("pointerleave", leave)
          })
        })
      }
    }

    return () => {
      cancelAnimationFrame(raf)
      cleanups.forEach((fn) => fn())
    }
  }, [])
}
