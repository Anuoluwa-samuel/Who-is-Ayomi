/** Painted pastel thumbnails. Swap for real screenshots via <img> in projects.tsx when ready. */

export function BloomArt() {
  return (
    <svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="a1bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8ecff" /><stop offset=".55" stopColor="#b9c5ff" /><stop offset="1" stopColor="#5b6bff" />
        </linearGradient>
        <radialGradient id="a1s" cx=".3" cy=".25" r=".85">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".45" stopColor="#e8ecff" stopOpacity=".45" /><stop offset="1" stopColor="#2d3fd0" stopOpacity=".6" />
        </radialGradient>
        <filter id="a1b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
      </defs>
      <rect width="300" height="180" fill="url(#a1bg)" />
      <g filter="url(#a1b)">
        <circle cx="50" cy="30" r="52" fill="#fff" opacity=".6" />
        <circle cx="262" cy="158" r="62" fill="#4557f0" opacity=".55" />
        <circle cx="240" cy="30" r="34" fill="#dbe2ff" opacity=".7" />
      </g>
      <circle cx="150" cy="92" r="58" fill="url(#a1s)" stroke="#fff" strokeOpacity=".85" strokeWidth="1.5" />
      <ellipse cx="128" cy="66" rx="20" ry="11" fill="#fff" opacity=".7" transform="rotate(-30 128 66)" />
      <circle cx="150" cy="92" r="82" fill="none" stroke="#fff" strokeOpacity=".7" strokeDasharray="2 7" />
      <rect x="200" y="112" width="76" height="34" rx="17" fill="#fff" fillOpacity=".4" stroke="#fff" strokeOpacity=".9" />
      <rect x="214" y="126" width="34" height="5" rx="2.5" fill="#00008B" opacity=".7" />
      <circle cx="40" cy="128" r="14" fill="#fff" fillOpacity=".45" stroke="#fff" strokeOpacity=".9" />
    </svg>
  )
}

export function RippleArt() {
  return (
    <svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="a2bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0f3ff" /><stop offset=".6" stopColor="#d4dcff" /><stop offset="1" stopColor="#dfe6ff" />
        </linearGradient>
        <radialGradient id="a2c" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="a2b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="300" height="180" fill="url(#a2bg)" />
      <g filter="url(#a2b)">
        <circle cx="250" cy="30" r="46" fill="#9aa8ff" opacity=".8" />
        <circle cx="30" cy="160" r="52" fill="#dbe2ff" opacity=".7" />
      </g>
      <circle cx="150" cy="90" r="80" fill="url(#a2c)" opacity=".7" />
      <g fill="none" stroke="#fff" strokeOpacity=".85">
        <circle cx="150" cy="90" r="20" />
        <circle cx="150" cy="90" r="38" strokeOpacity=".7" />
        <circle cx="150" cy="90" r="58" strokeOpacity=".5" />
        <circle cx="150" cy="90" r="80" strokeOpacity=".3" />
      </g>
      <rect x="96" y="60" width="108" height="60" rx="14" fill="#fff" fillOpacity=".42" stroke="#fff" strokeOpacity=".95" />
      <circle cx="116" cy="82" r="8" fill="#00008B" opacity=".85" />
      <path d="m112.5 82 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="132" y="76" width="56" height="5" rx="2.5" fill="#5a6699" opacity=".55" />
      <rect x="132" y="88" width="38" height="4" rx="2" fill="#5a6699" opacity=".3" />
      <rect x="110" y="102" width="80" height="4" rx="2" fill="#fff" opacity=".8" />
    </svg>
  )
}

export function AuroraArt() {
  return (
    <svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="a3bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05071a" /><stop offset=".6" stopColor="#0a1030" /><stop offset="1" stopColor="#101a4a" />
        </linearGradient>
        <linearGradient id="a3w1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b6bff" stopOpacity=".2" /><stop offset=".5" stopColor="#c8d2ff" stopOpacity=".95" /><stop offset="1" stopColor="#5b6bff" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id="a3w2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5b6bff" stopOpacity=".7" /><stop offset="1" stopColor="#b9c5ff" stopOpacity=".4" />
        </linearGradient>
        <filter id="a3b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
      </defs>
      <rect width="300" height="180" fill="url(#a3bg)" />
      <g filter="url(#a3b)">
        <circle cx="60" cy="40" r="44" fill="#5b6bff" opacity=".3" />
        <circle cx="250" cy="150" r="56" fill="#5b6bff" opacity=".28" />
      </g>
      <path d="M0 120C50 80 90 150 150 108S250 70 300 100V180H0z" fill="url(#a3w2)" />
      <path d="M0 140C60 110 100 170 160 132S250 100 300 126V180H0z" fill="#5b6bff" fillOpacity=".22" />
      <path d="M-4 118C50 80 90 150 150 108S250 70 304 100" fill="none" stroke="url(#a3w1)" strokeWidth="2.5" />
      <rect x="26" y="26" width="92" height="46" rx="14" fill="#fff" fillOpacity=".08" stroke="#5b6bff" strokeOpacity=".55" />
      <rect x="38" y="38" width="30" height="4" rx="2" fill="#fff" opacity=".4" />
      <rect x="38" y="50" width="52" height="8" rx="4" fill="#5b6bff" />
      <circle cx="238" cy="52" r="20" fill="#fff" fillOpacity=".08" stroke="#5b6bff" strokeOpacity=".55" />
      <circle cx="238" cy="52" r="10" fill="none" stroke="#5b6bff" strokeWidth="3" strokeDasharray="40 24" />
    </svg>
  )
}

export const projectArt = { bloom: BloomArt, ripple: RippleArt, aurora: AuroraArt } as const
