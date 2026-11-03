import { ArrowRight, ExternalLink, MapPin, ShieldCheck } from 'lucide-react'
import { useReadContract } from 'wagmi'
import { Logo } from '@/components/Logo'
import { Reveal, SectionHead } from '@/components/landing/Reveal'
import { scrollToSection, type AppTab } from '@/components/landing/Hero'
import { CHAIN_ID, CHAIN_NAME, SHOP_ABI, SHOP_ADDRESS, addressUrl } from '@/lib/chain'
import { DZID_ABI, DZID_ADDRESS } from '@/lib/dzid'
import { PICKUP } from '@/lib/menu'

function useLiveCounts() {
  const orders = useReadContract({
    address: SHOP_ADDRESS,
    abi: SHOP_ABI,
    functionName: 'orderCount',
    chainId: CHAIN_ID,
    query: { enabled: !!SHOP_ADDRESS, refetchInterval: 30_000 },
  })
  const names = useReadContract({
    address: DZID_ADDRESS,
    abi: DZID_ABI,
    functionName: 'totalNames',
    chainId: CHAIN_ID,
    query: { enabled: !!DZID_ADDRESS, refetchInterval: 30_000 },
  })
  return { orders: orders.data, names: names.data }
}

function Stat({ label, value }: { label: string; value: bigint | undefined }) {
  return (
    <div className="surface rounded-2xl p-5 text-center">
      <div className="display text-4xl font-bold tabular-nums text-gold-300">{value === undefined ? '–' : value.toString()}</div>
      <div className="eyebrow mt-1 text-cream-300">{label}</div>
    </div>
  )
}

export function Onchain() {
  const { orders, names } = useLiveCounts()
  return (
    <section className="border-y border-white/5 bg-coal-950/60">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <Reveal>
          <SectionHead
            eyebrow="Open and verifiable"
            title="Every order and every name lives on a public contract"
            body={`DzSuya runs on ${CHAIN_NAME}, Circle's network where USDC pays the fees. Receipts, order status and DZ IDs are read straight from two smart contracts anyone can inspect.`}
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
          <Stat label="Orders placed" value={orders} />
          <Stat label="DZ IDs claimed" value={names} />
          <div className="surface rounded-2xl p-5">
            <div className="eyebrow text-cream-300">Contracts on {CHAIN_NAME}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {SHOP_ADDRESS && (
                <li>
                  <a href={addressUrl(SHOP_ADDRESS)} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center justify-between gap-2 rounded-lg py-1 font-semibold text-cream-50 underline-offset-4 hover:underline">
                    Shop and orders <ExternalLink className="size-4 text-ember-400" />
                  </a>
                </li>
              )}
              {DZID_ADDRESS && (
                <li>
                  <a href={addressUrl(DZID_ADDRESS)} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center justify-between gap-2 rounded-lg py-1 font-semibold text-cream-50 underline-offset-4 hover:underline">
                    DZ ID names and payments <ExternalLink className="size-4 text-ember-400" />
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-6 flex gap-3 rounded-2xl border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-gold-300">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p className="text-pretty">
            This is a test network. The USDC here is test money with no real value, so you can try everything safely. Order contents
            are public onchain, so keep personal details out of your notes.
          </p>
        </div>
      </div>
    </section>
  )
}

const FAQ = [
  {
    q: 'Do I need a crypto wallet?',
    a: 'Yes, a browser wallet such as MetaMask. When you pay, the app asks it to add Arc Testnet automatically if it is not there yet.',
  },
  {
    q: 'Is this real money?',
    a: 'No. DzSuya is running on a test network, so the USDC is free test money. Use the Get test USDC button in the Arc Studio sidebar or the Circle faucet to top up.',
  },
  {
    q: 'Why is USDC used for network fees too?',
    a: 'On Arc, USDC is the gas token. You only hold one asset, and fees stay predictable. Keep a few cents extra for fees on top of your order.',
  },
  {
    q: 'How do I pick up my order?',
    a: `Go to ${PICKUP.address}. Show the QR code on your receipt at the grill. The estimated prep time is on your receipt and the status updates live.`,
  },
  {
    q: 'What is a DZ ID?',
    a: 'A short name, like @yourname, that belongs to one wallet. Anyone can type it to send you USDC. The payment passes through the DZ ID contract and reaches your wallet in the same transaction.',
  },
  {
    q: 'Can I change or sell my DZ ID?',
    a: 'No. A name is permanent and tied to the wallet that claimed it, and each wallet can hold one. Pick a name you will be happy with.',
  },
  {
    q: 'Can I see prices in naira or another currency?',
    a: 'Yes. Pick your currency from the button next to the menu. Values are estimates from live exchange rates, and you always pay in USDC.',
  },
  {
    q: 'Who can see the seller dashboard?',
    a: 'Only the shop wallet. Only that wallet can update order status, and the shop contract enforces it. Receipts themselves are public.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 md:py-24">
      <Reveal>
        <SectionHead eyebrow="Questions" title="Good to know before you order" />
      </Reveal>
      <div className="mt-8 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03]">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="focus-ring flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold text-cream-50">
              {f.q}
              <span aria-hidden="true" className="text-xl text-ember-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-cream-200/80 text-pretty">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function Closing({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ember-600/30 via-coal-900 to-coal-950" />
        <Reveal className="relative mx-auto max-w-3xl px-4 py-20 text-center">
          <h2 className="display text-4xl font-bold leading-[1.02] text-cream-50 text-balance sm:text-5xl">Hungry? The grill is hot.</h2>
          <p className="mx-auto mt-3 max-w-lg text-cream-200/85 text-pretty">Order your suya, or claim your DZ ID first and start getting paid by name.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button onClick={() => onOpen('menu')} className="btn-primary focus-ring flex min-h-[56px] items-center gap-2 rounded-2xl px-7 text-base">
              Order suya <ArrowRight className="size-5" />
            </button>
            <button onClick={() => onOpen('dzid')} className="btn-ghost focus-ring min-h-[56px] rounded-2xl px-7 text-base">
              Claim your DZ ID
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 bg-coal-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-8">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="display text-lg font-bold text-cream-50">
                Dz<span className="text-ember-400">Suya</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-cream-300">
                <MapPin className="size-3.5" /> Professor Dozzie's, {PICKUP.address}
              </div>
            </div>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-cream-200">
            <button onClick={() => scrollToSection('how')} className="focus-ring min-h-[44px] rounded">How it works</button>
            <button onClick={() => scrollToSection('menu')} className="focus-ring min-h-[44px] rounded">Menu</button>
            <button onClick={() => scrollToSection('dzid')} className="focus-ring min-h-[44px] rounded">DZ ID</button>
            <button onClick={() => scrollToSection('faq')} className="focus-ring min-h-[44px] rounded">FAQ</button>
          </nav>
          <p className="w-full text-xs text-cream-300/70">Running on {CHAIN_NAME}, a test network. No real money is used.</p>
        </div>
      </footer>
    </>
  )
}
