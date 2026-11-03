import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Fades a section in as it scrolls into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 160, damping: 24, delay }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="eyebrow text-ember-400">{eyebrow}</div>
      <h2 className="display mt-2 text-3xl font-bold leading-[1.05] text-cream-50 text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-base text-cream-200/80 text-pretty">{body}</p>}
    </div>
  )
}
