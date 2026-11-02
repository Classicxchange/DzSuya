interface LogoProps {
  size?: number
  className?: string
}

/** Shop mark: a flame-grilled skewer inside a gold-ringed badge. */
export function Logo({ size = 44, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="DzSuya logo">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8A3D" />
          <stop offset="1" stopColor="#B13F08" />
        </linearGradient>
        <linearGradient id="logo-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE3A6" />
          <stop offset="1" stopColor="#F2CE7B" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#logo-bg)" stroke="#E8B04A" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="rgba(255,248,236,0.35)" strokeWidth="1" strokeDasharray="2 3" />
      <path
        d="M32 46c-6.5 0-10.5-4.2-10.5-9.4 0-3.7 2.1-6.2 4.1-8.4 1.4-1.6 2-3.2 1.8-5.2 3.7 1.5 6.2 4.6 6.4 8.2 1.3-.9 2-2.4 2-4.2 3 2.3 5.2 5.6 5.2 9.4C41 41.9 37.6 46 32 46z"
        fill="url(#logo-flame)"
        opacity="0.95"
      />
      <g transform="rotate(-32 32 30)">
        <line x1="12" y1="30" x2="52" y2="30" stroke="#2A1608" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="19" y="24.5" width="8" height="11" rx="3" fill="#5A2412" />
        <rect x="28" y="24" width="8" height="12" rx="3" fill="#7A3419" />
        <rect x="37" y="24.5" width="8" height="11" rx="3" fill="#5A2412" />
        <circle cx="23" cy="28" r="1" fill="#F2CE7B" />
        <circle cx="32" cy="27.5" r="1" fill="#F2CE7B" />
        <circle cx="41" cy="28.5" r="1" fill="#F2CE7B" />
      </g>
    </svg>
  )
}
