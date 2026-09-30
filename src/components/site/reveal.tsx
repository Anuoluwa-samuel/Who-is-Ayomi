import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react"
import { cn } from "@/lib/utils"
import { useInView } from "@/hooks/use-in-view"

/** Typed helper for CSS custom properties in `style`. */
export const cssVars = (vars: Record<`--${string}`, string | number>) => vars as CSSProperties

type RevealProps<T extends ElementType> = {
  as?: T
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">

/** Blur-and-rise entrance the first time the element scrolls into view. */
export function Reveal<T extends ElementType = "div">({ as, className, ...rest }: RevealProps<T>) {
  const Tag: ElementType = as ?? "div"
  const [ref, inView] = useInView<HTMLElement>()
  return <Tag ref={ref} className={cn("reveal", inView && "in", className)} {...rest} />
}
