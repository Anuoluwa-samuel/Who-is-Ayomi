"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import "./motion-typewriter-utils/index.css"

const monospace: React.CSSProperties = {
  fontFamily: `"Geist Mono", monospace`,
}

const cursor: React.CSSProperties = {
  background: "var(--hue-1)",
  width: 2,
}

export function TypewriterExample({
  text = "Hello world!",
  as: Tag = "h2",
  className = "",
  style,
  speed = 70,
  start = true,
  loopEvery = 0,
  eraseSpeed = 28,
  onRoundStart,
}: {
  text?: string
  /** element to render (use "span" inside another heading) */
  as?: "h1" | "h2" | "h3" | "p" | "span"
  className?: string
  /** overrides the default font etc. */
  style?: React.CSSProperties
  /** milliseconds per character */
  speed?: number
  /** hold the typing until this is true (e.g. until an intro screen has finished) */
  start?: boolean
  /** type it out again every N milliseconds (0 = type once). Each round: type → hold → erase → type… */
  loopEvery?: number
  /** milliseconds per character while erasing */
  eraseSpeed?: number
  /** called each time a new round of typing begins (round 1, 2, 3…) — handy for changing the look every time */
  onRoundStart?: (round: number) => void
}) {
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<"typing" | "erasing">("typing")
  const roundStart = useRef<number | null>(null)
  const round = useRef(0)
  const roundCallback = useRef(onRoundStart)
  roundCallback.current = onRoundStart
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!start || reduceMotion) return
    let timer: number

    if (phase === "typing") {
      if (roundStart.current === null) roundStart.current = performance.now()
      if (count < text.length) {
        timer = window.setTimeout(() => setCount((value) => value + 1), speed)
      } else if (loopEvery > 0) {
        // fully typed: hold, then start erasing so the next round begins exactly `loopEvery` after this one did
        const eraseTime = text.length * eraseSpeed
        const wait = Math.max(0, roundStart.current + loopEvery - eraseTime - performance.now())
        timer = window.setTimeout(() => setPhase("erasing"), wait)
      }
    } else if (count > 0) {
      timer = window.setTimeout(() => setCount((value) => value - 1), eraseSpeed)
    } else {
      // erased: the next round is scheduled from the *planned* start, so timer slack never accumulates
      const next = (roundStart.current ?? performance.now()) + loopEvery
      roundStart.current = next
      timer = window.setTimeout(() => {
        round.current += 1
        roundCallback.current?.(round.current)
        setPhase("typing")
      }, Math.max(0, next - performance.now()))
    }

    return () => window.clearTimeout(timer)
  }, [count, phase, text, speed, start, loopEvery, eraseSpeed, reduceMotion])

  // people who prefer reduced motion get the full text at once and a steady caret
  const shown = reduceMotion ? text : text.slice(0, count)

  return (
    <Tag className={`typewriter ${className}`.trim()} style={{ ...monospace, ...style }}>
      {shown}
      <motion.span
        aria-hidden
        className="typewriter-caret"
        style={cursor}
        animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 0, 1] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
      />
    </Tag>
  )
}

export default TypewriterExample
