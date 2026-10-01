// Build-time renderer: scripts/prerender.mjs sets globalThis.__CONTENT__ and calls render()
// to turn the home page into real HTML (for search engines, link previews and a fast first paint).
import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import App from "./App"

export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
