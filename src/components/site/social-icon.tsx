import { Globe, Mail } from "lucide-react"

export const SOCIAL_LABELS: Record<string, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  instagram: "Instagram",
  youtube: "YouTube",
  website: "Website",
  email: "Email",
}

const filled: Record<string, string> = {
  github:
    "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.4-3.88-1.4-.52-1.34-1.28-1.7-1.28-1.7-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.7 5.38-5.26 5.66.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z",
  linkedin:
    "M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z",
  x: "M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.15l-5.21-6.82-5.97 6.82H1.66l7.73-8.84L1.26 2.25H8.1l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z",
}

const strokeProps = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const

export function SocialIcon({ network }: { network: string }) {
  if (filled[network]) {
    return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={filled[network]} /></svg>
  }
  switch (network) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" {...strokeProps} aria-hidden="true">
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" />
        </svg>
      )
    case "email":
      return <Mail aria-hidden="true" />
    default:
      return <Globe aria-hidden="true" />
  }
}
