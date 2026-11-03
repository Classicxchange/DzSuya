import { useState } from 'react'
import { useModal } from 'connectkit'
import { ArrowUpRight, BadgeCheck, Check, ExternalLink, Loader2, Send, X } from 'lucide-react'
import { TokenUSDC } from '@web3icons/react'
import { useAccount } from 'wagmi'
import { Fiat } from '@/components/Fiat'
import { useDebounced, useNameOwner } from '@/hooks/useDzId'
import { useSendToName, type DzSendResult } from '@/hooks/useDzActions'
import { useUsdcBalance } from '@/hooks/useShop'
import { CHAIN_ID, GAS_RESERVE, txUrl } from '@/lib/chain'
import { DZID_ADDRESS, MEMO_MAX_BYTES, displayName, nameProblem, normalizeName } from '@/lib/dzid'
import { shortAddr, usd } from '@/lib/format'
import { parseAmount } from '@/onchain-money'

const QUICK = ['1', '5', '10', '25']

function parseInput(value: string): bigint | null {
  if (!/^\d*\.?\d*$/.test(value) || value === '' || value === '.') return null
  try {
    const amount = parseAmount(CHAIN_ID, value).raw
    return amount > 0n ? amount : null
  } catch {
    return null
  }
}

export function SendCard({ initialName }: { initialName?: string }) {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const { data: balance } = useUsdcBalance(address)
  const [draft, setDraft] = useState(initialName ?? '')
  const [amountText, setAmountText] = useState('')
  const [memo, setMemo] = useState('')
  const [done, setDone] = useState<DzSendResult | null>(null)
  const { send, busy, phase, error } = useSendToName()

  const name = normalizeName(draft)
  const debounced = useDebounced(name)
  const problem = nameProblem(name)
  const lookup = useNameOwner(debounced)
  const resolving = !problem && name.length >= 3 && (name !== debounced || lookup.isFetching)
  const owner = name === debounced ? lookup.owner : undefined
  const notFound = !problem && name === debounced && name.length >= 3 && !resolving && lookup.data !== undefined && !lookup.owner
  const isSelf = !!owner && !!address && owner.toLowerCase() === address.toLowerCase()

  const amount = parseInput(amountText)
  const memoBytes = new TextEncoder().encode(memo).length
  const short = amount !== null && balance !== undefined && balance < amount + GAS_RESERVE
  const ready = !!owner && !isSelf && amount !== null && !short && memoBytes <= MEMO_MAX_BYTES

  if (!DZID_ADDRESS) return null

  if (done) {
    return (
      <section className="surface rounded-3xl p-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-leaf-500 text-white shadow-[0_10px_40px_-10px_rgba(63,178,106,0.7)]">
          <Check className="size-9" strokeWidth={3} />
        </span>
        <h2 className="display mt-4 text-2xl font-bold text-cream-50">Sent</h2>
        <div className="display mt-1 flex items-center justify-center gap-1.5 text-3xl font-bold tabular-nums text-gold-300">
          <TokenUSDC variant="branded" size={26} />
          {usd(done.amount)}
        </div>
        <Fiat raw={done.amount} className="text-sm text-cream-200" />
        <p className="mt-2 text-sm text-cream-200">
          to <strong className="text-cream-50">{displayName(done.name)}</strong>
        </p>
        <p className="mt-1 font-mono text-xs text-cream-300">Delivered to {shortAddr(done.to)}</p>
        <a
          href={txUrl(done.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ember-400 underline"
        >
          View transaction <ExternalLink className="size-3" />
        </a>
        <button
          onClick={() => {
            setDone(null)
            setAmountText('')
            setMemo('')
          }}
          className="btn-ghost focus-ring mt-5 block min-h-[52px] w-full rounded-2xl text-sm"
        >
          Send another
        </button>
      </section>
    )
  }

  const onSend = async () => {
    if (!isConnected) {
      setOpen(true)
      return
    }
    if (!ready || amount === null) return
    const result = await send(name, amount, memo.trim())
    if (result) setDone(result)
  }

  const label = !isConnected
    ? 'Connect wallet to send'
    : phase === 'checking'
      ? 'Checking…'
      : phase === 'switching'
      ? 'Switching network…'
      : phase === 'approving'
        ? 'Allow USDC in your wallet…'
        : phase === 'approving-confirm'
          ? 'Confirming allowance…'
          : phase === 'wallet'
            ? 'Confirm in your wallet…'
            : phase === 'confirming'
              ? 'Sending…'
              : amount !== null
                ? `Send ${usd(amount)} USDC`
                : 'Send USDC'

  return (
    <section className="surface rounded-3xl p-5">
      <div className="eyebrow text-ember-400">Pay by name</div>
      <h2 className="display mt-1 text-2xl font-bold text-cream-50">Send USDC to a DZ ID</h2>

      <label htmlFor="dz-to" className="eyebrow mt-4 block text-cream-300">
        To
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 focus-within:border-ember-500">
        <span className="display text-xl font-bold text-ember-400">@</span>
        <input
          id="dz-to"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={21}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="their name"
          disabled={busy}
          className="min-h-[56px] w-full bg-transparent text-lg font-semibold text-cream-50 outline-none placeholder:text-cream-300/40"
        />
        <span className="shrink-0">
          {resolving && <Loader2 className="size-5 animate-spin text-cream-300" />}
          {owner && !isSelf && <BadgeCheck className="size-5 text-leaf-400" />}
          {(notFound || isSelf || (problem && name.length > 0)) && <X className="size-5 text-chili-500" />}
        </span>
      </div>
      <p className="mt-2 min-h-5 text-xs" role="status">
        {problem && name.length > 0 && <span className="text-chili-500">{problem}</span>}
        {notFound && <span className="text-chili-500">No one has claimed {displayName(name)} yet.</span>}
        {isSelf && <span className="text-chili-500">That is your own DZ ID. Pick someone else.</span>}
        {lookup.isError && !resolving && <span className="text-chili-500">Could not check that name. Try again.</span>}
        {owner && !isSelf && (
          <span className="text-leaf-400">
            {displayName(name)} is <span className="break-all font-mono">{owner}</span>
          </span>
        )}
      </p>

      <label htmlFor="dz-amount" className="eyebrow mt-3 block text-cream-300">
        Amount
      </label>
      <div className="mt-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 pb-3 pt-2 focus-within:border-ember-500">
        <div className="flex items-center gap-2">
          <input
            id="dz-amount"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              if (/^\d*\.?\d{0,6}$/.test(v)) setAmountText(v)
            }}
            placeholder="0.00"
            disabled={busy}
            className="display min-h-[52px] w-full bg-transparent text-4xl font-bold tabular-nums text-cream-50 outline-none placeholder:text-cream-300/30"
          />
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-cream-200">
            <TokenUSDC variant="branded" size={20} /> USDC
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-cream-300">
          <span>{amount !== null ? <Fiat raw={amount} /> : 'Enter an amount'}</span>
          <span className="tabular-nums">Balance: {balance !== undefined ? usd(balance) : '–'}</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setAmountText(q)}
            disabled={busy}
            className="btn-ghost focus-ring min-h-[40px] flex-1 rounded-full text-sm tabular-nums"
          >
            {q}
          </button>
        ))}
      </div>
      {short && (
        <p className="mt-2 text-xs text-gold-300">
          You have {balance !== undefined ? usd(balance) : '0.00'} USDC. Keep about 0.05 USDC extra for network fees, or use
          the Get test USDC button in the Arc Studio sidebar to top up.
        </p>
      )}

      <label htmlFor="dz-memo" className="eyebrow mt-3 block text-cream-300">
        Note (optional)
      </label>
      <input
        id="dz-memo"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="For the suya, thanks!"
        disabled={busy}
        className="focus-ring mt-1.5 min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-cream-50 placeholder:text-cream-300/40"
      />
      {memoBytes > MEMO_MAX_BYTES && <p className="mt-1 text-xs text-chili-500">Keep the note under {MEMO_MAX_BYTES} bytes.</p>}

      {error && (
        <div role="alert" className="mt-3 rounded-xl bg-chili-500/15 p-3 text-sm text-cream-50">
          {error}
        </div>
      )}

      <button
        onClick={() => void onSend()}
        disabled={busy || (isConnected && !ready)}
        className="btn-primary focus-ring mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base"
      >
        {busy ? <Loader2 className="size-5 animate-spin" /> : isConnected ? <Send className="size-5" /> : <ArrowUpRight className="size-5" />}
        {label}
      </button>
      <p className="mt-2 text-center text-[11px] text-cream-300/80 text-pretty">
        Your USDC goes through the DZ ID contract and lands in their wallet in the same transaction. The first payment asks
        for an allowance, then the send.
      </p>
    </section>
  )
}
