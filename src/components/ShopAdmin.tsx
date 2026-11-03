import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { isAddress, zeroAddress, type Address } from 'viem'
import { toast } from 'sonner'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, SHOP_ABI, SHOP_ADDRESS } from '@/lib/chain'
import { parseTxError } from '@/lib/errors'
import { shortAddr } from '@/lib/format'

function useShopAdmin() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const run = async (action: { type: 'propose'; to: Address } | { type: 'accept' }, success: string) => {
    if (busy || !address || !client || !SHOP_ADDRESS) return false
    setBusy(true)
    try {
      if (chainId !== CHAIN_ID) await switchChainAsync({ chainId: CHAIN_ID })
      let hash: `0x${string}`
      if (action.type === 'propose') {
        await client.simulateContract({
          account: address,
          address: SHOP_ADDRESS,
          abi: SHOP_ABI,
          functionName: 'proposeShop',
          args: [action.to],
        })
        hash = await writeContractAsync({
          address: SHOP_ADDRESS,
          abi: SHOP_ABI,
          functionName: 'proposeShop',
          args: [action.to],
          chainId: CHAIN_ID,
        })
      } else {
        await client.simulateContract({ account: address, address: SHOP_ADDRESS, abi: SHOP_ABI, functionName: 'acceptShop' })
        hash = await writeContractAsync({ address: SHOP_ADDRESS, abi: SHOP_ABI, functionName: 'acceptShop', chainId: CHAIN_ID })
      }
      const receipt = await client.waitForTransactionReceipt({ hash, timeout: 90_000 })
      if (receipt.status !== 'success') throw new Error('reverted')
      await queryClient.invalidateQueries({ queryKey: ['readContract'] })
      toast.success(success)
      return true
    } catch (e) {
      const parsed = parseTxError(e)
      if (!parsed.cancelled) toast.error(parsed.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { run, busy }
}

/** Shown to the wallet that was proposed as the new shop owner. */
export function AcceptShop() {
  const { run, busy } = useShopAdmin()
  return (
    <button
      onClick={() => void run({ type: 'accept' }, 'You are now the shop wallet')}
      disabled={busy}
      className="btn-primary focus-ring mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-6 text-sm"
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      Accept shop ownership
    </button>
  )
}

/** Shop wallet settings: hand the shop over to another wallet in two steps. */
export function ShopSettings({ pending }: { pending: string | undefined }) {
  const { run, busy } = useShopAdmin()
  const [next, setNext] = useState('')
  const hasPending = !!pending && pending !== zeroAddress
  const valid = isAddress(next)

  return (
    <details className="surface rounded-2xl p-4 text-sm">
      <summary className="focus-ring cursor-pointer rounded font-semibold text-cream-100">Shop wallet settings</summary>
      <div className="mt-3 space-y-3">
        <p className="text-cream-300 text-pretty">
          Payments go to the current shop wallet. To move the shop, propose a new wallet. It only takes over after that wallet
          accepts, so a typo cannot lock you out.
        </p>
        {hasPending && (
          <div className="rounded-xl bg-gold-400/10 p-3 text-gold-300">
            Waiting for <span className="font-mono">{shortAddr(pending)}</span> to accept.
            <button
              onClick={() => void run({ type: 'propose', to: zeroAddress }, 'Handover cancelled')}
              disabled={busy}
              className="btn-ghost focus-ring ml-3 min-h-[40px] rounded-full px-4 text-xs"
            >
              Cancel
            </button>
          </div>
        )}
        <label htmlFor="new-shop" className="eyebrow block text-cream-300">
          New shop wallet
        </label>
        <input
          id="new-shop"
          value={next}
          onChange={(e) => setNext(e.target.value.trim())}
          placeholder="0x…"
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={next.length > 0 && !valid}
          className="focus-ring min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 font-mono text-xs text-cream-50"
        />
        <button
          onClick={() => void run({ type: 'propose', to: next as Address }, 'Handover proposed').then((ok) => ok && setNext(''))}
          disabled={busy || !valid}
          className="btn-ghost focus-ring flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-sm"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Propose handover
        </button>
      </div>
    </details>
  )
}
