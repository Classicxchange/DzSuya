import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { ArrowLeft, BadgeCheck, Check, Clock, Copy, ExternalLink, Loader2, MapPin, Share2 } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { Fiat } from '@/components/Fiat'
import { Logo } from '@/components/Logo'
import { StatusTracker } from '@/components/StatusTracker'
import { useOrder, useOrderTx } from '@/hooks/useShop'
import { CHAIN_NAME, SHOP_ADDRESS, addressUrl, txUrl } from '@/lib/chain'
import { formatClock, formatStamp, shortAddr, shortHash, usd } from '@/lib/format'
import { revertName } from '@/lib/errors'
import { PICKUP, prepMinutes, verifyOrder } from '@/lib/menu'
import { buildShareLink } from '@/lib/share'

interface ReceiptProps {
  orderId: bigint
  justPaid: boolean
  onClose: () => void
}

const INK = '#2A1A10'

export function Receipt({ orderId, justPaid, onClose }: ReceiptProps) {
  const { order, isLoading, isError, error, refetch } = useOrder(orderId)
  const { data: hash } = useOrderTx(orderId)
  const [link, setLink] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState<'link' | 'hash' | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    void buildShareLink(`/?order=${orderId.toString()}`).then((url) => alive && setLink(url))
    return () => {
      alive = false
    }
  }, [orderId])

  useEffect(() => {
    if (!link) return
    let alive = true
    QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: INK, light: '#FFF8EC' } })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null))
    return () => {
      alive = false
    }
  }, [link])

  const check = order ? verifyOrder(order.details, order.amount) : null
  const lines = check?.lines ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const readyAt = order ? (Number(order.createdAt) + prepMinutes(lines) * 60) * 1000 : 0
  const minsLeft = Math.max(0, Math.ceil((readyAt - now) / 60000))

  const copy = async (text: string, which: 'link' | 'hash') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error('Could not copy. Select and copy it manually.')
    }
  }

  const share = async () => {
    if (!link) return
    const data = { title: 'DzSuya receipt', text: `Receipt for order #${orderId}`, url: link }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(data)
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    void copy(link, 'link')
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Receipt for order ${orderId.toString()}`} className="fixed inset-0 z-50 overflow-y-auto bg-coal-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-ember-600/25 to-transparent" />
      <div className="relative mx-auto max-w-md px-4 pb-24 pt-3">
        <div className="flex items-center justify-between py-2">
          <button onClick={onClose} className="btn-ghost focus-ring flex h-11 items-center gap-2 rounded-full pl-3 pr-4 text-sm">
            <ArrowLeft className="size-4" /> {justPaid ? 'Back to menu' : 'Close'}
          </button>
          <span className="eyebrow text-cream-300">Digital receipt</span>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-28 text-cream-300">
            <Loader2 className="size-8 animate-spin text-ember-400" />
            Loading receipt from Arc…
          </div>
        )}

        {!isLoading && (isError || !order) && (
          <div className="surface mt-10 rounded-3xl p-6 text-center">
            {revertName(error) === 'OrderNotFound' ? (
              <>
                <h2 className="display text-xl font-bold text-cream-50">Receipt not found</h2>
                <p className="mt-2 text-sm text-cream-300">
                  Order #{orderId.toString()} does not exist on {CHAIN_NAME}. Check the link and try again.
                </p>
              </>
            ) : (
              <>
                <h2 className="display text-xl font-bold text-cream-50">Could not load this receipt</h2>
                <p className="mt-2 text-sm text-cream-300">The network did not answer. Your payment is not affected.</p>
                <button onClick={() => void refetch()} className="btn-ghost focus-ring mt-4 min-h-[48px] rounded-2xl px-5 text-sm">
                  Try again
                </button>
              </>
            )}
          </div>
        )}

        {order && (
          <>
            <motion.div
              initial={justPaid ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="mb-4 mt-2 flex flex-col items-center text-center"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-leaf-500 text-white shadow-[0_10px_40px_-10px_rgba(63,178,106,0.7)]">
                <Check className="size-9" strokeWidth={3} />
              </span>
              <h1 className="display mt-3 text-3xl font-bold text-cream-50">
                {justPaid ? 'Payment confirmed' : 'Order receipt'}
              </h1>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3 py-1.5 text-xs font-bold text-gold-300">
                <BadgeCheck className="size-4" /> Paid with USDC on Arc
              </span>
            </motion.div>

            {check && !check.ok && (
              <div role="alert" className="mb-3 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-3.5 text-sm text-gold-300">
                {check.reason === 'unreadable'
                  ? 'Some items on this order could not be read, so the shop may need to confirm it with you.'
                  : `The amount paid (${usd(order.amount)} USDC) does not match the menu price of these items (${usd(check.expected)} USDC). The shop may ask you to settle the difference.`}
              </div>
            )}

            <article
              className="relative overflow-hidden rounded-[26px] shadow-2xl"
              style={{ background: '#FFF8EC', color: INK }}
            >
              <div className="h-2 bg-gradient-to-r from-chili-500 via-ember-500 to-gold-400" />
              <div className="p-5">
                <header className="flex items-center gap-3">
                  <Logo size={48} />
                  <div className="leading-tight">
                    <div className="display text-lg font-bold">DzSuya</div>
                    <div className="text-xs font-semibold opacity-80">Professor Dozzie's</div>
                    <div className="text-xs opacity-65">{PICKUP.address}</div>
                  </div>
                </header>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="eyebrow opacity-55">Order</div>
                    <div className="display text-3xl font-bold tabular-nums">#{order.id.toString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="eyebrow opacity-55">Total paid</div>
                    <div className="display flex items-center justify-end gap-1.5 text-3xl font-bold tabular-nums">
                      <TokenUSDC variant="branded" size={24} />
                      {usd(order.amount)}
                    </div>
                    <Fiat raw={order.amount} prefix="≈ " className="text-xs font-semibold opacity-70" />
                    <div className="text-[10px] opacity-55">at today's rate</div>
                  </div>
                </div>

                <ul className="mt-5 space-y-3">
                  {lines.map((l, i) => (
                    <li key={i} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-bold">
                          {l.qty} × {l.itemName}
                        </div>
                        <div className="text-xs opacity-65">
                          {l.sizeLabel} · {l.spiceLabel}
                          {l.extraLabels.length > 0 && ` · ${l.extraLabels.join(', ')}`}
                        </div>
                        {l.note && <div className="break-words text-xs italic opacity-80">"{l.note}"</div>}
                      </div>
                      <div className="font-semibold tabular-nums">{usd(l.total)}</div>
                    </li>
                  ))}
                  {lines.length === 0 && <li className="text-sm opacity-65">Item details unavailable for this order.</li>}
                </ul>
              </div>

              <Perforation />

              <div className="space-y-5 p-5">
                <StatusTracker status={order.status} paper />
                <div className="flex items-center gap-2 rounded-xl bg-[#2A1A10]/[0.06] px-3 py-2.5 text-sm font-semibold">
                  <Clock className="size-4 shrink-0 text-ember-600" />
                  {order.status >= 2
                    ? 'Your suya is ready. Come get it while it is hot.'
                    : minsLeft > 0
                      ? `Ready in ~${minsLeft} min (around ${formatClock(readyAt)})`
                      : 'Almost ready. The grill is working on it.'}
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ember-600" />
                  <div>
                    <div className="font-bold">
                      Pickup at {PICKUP.name}, {PICKUP.address}
                    </div>
                    <div className="text-xs opacity-65 text-pretty">{PICKUP.note}</div>
                  </div>
                </div>
              </div>

              <Perforation />

              <div className="space-y-2.5 p-5 text-sm">
                <Meta label="Paid on" value={formatStamp(order.createdAt)} />
                <Meta label="Network" value={CHAIN_NAME} />
                <Meta label="Wallet" value={shortAddr(order.customer)} mono />
                <div className="flex items-start justify-between gap-3">
                  <span className="opacity-60">Transaction</span>
                  {hash ? (
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{shortHash(hash)}</span>
                      <button onClick={() => void copy(hash, 'hash')} aria-label="Copy transaction hash" className="focus-ring flex size-8 items-center justify-center rounded-full bg-[#2A1A10]/[0.07]">
                        {copied === 'hash' ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </button>
                      <a href={txUrl(hash)} target="_blank" rel="noopener noreferrer" aria-label="View transaction on explorer" className="focus-ring flex size-8 items-center justify-center rounded-full bg-[#2A1A10]/[0.07]">
                        <ExternalLink className="size-4" />
                      </a>
                    </span>
                  ) : SHOP_ADDRESS ? (
                    <a href={addressUrl(SHOP_ADDRESS)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold underline">
                      Recorded in shop contract <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>

              <Perforation />

              <div className="flex flex-col items-center gap-2 p-5 pb-6">
                <div className="flex size-44 items-center justify-center rounded-2xl bg-[#FFF8EC] p-1 ring-1 ring-[#2A1A10]/10">
                  {qr ? <img src={qr} alt={`QR code linking to receipt for order ${order.id}`} className="size-full" /> : <Loader2 className="size-6 animate-spin opacity-50" />}
                </div>
                <p className="text-center text-xs opacity-65">Show this at the grill. Scanning opens this live receipt.</p>
              </div>
            </article>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => link && void copy(link, 'link')} disabled={!link} className="btn-ghost focus-ring flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm">
                {copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === 'link' ? 'Copied' : 'Copy link'}
              </button>
              <button onClick={() => void share()} disabled={!link} className="btn-primary focus-ring flex min-h-[52px] items-center justify-center gap-2 rounded-2xl text-sm">
                <Share2 className="size-4" /> Share receipt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="opacity-60">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : 'font-semibold'}`}>{value}</span>
    </div>
  )
}

/** Tear-off line with notched edges. */
function Perforation() {
  return (
    <div className="relative h-0">
      <span className="absolute -left-3 -top-3 size-6 rounded-full bg-coal-950" />
      <span className="absolute -right-3 -top-3 size-6 rounded-full bg-coal-950" />
      <div className="mx-5 border-t-2 border-dashed" style={{ borderColor: 'rgba(42,26,16,0.2)' }} />
    </div>
  )
}
