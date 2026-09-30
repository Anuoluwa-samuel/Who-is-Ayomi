import { Fragment } from "react"

/** CMS text with *emphasis* markers → italic accent word(s), e.g. "Technologies I *master*". */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g)
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}
