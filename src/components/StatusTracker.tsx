import { Check, ChefHat, Flame, ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'

const STEPS = [
  { label: 'Order confirmed', icon: Check },
  { label: 'Preparing', icon: Flame },
  { label: 'Ready for pickup', icon: ShoppingBag },
] as const

interface StatusTrackerProps {
  status: number
  /** Light variant for use on the cream receipt. */
  paper?: boolean
}

/** Live order progress. `status` comes straight from the onchain order. */
export function StatusTracker({ status, paper }: StatusTrackerProps) {
  const current = Math.min(status, 2)
  const ink = paper ? 'text-[#2A1A10]' : 'text-cream-50'
  const dim = paper ? 'text-[#2A1A10]/45' : 'text-cream-300/60'
  return (
    <div>
      <ol className="relative flex items-start justify-between">
        <div className={`absolute left-[16%] right-[16%] top-5 h-0.5 ${paper ? 'bg-[#2A1A10]/10' : 'bg-white/10'}`} />
        <motion.div
          className="absolute left-[16%] top-5 h-0.5 bg-gradient-to-r from-ember-500 to-gold-400"
          initial={false}
          animate={{ width: `${(current / 2) * 68}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {STEPS.map((s, i) => {
          const done = i < current || status >= 3
          const active = i === current && status < 3
          const Icon = s.icon
          return (
            <li key={s.label} className="relative z-10 flex w-1/3 flex-col items-center gap-2 text-center">
              <span
                className={`flex size-10 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-leaf-500 bg-leaf-500 text-white'
                    : active
                      ? 'border-ember-500 bg-ember-500 text-coal-950 shadow-glow'
                      : paper
                        ? 'border-[#2A1A10]/15 bg-[#F6EAD7] text-[#2A1A10]/40'
                        : 'border-white/15 bg-coal-800 text-cream-300/60'
                }`}
              >
                {done ? <Check className="size-5" strokeWidth={3} /> : <Icon className={`size-5 ${active ? 'animate-flicker' : ''}`} />}
              </span>
              <span className={`text-[11px] font-semibold leading-tight ${done || active ? ink : dim}`}>{s.label}</span>
            </li>
          )
        })}
      </ol>
      {status >= 3 && (
        <div className={`mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold ${paper ? 'text-[#2A1A10]/70' : 'text-cream-200'}`}>
          <ChefHat className="size-4" /> Collected. Enjoy your suya.
        </div>
      )}
    </div>
  )
}
