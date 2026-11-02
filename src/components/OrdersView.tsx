import { useModal } from 'connectkit'
import { ChevronRight, Loader2, ReceiptText, Wallet } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Fiat } from '@/components/Fiat'
import { useMyOrders } from '@/hooks/useShop'
import { CHAIN_NAME, SHOP_ADDRESS, STATUS_LABELS } from '@/lib/chain'
import { timeAgo, usd } from '@/lib/format'
import { decodeOrder } from '@/lib/menu'

const STATUS_STYLE = [
  'bg-gold-400/15 text-gold-300',
  'bg-ember-500/15 text-ember-400',
  'bg-leaf-500/15 text-leaf-400',
  'bg-white/10 text-cream-200',
]

export function OrdersView({ onOpen, onBrowse }: { onOpen: (id: bigint) => void; onBrowse: () => void }) {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const { orders, isLoading } = useMyOrders(address)

  if (!isConnected) {
    return (
      <Empty
        icon={<Wallet className="size-7" />}
        title="Connect to see your orders"
        body={`Your order history lives onchain on ${CHAIN_NAME}, so it follows your wallet to any device.`}
        action="Connect wallet"
        onAction={() => setOpen(true)}
      />
    )
  }

  if (!SHOP_ADDRESS) {
    return <Empty icon={<ReceiptText className="size-7" />} title="No orders yet" body="The shop is not open for orders yet." />
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-ember-400">
        <Loader2 className="size-7 animate-spin" />
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <Empty
        icon={<ReceiptText className="size-7" />}
        title="No orders yet"
        body="Your receipts show up here after your first order."
        action="Browse the menu"
        onAction={onBrowse}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="display text-3xl font-bold text-cream-50">My orders</h1>
        <p className="mt-1 text-sm text-cream-300">Read live from {CHAIN_NAME}. Tap one to open its receipt.</p>
      </div>
      <ul className="space-y-3">
        {orders.map((o) => {
          const lines = decodeOrder(o.details)
          const summary = lines.map((l) => `${l.qty} × ${l.itemName}`).join(', ')
          return (
            <li key={o.id.toString()}>
              <button
                onClick={() => onOpen(o.id)}
                className="surface focus-ring flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-transform active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="display font-bold tabular-nums text-cream-50">#{o.id.toString()}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[o.status] ?? STATUS_STYLE[0]}`}>
                      {STATUS_LABELS[o.status] ?? 'Confirmed'}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-cream-200">{summary || 'Order details'}</div>
                  <div className="mt-0.5 text-xs text-cream-300/80">{timeAgo(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="display font-bold tabular-nums text-gold-300">{usd(o.amount)}</div>
                  <div className="text-[11px] text-cream-300">USDC</div>
                  <Fiat raw={o.amount} className="text-[11px] tabular-nums text-cream-300" />
                </div>
                <ChevronRight className="size-5 text-cream-300" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Empty(props: { icon: React.ReactNode; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="surface mt-6 flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-ember-500/15 text-ember-400">{props.icon}</span>
      <h2 className="display mt-4 text-xl font-bold text-cream-50">{props.title}</h2>
      <p className="mt-1.5 max-w-[30ch] text-sm text-cream-300 text-pretty">{props.body}</p>
      {props.action && (
        <button onClick={props.onAction} className="btn-primary focus-ring mt-5 min-h-[52px] rounded-2xl px-6 text-sm">
          {props.action}
        </button>
      )}
    </div>
  )
}
