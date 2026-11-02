import { useCallback, useState } from 'react'
import { erc20Abi, parseEventLogs } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, SHOP_ABI, SHOP_ADDRESS, USDC_ADDRESS, saveOrderTx } from '@/lib/chain'
import { CheckoutError, parseTxError } from '@/lib/errors'
import { MAX_DETAILS_BYTES, cartTotal, encodeOrder, type CartLine } from '@/lib/menu'

export type CheckoutPhase =
  | 'idle'
  | 'switching'
  | 'approving'
  | 'approving-confirm'
  | 'ordering'
  | 'ordering-confirm'

export interface PlacedOrder {
  id: bigint
  hash: `0x${string}`
}

export function useCheckout() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const [phase, setPhase] = useState<CheckoutPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null)

  const busy = phase !== 'idle'

  const pay = useCallback(
    async (lines: CartLine[]): Promise<PlacedOrder | null> => {
      setError(null)
      setApproveHash(null)
      try {
        if (!address || !client) throw new CheckoutError('REVERTED', 'Connect your wallet first.')
        if (!SHOP_ADDRESS) throw new CheckoutError('NO_SHOP', 'The shop is not open for orders yet.')

        const total = cartTotal(lines)
        const details = encodeOrder(lines)
        if (new TextEncoder().encode(details).length > MAX_DETAILS_BYTES) {
          throw new CheckoutError('TOO_LARGE', 'This order is too long. Shorten your notes or remove an item.')
        }

        if (chainId !== CHAIN_ID) {
          setPhase('switching')
          await switchChainAsync({ chainId: CHAIN_ID })
        }

        const balance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        if (balance < total) {
          throw new CheckoutError('INSUFFICIENT_USDC', 'You do not have enough USDC for this order yet.')
        }

        const allowance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, SHOP_ADDRESS],
        })

        if (allowance < total) {
          setPhase('approving')
          const hash = await writeContractAsync({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [SHOP_ADDRESS, total],
            chainId: CHAIN_ID,
          })
          setApproveHash(hash)
          setPhase('approving-confirm')
          const approval = await client.waitForTransactionReceipt({ hash })
          if (approval.status !== 'success') throw new CheckoutError('REVERTED', 'The USDC allowance did not go through.')
        }

        setPhase('ordering')
        const hash = await writeContractAsync({
          address: SHOP_ADDRESS,
          abi: SHOP_ABI,
          functionName: 'placeOrder',
          args: [total, details],
          chainId: CHAIN_ID,
        })
        setPhase('ordering-confirm')
        const receipt = await client.waitForTransactionReceipt({ hash })
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'The payment failed on the network.')

        const [placed] = parseEventLogs({ abi: SHOP_ABI, logs: receipt.logs, eventName: 'OrderPlaced' })
        if (!placed) throw new CheckoutError('REVERTED', 'Payment confirmed but the order could not be read. Check My Orders.')

        saveOrderTx(placed.args.id, hash)
        return { id: placed.args.id, hash }
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return null
      } finally {
        setPhase('idle')
      }
    },
    [address, chainId, client, switchChainAsync, writeContractAsync],
  )

  return { pay, phase, busy, error, approveHash, clearError: () => setError(null) }
}
