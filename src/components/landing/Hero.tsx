import { ArrowRight, AtSign, Clock, MapPin, ShieldCheck } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { CHAIN_NAME } from '@/lib/chain'
import { HERO_IMAGE, MENU, PICKUP } from '@/lib/menu'

export type AppTab = 'menu' | 'orders' | 'dzid' | 'seller'

const NAV = [
  { id: 'what', label: 'What it is' },
  { id: 'how', label: 'How it works' },
  { id: 'menu', label: 'Menu' },
  { id: 'dzid', label: 'DZ ID' },
  { id: 'faq', label: 'FAQ' },
]

export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function LandingNav({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-coal-900/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="focus-ring flex items-center gap-2.5 rounded-full" aria-label="DzSuya, back to top">
          <Logo size={40} />
          <span className="display text-xl font-bold text-cream-50">
            Dz<span className="text-ember-400">Suya</span>
          </span>
        </button>
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Page sections">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => scrollToSection(n.id)} className="focus-ring min-h-[44px] rounded-full px-3.5 text-sm font-semibold text-cream-200 hover:text-cream-50">
              {n.label}
            </button>
          ))}
        </nav>
        <button onClick={() => onOpen('menu')} className="btn-primary focus-ring ml-auto min-h-[44px] rounded-full px-5 text-sm">
          Open app
        </button>
      </div>
    </header>
  )
}

export function Hero({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <section className="relative overflow-hidden">
      <img src={HERO_IMAGE} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-coal-950/70 via-coal-900/80 to-coal-900" />
      <div className="pointer-events-none absolute -left-24 top-10 size-80 rounded-full bg-ember-500/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1.5 text-xs font-bold text-gold-300"
          >
            <TokenUSDC variant="branded" size={16} /> Pay in USDC on {CHAIN_NAME}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="display mt-5 text-[44px] font-bold leading-[0.98] text-cream-50 text-balance sm:text-6xl md:text-7xl"
          >
            Real Port Harcourt suya. <span className="text-ember-400">Paid onchain.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-xl text-lg text-cream-200/85 text-pretty"
          >
            DzSuya is Professor Dozzie's charcoal grill on Woji Road, now with a menu you can order from your phone, a receipt that
            lives onchain, and DZ ID: a short name anyone can use to send you USDC instead of a long wallet address.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => onOpen('menu')} className="btn-primary focus-ring flex min-h-[56px] items-center gap-2 rounded-2xl px-6 text-base">
              Order suya <ArrowRight className="size-5" />
            </button>
            <button onClick={() => onOpen('dzid')} className="btn-ghost focus-ring flex min-h-[56px] items-center gap-2 rounded-2xl px-6 text-base">
              <AtSign className="size-5 text-ember-400" /> Claim your DZ ID
            </button>
          </motion.div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-cream-100">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 text-ember-400" /> {PICKUP.address}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 text-ember-400" /> Ready in about 10 to 30 min
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-ember-400" /> Test network, no real money
            </li>
          </ul>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
          {MENU.map((item, i) => (
            <div
              key={item.id}
              className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-card ${i === 0 ? 'col-span-2 aspect-[16/10]' : 'aspect-square'}`}
            >
              <img src={item.image} alt={item.name} loading={i === 0 ? 'eager' : 'lazy'} className="size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8">
                <div className="display text-xs font-bold text-cream-50 sm:text-sm">{item.name}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
