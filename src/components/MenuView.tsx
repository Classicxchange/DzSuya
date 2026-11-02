import { Clock, Flame, MapPin, Plus } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { motion } from 'framer-motion'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Fiat } from '@/components/Fiat'
import { FoodPhoto } from '@/components/FoodPhoto'
import { SHOP_ADDRESS } from '@/lib/chain'
import { usd } from '@/lib/format'
import { HERO_IMAGE, MENU, PICKUP, parseUsdcPrice, type MenuItem } from '@/lib/menu'

export function MenuView({ onPick }: { onPick: (item: MenuItem) => void }) {
  return (
    <div className="space-y-5">
      <section className="surface relative overflow-hidden rounded-3xl p-5">
        <img src={HERO_IMAGE} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-br from-coal-950/90 via-coal-900/75 to-coal-900/30" />
        <div className="relative">
        <div className="eyebrow flex items-center gap-1.5 text-gold-400">
          <Flame className="size-3.5 animate-flicker" /> Charcoal grilled to order
        </div>
        <h1 className="display mt-2 text-[34px] font-bold leading-[1.02] text-cream-50 text-balance">
          Real Port Harcourt suya. Paid in USDC.
        </h1>
        <p className="mt-3 max-w-[34ch] text-sm text-cream-200/80 text-pretty">
          Pick your meat, set your heat, tap pay. Your receipt lands on screen the second it confirms.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-cream-100">
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
            <MapPin className="size-3.5 text-ember-400" /> {PICKUP.address}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
            <Clock className="size-3.5 text-ember-400" /> Ready in about 10 to 30 min
          </span>
        </div>
        </div>
      </section>

      {!SHOP_ADDRESS && (
        <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-gold-300">
          The shop contract is not connected yet, so ordering is paused. Browse the menu while it opens.
        </div>
      )}

      <div className="flex items-end justify-between">
        <h2 className="display text-2xl font-bold text-cream-50">The menu</h2>
        <CurrencyPicker />
      </div>

      <ul className="space-y-4">
        {MENU.map((item, i) => {
          const from = parseUsdcPrice(item.sizes[0].price)
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 28 }}
            >
              <button
                onClick={() => onPick(item)}
                className="surface focus-ring group block w-full overflow-hidden rounded-3xl text-left transition-transform active:scale-[0.99]"
              >
                <div className="relative h-44 overflow-hidden">
                  <FoodPhoto item={item} className="size-full transition-transform duration-500 group-hover:scale-105" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  {item.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-coal-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="eyebrow text-ember-400">{item.tagline}</div>
                    <h3 className="display mt-0.5 text-lg font-bold text-cream-50">{item.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[13px] text-cream-200/70 text-pretty">{item.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-cream-50">
                      <span className="flex items-center gap-1.5">
                        <TokenUSDC variant="branded" size={16} />
                        <span className="tabular-nums">
                          {item.sizes.length > 1 ? 'from ' : ''}
                          {usd(from)}
                        </span>
                      </span>
                      <Fiat raw={from} className="text-xs font-medium tabular-nums text-gold-300" />
                    </div>
                  </div>
                  <span className="btn-primary flex size-12 shrink-0 items-center justify-center rounded-full">
                    <Plus className="size-6" />
                  </span>
                </div>
              </button>
            </motion.li>
          )
        })}
      </ul>

      <section className="surface rounded-3xl p-5">
        <div className="eyebrow text-ember-400">Pickup</div>
        <h3 className="display mt-1 text-lg font-bold text-cream-50">
          {PICKUP.name}, {PICKUP.address}
        </h3>
        <p className="mt-1.5 text-sm text-cream-200/75 text-pretty">{PICKUP.note}</p>
      </section>

    </div>
  )
}
