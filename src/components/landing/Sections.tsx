import { ArrowRight, AtSign, Check, Coins, Flame, Globe2, QrCode, Receipt, Store, UtensilsCrossed } from 'lucide-react'
import { Fiat } from '@/components/Fiat'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { FoodPhoto } from '@/components/FoodPhoto'
import { Reveal, SectionHead } from '@/components/landing/Reveal'
import type { AppTab } from '@/components/landing/Hero'
import { usd } from '@/lib/format'
import { EXTRAS, MENU, SPICE_LEVELS, parseUsdcPrice } from '@/lib/menu'

const PILLARS = [
  {
    icon: UtensilsCrossed,
    title: 'Order from the grill',
    body: 'Browse the full suya menu, choose your size, spice level and extras, add a note for the grill master, and order before you reach Woji Road.',
  },
  {
    icon: Coins,
    title: 'Pay in USDC on Arc',
    body: 'Your payment goes straight from your wallet to the shop wallet. Network fees are paid in USDC too, so there is no second token to buy.',
  },
  {
    icon: AtSign,
    title: 'DZ ID: pay by name',
    body: 'Claim a short name for your wallet. Friends type it, send USDC, and it arrives in seconds. No long address to copy or get wrong.',
  },
]

export function What() {
  return (
    <section id="what" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-24">
      <Reveal>
        <SectionHead
          eyebrow="What DzSuya is"
          title="A street food stand and a payment app, built together"
          body="Professor Dozzie grills suya on Woji Road, Port Harcourt. DzSuya lets customers order and pay onchain, and lets anyone use a simple name to receive money."
        />
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.06}>
            <div className="surface h-full rounded-3xl p-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-ember-500/15 text-ember-400">
                <p.icon className="size-6" />
              </div>
              <h3 className="display mt-4 text-xl font-bold text-cream-50">{p.title}</h3>
              <p className="mt-2 text-sm text-cream-200/80 text-pretty">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { n: '1', title: 'Pick your suya', body: 'Beef, chicken, goat, fish or the Professor\'s Special.' },
  { n: '2', title: 'Make it yours', body: 'Size, spice from Mild to Extra Hot, extras, quantity and a note.' },
  { n: '3', title: 'Pay with USDC', body: 'Connect a wallet. The app adds Arc Testnet for you if needed. Confirm once or twice and you are done.' },
  { n: '4', title: 'Collect and enjoy', body: 'Your receipt appears instantly with a QR code. Watch it go from Confirmed to Preparing to Ready, then pick up at the grill.' },
]

export function How() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-white/5 bg-coal-950/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <Reveal>
          <SectionHead eyebrow="How ordering works" title="From craving to pickup in four steps" />
        </Reveal>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <li className="surface h-full list-none rounded-3xl p-5">
                <div className="display flex size-10 items-center justify-center rounded-full bg-ember-500 text-lg font-bold text-coal-950">{s.n}</div>
                <h3 className="display mt-4 text-lg font-bold text-cream-50">{s.title}</h3>
                <p className="mt-1.5 text-sm text-cream-200/80 text-pretty">{s.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function MenuPreview({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <section id="menu" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <SectionHead
          eyebrow="The menu"
          title="Five kinds of suya, one yaji-dusted tradition"
          body="Thin-sliced meat, rubbed in yaji (ground peanut, ginger, dried chilli and onion), and charred over open coals. Served with raw onion and tomato."
        />
        <CurrencyPicker />
      </Reveal>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU.map((item, i) => {
          const from = parseUsdcPrice(item.sizes[0].price)
          return (
            <Reveal key={item.id} delay={(i % 3) * 0.05}>
              <article className="surface group h-full overflow-hidden rounded-3xl">
                <div className="relative h-48 overflow-hidden">
                  <FoodPhoto item={item} className="size-full transition-transform duration-500 group-hover:scale-105" />
                  {item.badge && <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-bold text-coal-950">{item.badge}</span>}
                </div>
                <div className="p-5">
                  <h3 className="display text-xl font-bold text-cream-50">{item.name}</h3>
                  <p className="text-sm font-semibold text-ember-400">{item.tagline}</p>
                  <p className="mt-2 text-sm text-cream-200/80 text-pretty">{item.about}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm font-bold text-cream-50">
                    <span className="tabular-nums">
                      {item.sizes.length > 1 ? 'from ' : ''}
                      {usd(from)} USDC
                    </span>
                    <Fiat raw={from} className="text-xs font-medium tabular-nums text-gold-300" />
                  </div>
                </div>
              </article>
            </Reveal>
          )
        })}
        <Reveal>
          <div className="surface flex h-full flex-col justify-between rounded-3xl p-6">
            <div>
              <Flame className="size-7 text-ember-400" />
              <h3 className="display mt-3 text-xl font-bold text-cream-50">Make it yours</h3>
              <p className="mt-2 text-sm text-cream-200/80">
                Spice: {SPICE_LEVELS.map((s) => s.label).join(', ')}.
              </p>
              <p className="mt-1.5 text-sm text-cream-200/80">Extras: {EXTRAS.map((e) => e.label.toLowerCase()).join(', ')}.</p>
            </div>
            <button onClick={() => onOpen('menu')} className="btn-primary focus-ring mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm">
              See full menu and order <ArrowRight className="size-4" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const DZ_POINTS = [
  'One name per wallet, yours alone and permanent. Nobody can take it or transfer it.',
  'Claiming takes two quick confirmations so no one can snipe the name you picked.',
  'Money goes through the DZ ID contract and straight on to the owner in the same transaction. The contract never keeps funds.',
  'Share a pay link such as /?pay=yourname. It opens the send form with your name filled in.',
]

export function DzIdSection({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <section id="dzid" className="scroll-mt-20 border-y border-white/5 bg-coal-950/60">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <Reveal>
          <SectionHead
            eyebrow="DZ ID"
            title="Send money to a name, not a wallet address"
            body="Wallet addresses are long and easy to mistype. A DZ ID is a short name that belongs to one wallet, so paying a friend, a seller or a tutor feels like sending a message."
          />
          <ul className="mt-6 space-y-3">
            {DZ_POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-sm text-cream-100">
                <Check className="mt-0.5 size-5 shrink-0 text-leaf-400" />
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => onOpen('dzid')} className="btn-primary focus-ring mt-7 flex min-h-[56px] items-center gap-2 rounded-2xl px-6 text-base">
            Claim your DZ ID <ArrowRight className="size-5" />
          </button>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="surface rounded-3xl p-5" aria-hidden="true">
            <div className="rounded-2xl bg-gradient-to-br from-ember-500 to-chili-600 p-5 text-coal-950">
              <div className="eyebrow opacity-80">Your DZ ID</div>
              <div className="display mt-1 text-4xl font-bold">@yourname</div>
              <div className="mt-6 text-xs font-semibold opacity-80">Claimed once. Yours alone.</div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="eyebrow text-cream-300">Send to</div>
                <div className="display mt-1 text-2xl font-bold text-cream-50">@theirname</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="eyebrow text-cream-300">Amount</div>
                <div className="display mt-1 text-2xl font-bold text-gold-300">USDC</div>
              </div>
              <div className="btn-primary flex min-h-[52px] items-center justify-center rounded-2xl text-sm">Send</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: Receipt, title: 'Receipt on arrival', body: 'A full-screen receipt with your order, total, time and transaction link as soon as you pay.' },
  { icon: QrCode, title: 'QR code and share link', body: 'Show the QR at the grill, or copy and share the receipt link with anyone.' },
  { icon: Flame, title: 'Live order status', body: 'Confirmed, Preparing, Ready for pickup. The status updates on its own, no refresh needed.' },
  { icon: Globe2, title: 'Your currency', body: 'See every price in your own currency, from naira to pounds, using live exchange rates. You always pay in USDC.' },
  { icon: Store, title: 'Seller dashboard', body: 'The shop wallet sees incoming orders, spots payments that do not match their items, and moves each order forward.' },
  { icon: Receipt, title: 'History that follows you', body: 'Your past orders are read from the chain, so they show up on any device when you connect your wallet.' },
]

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <Reveal>
        <SectionHead eyebrow="Everything in the app" title="Built so ordering feels easy and payments feel safe" />
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.05}>
            <div className="surface h-full rounded-3xl p-5">
              <f.icon className="size-6 text-ember-400" />
              <h3 className="display mt-3 text-lg font-bold text-cream-50">{f.title}</h3>
              <p className="mt-1.5 text-sm text-cream-200/80 text-pretty">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
