import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, ReceiptText, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react'
import { Fiat } from '@/components/Fiat'
import { DzIdView } from '@/components/DzIdView'
import { Header } from '@/components/Header'
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

function readOrderParam(): bigint | null {
  const raw = new URLSearchParams(window.location.search).get('order')
  return raw && /^\d{1,12}$/.test(raw) && BigInt(raw) > 0n ? BigInt(raw) : null
}

function readPayParam(): string | undefined {
  const raw = new URLSearchParams(window.location.search).get('pay')
  const name = raw ? normalizeName(raw) : ''
  return name && isValidName(name) ? name : undefined
}

function Shell() {
  const { count, total } = useCart()
  const [payName] = useState(readPayParam)
  const [tab, setTab] = useState<Tab>(() => (readPayParam() ? 'dzid' : 'menu'))
  const [picked, setPicked] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [receipt, setReceipt] = useState<{ id: bigint; justPaid: boolean } | null>(() => {
    const id = readOrderParam()
    return id ? { id, justPaid: false } : null
  })

  useEffect(() => {
    const onPop = () => {
      const id = readOrderParam()
      setReceipt(id ? { id, justPaid: false } : null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openReceipt = useCallback((id: bigint, justPaid = false) => {
    window.history.pushState({}, '', `/?order=${id.toString()}`)
    setReceipt({ id, justPaid })
  }, [])

  const closeReceipt = useCallback(() => {
    window.history.pushState({}, '', '/')
    setReceipt(null)
    setTab('menu')
  }, [])

  return (
    <div className="min-h-dvh bg-coal-900">
      <Header />
      <nav className="mx-auto max-w-md px-4 pt-3" aria-label="Sections">
        <div className="grid grid-cols-4 gap-0.5 rounded-full bg-white/[0.05] p-1">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
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
        {tab === 'orders' && <OrdersView onOpen={(id) => openReceipt(id)} onBrowse={() => setTab('menu')} />}
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
