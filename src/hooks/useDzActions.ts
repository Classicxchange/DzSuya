import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, type Address } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, USDC_ADDRESS } from '@/lib/chain'
import { DZID_ABI, DZID_ADDRESS, MEMO_MAX_BYTES } from '@/lib/dzid'
import { CheckoutError, parseTxError } from '@/lib/errors'

export type DzPhase = 'idle' | 'switching' | 'wallet' | 'confirming' | 'approving' | 'approving-confirm'

export interface DzSendResult {
  hash: `0x${string}`
  to: Address
  name: string
  amount: bigint
}

function useDzBase() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<DzPhase>('idle')
  const [error, setError] = useState<string | null>(null)

  const ensureChain = useCallback(async () => {
    if (chainId !== CHAIN_ID) {
      setPhase('switching')
      await switchChainAsync({ chainId: CHAIN_ID })
    }
  }, [chainId, switchChainAsync])

  const refresh = useCallback(() => queryClient.invalidateQueries(), [queryClient])

  return { address, client, writeContractAsync, ensureChain, refresh, phase, setPhase, error, setError }
}

/** Claim a DZ ID for the connected wallet. */
export function useClaimName() {
  const base = useDzBase()
  const { address, client, writeContractAsync, ensureChain, refresh, setPhase, setError } = base

  const claim = useCallback(
    async (name: string): Promise<boolean> => {
      setError(null)
      try {
        if (!address || !client || !DZID_ADDRESS) throw new CheckoutError('NO_SHOP', 'Connect your wallet first.')
        await ensureChain()
        setPhase('wallet')
        const hash = await writeContractAsync({
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'claim',
          args: [name],
          chainId: CHAIN_ID,
        })
        setPhase('confirming')
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'That name could not be claimed. It may have just been taken.')
        await refresh()
        return true
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return false
      } finally {
        setPhase('idle')
      }
    },
    [address, client, writeContractAsync, ensureChain, refresh, setPhase, setError],
  )

  return { claim, phase: base.phase, busy: base.phase !== 'idle', error: base.error }
}

/** Send USDC to a DZ ID. The registry forwards it to the owner's wallet in the same transaction. */
export function useSendToName() {
  const base = useDzBase()
  const { address, client, writeContractAsync, ensureChain, refresh, setPhase, setError } = base

  const send = useCallback(
    async (name: string, amount: bigint, memo: string): Promise<DzSendResult | null> => {
      setError(null)
      try {
        if (!address || !client || !DZID_ADDRESS) throw new CheckoutError('NO_SHOP', 'Connect your wallet first.')
        if (new TextEncoder().encode(memo).length > MEMO_MAX_BYTES) {
          throw new CheckoutError('TOO_LARGE', 'That note is too long.')
        }
        await ensureChain()

        const balance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        if (balance < amount) throw new CheckoutError('INSUFFICIENT_USDC', 'You do not have enough USDC for this payment.')

        const allowance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, DZID_ADDRESS],
        })
        if (allowance < amount) {
          setPhase('approving')
          const approveHash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [DZID_ADDRESS, amount],
            chainId: CHAIN_ID,
          })
          setPhase('approving-confirm')
          const approval = await client.waitForTransactionReceipt({ hash: approveHash })
          if (approval.status !== 'success') throw new CheckoutError('REVERTED', 'The USDC allowance did not go through.')
        }

        setPhase('wallet')
        const to = await client.readContract({
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'ownerOf',
          args: [name],
        })
        const hash = await writeContractAsync({
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'sendToName',
          args: [name, amount, memo],
          chainId: CHAIN_ID,
        })
        setPhase('confirming')
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'The payment failed on the network. Nothing was sent.')
        await refresh()
        return { hash, to, name, amount }
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return null
      } finally {
        setPhase('idle')
      }
    },
    [address, client, writeContractAsync, ensureChain, refresh, setPhase, setError],
  )

  return { send, phase: base.phase, busy: base.phase !== 'idle', error: base.error }
}
