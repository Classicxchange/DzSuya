import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, ReceiptText, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react'
import { Fiat } from '@/components/Fiat'
import { DzIdView } from '@/components/DzIdView'
import { Header } from '@/components/Header'
import { Landing } from '@/components/landing/Landing'
import { ItemSheet } from '@/components/ItemSheet'
import { MenuView } from '@/components/MenuView'
import { OrdersView } from '@/components/OrdersView'
import { Receipt } from '@/components/Receipt'
import { CartSheet } from '@/components/CartSheet'
import { SellerView } from '@/components/SellerView'
import { CartProvider, useCart } from '@/hooks/useCart'
import { CurrencyProvider } from '@/hooks/useCurrency'
import { usd } from '@/lib/format'
import { isValidName, normalizeName } from '@/lib/dzid'
import type { MenuItem } from '@/lib/menu'

type Tab = 'menu' | 'orders' | 'dzid' | 'seller'

const TABS: { id: Tab; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'dzid', label: 'DZ ID', icon: AtSign },
  { id: 'seller', label: 'Seller', icon: Store },
]

interface Route {
  view: 'landing' | 'app'
  tab: Tab
  receiptId: bigint | null
  pay: string | undefined
}

/** `/` is the homepage; everything inside the app lives under a query such as `/?app=menu`. */
function readRoute(): Route {
  const params = new URLSearchParams(window.location.search)
  const rawOrder = params.get('order')
  const receiptId = rawOrder && /^\d{1,12}$/.test(rawOrder) && BigInt(rawOrder) > 0n ? BigInt(rawOrder) : null
  const rawPay = params.get('pay')
  const payName = rawPay ? normalizeName(rawPay) : ''
  const pay = payName && isValidName(payName) ? payName : undefined
  const appParam = params.get('app')
  const tab = TABS.find((t) => t.id === appParam)?.id
  if (pay) return { view: 'app', tab: 'dzid', receiptId, pay }
  if (receiptId) return { view: 'app', tab: tab ?? 'menu', receiptId, pay }
  if (tab || appParam !== null) return { view: 'app', tab: tab ?? 'menu', receiptId: null, pay }
  return { view: 'landing', tab: 'menu', receiptId: null, pay }
}

function Shell() {
  const { count, total } = useCart()
  const [route, setRoute] = useState<Route>(readRoute)
  const [picked, setPicked] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [justPaid, setJustPaid] = useState(false)

  useEffect(() => {
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((query: string) => {
    window.history.pushState({}, '', query ? `/?${query}` : '/')
    setRoute(readRoute())
    window.scrollTo({ top: 0 })
  }, [])

  const openApp = useCallback((tab: Tab) => go(`app=${tab}`), [go])

  const openReceipt = useCallback(
    (id: bigint, paid = false) => {
      setJustPaid(paid)
      go(`order=${id.toString()}`)
    },
    [go],
  )

  const closeReceipt = useCallback(() => go('app=menu'), [go])

  const { tab, receiptId, pay: payName } = route
  const receipt = receiptId ? { id: receiptId, justPaid } : null

  if (route.view === 'landing') return <Landing onOpen={openApp} />

  return (
    <div className="min-h-dvh bg-coal-900">
      <Header onHome={() => go('')} />
      <nav className="mx-auto max-w-md px-4 pt-3" aria-label="Sections">
        <div className="grid grid-cols-4 gap-0.5 rounded-full bg-white/[0.05] p-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id
            return (
              <button
                key={id}
                onClick={() => openApp(id)}
                aria-current={on ? 'page' : undefined}
                className={`focus-ring relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${
                  on ? 'text-coal-950' : 'text-cream-200 hover:text-cream-50'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-ember-400 to-ember-600"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="relative flex flex-col items-center gap-0.5 min-[400px]:flex-row min-[400px]:gap-1.5">
                  <Icon className="size-4" />
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-md px-4 pb-44 pt-5">
        {tab === 'menu' && <MenuView onPick={setPicked} />}
        {tab === 'orders' && <OrdersView onOpen={(id) => openReceipt(id)} onBrowse={() => openApp('menu')} />}
        {tab === 'dzid' && <DzIdView initialName={payName} />}
        {tab === 'seller' && <SellerView onOpen={(id) => openReceipt(id)} />}
      </main>

      <AnimatePresence>
        {count > 0 && tab !== 'seller' && tab !== 'dzid' && !receipt && (
          <motion.div
            className="fixed inset-x-0 bottom-4 z-30 px-4"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <button
              onClick={() => setCartOpen(true)}
              className="btn-primary focus-ring mx-auto flex min-h-[56px] w-full max-w-md items-center justify-between rounded-2xl px-5 text-[15px]"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative">
                  <ShoppingBag className="size-5" />
                </span>
                View order · {count} {count === 1 ? 'item' : 'items'}
              </span>
              <span className="flex flex-col items-end leading-tight">
                <span className="display text-base font-bold tabular-nums">{usd(total)} USDC</span>
                <Fiat raw={total} className="text-[11px] font-semibold tabular-nums opacity-80" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ItemSheet item={picked} onClose={() => setPicked(null)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} onPaid={(id) => openReceipt(id, true)} />

      <AnimatePresence>
        {receipt && (
          <motion.div key="receipt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Receipt orderId={receipt.id} justPaid={receipt.justPaid} onClose={closeReceipt} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <CurrencyProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </CurrencyProvider>
  )
}
