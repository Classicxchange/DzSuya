import { useModal } from 'connectkit'
import { AlertCircle, ExternalLink, Loader2, Minus, Plus, Trash2 } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { useAccount } from 'wagmi'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { Fiat } from '@/components/Fiat'
import { FoodPhoto } from '@/components/FoodPhoto'
import { Sheet } from '@/components/Sheet'
import { useCart } from '@/hooks/useCart'
import { useCheckout, type CheckoutPhase } from '@/hooks/useCheckout'
import { useUsdcBalance } from '@/hooks/useShop'
import { CHAIN_ID, CHAIN_NAME, SHOP_ADDRESS, txUrl } from '@/lib/chain'
import { usd } from '@/lib/format'
import { MAX_DETAILS_BYTES, encodedSize, getItem, getSize, lineTotal, SPICE_LEVELS, getExtra, prepMinutes } from '@/lib/menu'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  onPaid: (id: bigint, hash: `0x${string}`) => void
}

const PHASE_COPY: Record<CheckoutPhase, string> = {
  idle: '',
  switching: `Switching to ${CHAIN_NAME}…`,
  approving: 'Confirm the USDC allowance in your wallet…',
  'approving-confirm': 'Waiting for the allowance to confirm…',
  ordering: 'Confirm the payment in your wallet…',
  'ordering-confirm': 'Payment sent. Confirming on Arc…',
}

export function CartSheet({ open, onClose, onPaid }: CartSheetProps) {
  const { lines, total, setQty, remove, clear, count } = useCart()
  const { address, isConnected, chainId } = useAccount()
  const { setOpen } = useModal()
  const { data: balance } = useUsdcBalance(address)
  const { pay, phase, busy, error, approveHash } = useCheckout()

  const tooLong = encodedSize(lines) > MAX_DETAILS_BYTES
  const short = isConnected && balance !== undefined && balance < total
  const wrongChain = isConnected && chainId !== CHAIN_ID

  const onPay = async () => {
    if (!isConnected) {
      setOpen(true)
      return
    }
    const placed = await pay(lines)
    if (placed) {
      clear()
      onClose()
      onPaid(placed.id, placed.hash)
    }
  }

  const cta = !SHOP_ADDRESS
    ? 'Ordering paused'
    : !isConnected
      ? 'Connect wallet to pay'
      : busy
        ? PHASE_COPY[phase]
        : wrongChain
          ? `Switch to ${CHAIN_NAME} and pay ${usd(total)} USDC`
          : `Pay ${usd(total)} USDC`

  return (
    <Sheet
      open={open}
      onClose={onClose}
      locked={busy}
      eyebrow={`${count} ${count === 1 ? 'portion' : 'portions'}`}
      title="Your order"
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            {busy && (
              <ol className="flex items-center gap-2 text-xs font-semibold">
                <Step label="Allow USDC" active={phase === 'approving' || phase === 'approving-confirm'} done={phase === 'ordering' || phase === 'ordering-confirm'} />
                <span className="h-px flex-1 bg-white/10" />
                <Step label="Pay" active={phase === 'ordering' || phase === 'ordering-confirm'} done={false} />
              </ol>
            )}
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-chili-500/15 p-3 text-sm text-cream-50">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-chili-500" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={() => void onPay()}
              disabled={!SHOP_ADDRESS || busy || tooLong || (isConnected && short)}
              className="btn-primary focus-ring flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base"
            >
              {busy && <Loader2 className="size-5 animate-spin" />}
              {cta}
            </button>
            {approveHash && busy && (
              <a
                href={txUrl(approveHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-cream-300 hover:text-cream-50"
              >
                Allowance transaction <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="py-14 text-center text-sm text-cream-300">Your tray is empty. Pick something off the grill.</div>
      ) : (
        <div className="space-y-4 pb-2">
          <ul className="space-y-3">
            {lines.map((l) => {
              const item = getItem(l.itemId)
              if (!item) return null
              const spice = SPICE_LEVELS.find((s) => s.id === l.spice)?.label
              return (
                <li key={l.key} className="rounded-2xl bg-white/[0.04] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <FoodPhoto item={item} className="size-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="display font-bold text-cream-50">{item.name}</div>
                      <div className="mt-0.5 text-xs text-cream-300">
                        {getSize(item, l.sizeId).label} · {spice}
                        {l.extras.length > 0 && ` · ${l.extras.map((e) => getExtra(e)?.label).join(', ')}`}
                      </div>
                      {l.note && <div className="mt-1 text-xs italic text-gold-300">"{l.note}"</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums text-cream-50">{usd(lineTotal(l))}</div>
                      <Fiat raw={lineTotal(l)} className="text-[11px] tabular-nums text-cream-300" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setQty(l.key, l.qty - 1)}
                        disabled={busy}
                        aria-label="Decrease quantity"
                        className="btn-ghost focus-ring flex size-10 items-center justify-center rounded-full"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-8 text-center font-semibold tabular-nums">{l.qty}</span>
                      <button
                        onClick={() => setQty(l.key, l.qty + 1)}
                        disabled={busy}
                        aria-label="Increase quantity"
                        className="btn-ghost focus-ring flex size-10 items-center justify-center rounded-full"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(l.key)}
                      disabled={busy}
                      aria-label={`Remove ${item.name}`}
                      className="focus-ring flex size-10 items-center justify-center rounded-full text-cream-300 hover:text-chili-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="rounded-2xl border border-white/10 p-4">
            <Row label="Items" value={`${usd(total)} USDC`} />
            <Row label="Service fee" value="0.00 USDC" />
            <Row label="Ready in" value={`~${prepMinutes(lines)} min`} />
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="display font-bold text-cream-50">Total</span>
              <span className="text-right">
                <span className="display flex items-center justify-end gap-1.5 text-2xl font-bold tabular-nums text-gold-300">
                  <TokenUSDC variant="branded" size={22} />
                  {usd(total)}
                </span>
                <Fiat raw={total} className="text-sm font-semibold tabular-nums text-cream-100" />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-cream-300">
              <span>Estimate in your currency. You pay in USDC.</span>
              <CurrencyPicker />
            </div>
          </div>

          {tooLong && (
            <p className="text-sm text-chili-500">This order is too long to record. Shorten a note or remove an item.</p>
          )}

          {short && (
            <div className="rounded-2xl border border-gold-400/30 bg-gold-400/10 p-3.5 text-sm text-gold-300">
              You have {balance !== undefined ? usd(balance) : '0.00'} USDC, which does not cover this order. Use the{' '}
              <strong>Get test USDC</strong> button in the Arc Studio sidebar, or{' '}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                the Circle faucet
              </a>
              . Keep a little extra for network fees, which are paid in USDC on Arc.
            </div>
          )}

          <p className="text-xs text-cream-300/80 text-pretty">
            You pay the shop wallet directly in USDC on {CHAIN_NAME}. The first time, your wallet asks you to allow this
            exact amount, then to confirm the payment.
          </p>
        </div>
      )}
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-cream-300">{label}</span>
      <span className="tabular-nums text-cream-100">{value}</span>
    </div>
  )
}

function Step({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <li className={`flex items-center gap-1.5 ${active ? 'text-ember-400' : done ? 'text-leaf-400' : 'text-cream-300/60'}`}>
      {active ? <Loader2 className="size-3.5 animate-spin" /> : <span className={`size-2 rounded-full ${done ? 'bg-leaf-400' : 'bg-current'}`} />}
      {label}
    </li>
  )
}
