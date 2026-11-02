import type { MenuItem } from '@/lib/menu'

type Tone = MenuItem['tone']

const PALETTE: Record<Tone, { a: string; b: string; glow: string }> = {
  beef: { a: '#6B2A16', b: '#A8472A', glow: '#F26B1D' },
  chicken: { a: '#B9772F', b: '#E0A55A', glow: '#E8B04A' },
  goat: { a: '#4E1D12', b: '#85381F', glow: '#C22F1B' },
  fish: { a: '#A06A43', b: '#D09A6A', glow: '#E8B04A' },
  special: { a: '#6B2A16', b: '#E0A55A', glow: '#F26B1D' },
}

/** Illustrated grill-top scene for a menu card. */
export function Skewer({ tone, className }: { tone: Tone; className?: string }) {
  const p = PALETTE[tone]
  const id = `sk-${tone}`
  const chunks = tone === 'special' ? ['#6B2A16', '#E0A55A', '#4E1D12', '#A8472A', '#E0A55A'] : [p.a, p.b, p.a, p.b, p.a]
  return (
    <svg viewBox="0 0 320 150" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="100%" r="80%">
          <stop offset="0" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1D15" />
          <stop offset="1" stopColor="#1A120D" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" fill={`url(#${id}-bg)`} />
      <rect width="320" height="150" fill={`url(#${id}-glow)`} />
      {/* embers */}
      {[28, 70, 118, 206, 250, 292].map((x, i) => (
        <circle key={x} cx={x} cy={118 - ((i * 17) % 60)} r={1.4 + (i % 2)} fill="#FFB877" opacity={0.55} />
      ))}
      {/* grill bars */}
      <g stroke="#0E0906" strokeWidth="5" opacity="0.9">
        <line x1="0" y1="132" x2="320" y2="132" />
        <line x1="0" y1="146" x2="320" y2="146" />
      </g>
      {/* flames */}
      <g className="origin-bottom">
        {[40, 90, 150, 210, 270].map((x, i) => (
          <path
            key={x}
            d={`M${x} 132 C ${x - 12} 112, ${x - 4} 100, ${x} 88 C ${x + 4} 100, ${x + 12} 112, ${x} 132 Z`}
            fill={i % 2 ? '#E2402A' : '#F26B1D'}
            opacity="0.75"
          />
        ))}
      </g>
      {/* skewers */}
      {[0, 1].map((row) => (
        <g key={row} transform={`translate(${row ? 24 : 0} ${row ? 22 : 0}) rotate(-8 160 ${70 + row * 8})`}>
          <line x1="30" y1={70 + row * 8} x2="296" y2={70 + row * 8} stroke="#D9B98A" strokeWidth="3" strokeLinecap="round" />
          {chunks.map((fill, i) => (
            <g key={i}>
              <rect x={60 + i * 44} y={50 + row * 8} width="40" height="40" rx="13" fill={fill} />
              <rect x={64 + i * 44} y={53 + row * 8} width="22" height="9" rx="4.5" fill="#fff" opacity="0.1" />
              <circle cx={72 + i * 44} cy={74 + row * 8} r="2" fill="#F2CE7B" />
              <circle cx={84 + i * 44} cy={64 + row * 8} r="1.6" fill="#F2CE7B" />
              <circle cx={90 + i * 44} cy={80 + row * 8} r="1.8" fill="#C22F1B" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  )
}
