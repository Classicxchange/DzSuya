import { useState } from 'react'
import { useModal } from 'connectkit'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Lock, Store } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Fiat } from '@/components/Fiat'
import { useAllOrders, useShopWallet } from '@/hooks/useShop'
import { CHAIN_ID, SHOP_ABI, SHOP_ADDRESS, STATUS_LABELS, type OrderView } from '@/lib/chain'
import { parseTxError } from '@/lib/errors'
import { shortAddr, timeAgo, usd } from '@/lib/format'
import { decodeOrder } from '@/lib/menu'

const NEXT: Record<number, { label: string; status: number } | undefined> = {
  0: { label: 'Start preparing', status: 1 },
  1: { label: 'Mark ready for pickup', status: 2 },
  2: { label: 'Mark collected', status: 3 },
}

export function SellerView({ onOpen }: { onOpen: (id: bigint) => void }) {
  const { address, isConnected, chainId } = useAccount()
  const { setOpen } = useModal()
  const { data: shopWallet, isLoading: loadingShop } = useShopWallet()
  const isShop = !!address && !!shopWallet && address.toLowerCase() === shopWallet.toLowerCase()
  const { orders, isLoading } = useAllOrders(isShop)
  const [filter, setFilter] = useState<'active' | 'done'>('active')
  const [pending, setPending] = useState<bigint | null>(null)
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()

  if (!SHOP_ADDRESS) {
    return <Gate icon={<Store className="size-7" />} title="Shop not connected" body="Seller tools unlock once the shop contract is deployed." />
  }
  if (!isConnected) {
    return (
      <Gate
        icon={<Lock className="size-7" />}
        title="Seller area"
        body="Connect the shop wallet to see incoming orders and update their status."
        action="Connect wallet"
        onAction={() => setOpen(true)}
      />
    )
  }
  if (loadingShop) {
    return (
      <div className="flex justify-center py-24 text-ember-400">
        <Loader2 className="size-7 animate-spin" />
      </div>
    )
  }
  if (!isShop) {
    return (
      <Gate
        icon={<Lock className="size-7" />}
        title="This area is for the shop"
        body={`${shortAddr(address ?? '0x')} is not the shop wallet. Only the shop wallet can see this dashboard and update orders.`}
      />
    )
  }

  const advance = async (order: OrderView) => {
    const next = NEXT[order.status]
    if (!next || !client || !SHOP_ADDRESS) return
    setPending(order.id)
    try {
      if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID })
      const hash = await writeContractAsync({
        address: SHOP_ADDRESS,
        abi: SHOP_ABI,
        functionName: 'setStatus',
        args: [order.id, next.status],
        chainId: CHAIN_ID,
      })
      const receipt = await client.waitForTransactionReceipt({ hash })
      if (receipt.status !== 'success') throw new Error('reverted')
      await queryClient.invalidateQueries()
      toast.success(`Order #${order.id} · ${STATUS_LABELS[next.status]}`)
    } catch (e) {
      const parsed = parseTxError(e)
      if (!parsed.cancelled) toast.error(parsed.message)
    } finally {
      setPending(null)
    }
  }

  const all = orders ?? []
  const active = all.filter((o) => o.status < 3)
  const done = all.filter((o) => o.status >= 3)
  const shown = filter === 'active' ? [...active].reverse() : done
  const revenue = all.reduce((sum, o) => sum + o.amount, 0n)

  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow text-ember-400">Seller dashboard</div>
        <h1 className="display text-3xl font-bold text-cream-50">Incoming orders</h1>
        <p className="mt-1 text-sm text-cream-300">Payments land straight in your wallet. This list refreshes every few seconds.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={String(active.length)} />
        <Stat label="Done" value={String(done.length)} />
        <Stat label="Sales" value={usd(revenue)} suffix="USDC" />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-cream-300">
        <span>
          Sales ≈ <Fiat raw={revenue} prefix="" className="font-semibold text-cream-100" /> in your currency
        </span>
        <CurrencyPicker />
      </div>

      <div className="flex gap-2" role="tablist">
        {(['active', 'done'] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`focus-ring min-h-[44px] flex-1 rounded-full text-sm font-semibold transition-colors ${
              filter === f ? 'bg-ember-500 text-coal-950' : 'btn-ghost'
            }`}
          >
            {f === 'active' ? `Active (${active.length})` : `Done (${done.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-ember-400">
          <Loader2 className="size-7 animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="surface rounded-3xl p-8 text-center text-sm text-cream-300">
          {filter === 'active' ? 'No orders waiting. New paid orders appear here instantly.' : 'Nothing collected yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((o) => {
            const lines = decodeOrder(o.details)
            const next = NEXT[o.status]
            const busy = pending === o.id
            return (
              <li key={o.id.toString()} className="surface rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button onClick={() => onOpen(o.id)} className="display focus-ring text-lg font-bold tabular-nums text-cream-50 underline-offset-4 hover:underline">
                      #{o.id.toString()}
                    </button>
                    <div className="text-xs text-cream-300">
                      {timeAgo(o.createdAt)} · {shortAddr(o.customer)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="display font-bold tabular-nums text-gold-300">{usd(o.amount)}</div>
                    <Fiat raw={o.amount} className="block text-[11px] tabular-nums text-cream-300" />
                    <div className="text-[11px] font-semibold text-ember-400">{STATUS_LABELS[o.status]}</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-sm">
                  {lines.map((l, i) => (
                    <li key={i}>
                      <span className="font-bold text-cream-50">
                        {l.qty} × {l.itemName}
                      </span>{' '}
                      <span className="text-cream-300">
                        {l.sizeLabel} · {l.spiceLabel}
                        {l.extraLabels.length > 0 && ` · ${l.extraLabels.join(', ')}`}
                      </span>
                      {l.note && <div className="text-xs italic text-gold-300">"{l.note}"</div>}
                    </li>
                  ))}
                </ul>
                {next && (
                  <button
                    onClick={() => void advance(o)}
                    disabled={pending !== null}
                    className="btn-primary focus-ring mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    {busy ? 'Updating…' : next.label}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="surface rounded-2xl p-3">
      <div className="eyebrow text-cream-300">{label}</div>
      <div className="display mt-1 text-xl font-bold tabular-nums text-cream-50">{value}</div>
      {suffix && <div className="text-[10px] text-cream-300">{suffix}</div>}
    </div>
  )
}

function Gate(props: { icon: React.ReactNode; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="surface mt-6 flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-ember-500/15 text-ember-400">{props.icon}</span>
      <h2 className="display mt-4 text-xl font-bold text-cream-50">{props.title}</h2>
      <p className="mt-1.5 max-w-[32ch] text-sm text-cream-300 text-pretty">{props.body}</p>
      {props.action && (
        <button onClick={props.onAction} className="btn-primary focus-ring mt-5 min-h-[52px] rounded-2xl px-6 text-sm">
          {props.action}
        </button>
      )}
    </div>
  )
}
