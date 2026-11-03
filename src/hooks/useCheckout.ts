import { useCallback, useRef, useState } from 'react'
import { erc20Abi, parseEventLogs } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, GAS_RESERVE, MAX_ORDER_RAW, SHOP_ABI, SHOP_ADDRESS, USDC_ADDRESS, saveOrderTx } from '@/lib/chain'
import { CheckoutError, parseTxError } from '@/lib/errors'
import { formatUsdcShort } from '@/lib/format'
import { MAX_DETAILS_BYTES, cartTotal, encodeOrder, type CartLine } from '@/lib/menu'

export type CheckoutPhase =
  | 'idle'
  | 'checking'
  | 'switching'
  | 'approving'
  | 'approving-confirm'
  | 'ordering'
  | 'ordering-confirm'

export interface PlacedOrder {
  id: bigint
  hash: `0x${string}`
}

const RECEIPT_TIMEOUT_MS = 90_000

export function useCheckout() {
  const { address, chainId } = useAccount()
  const client = usePublicClient({ chainId: CHAIN_ID })
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const [phase, setPhase] = useState<CheckoutPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null)
  const lock = useRef(false)

  const busy = phase !== 'idle'

  const pay = useCallback(
    async (lines: CartLine[]): Promise<PlacedOrder | null> => {
      // Synchronous lock: a second tap before React re-renders must not start a second payment.
      if (lock.current) return null
      lock.current = true
      setError(null)
      setApproveHash(null)
      setPhase('checking')
      try {
        if (!address || !client) throw new CheckoutError('REVERTED', 'Connect your wallet first.')
        if (!SHOP_ADDRESS) throw new CheckoutError('NO_SHOP', 'The shop is not open for orders yet.')

        const total = cartTotal(lines)
        const details = encodeOrder(lines)
        if (total <= 0n) throw new CheckoutError('TOO_LARGE', 'Your order is empty.')
        if (total > MAX_ORDER_RAW) {
          throw new CheckoutError('TOO_LARGE', `Orders are limited to ${formatUsdcShort(MAX_ORDER_RAW)} USDC. Split this into two orders.`)
        }
        if (new TextEncoder().encode(details).length > MAX_DETAILS_BYTES) {
          throw new CheckoutError('TOO_LARGE', 'This order is too long. Shorten your notes or remove an item.')
        }

        if (chainId !== CHAIN_ID) {
          setPhase('switching')
          await switchChainAsync({ chainId: CHAIN_ID })
          setPhase('checking')
        }

        const balance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        if (balance < total + GAS_RESERVE) {
          throw new CheckoutError(
            'INSUFFICIENT_USDC',
            `You need about ${formatUsdcShort(total + GAS_RESERVE)} USDC: the order plus a little for network fees.`,
          )
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
          const approval = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS })
          if (approval.status !== 'success') throw new CheckoutError('REVERTED', 'The USDC allowance did not go through.')
        }

        // Dry run so a revert is explained before the wallet asks for a signature.
        await client.simulateContract({
          account: address,
          address: SHOP_ADDRESS,
          abi: SHOP_ABI,
          functionName: 'placeOrder',
          args: [total, details],
        })

        setPhase('ordering')
        const hash = await writeContractAsync({
          address: SHOP_ADDRESS,
          abi: SHOP_ABI,
          functionName: 'placeOrder',
          args: [total, details],
          chainId: CHAIN_ID,
        })
        setPhase('ordering-confirm')
        let receipt
        try {
          receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS })
        } catch {
          throw new CheckoutError(
            'PENDING',
            'Your payment was sent but has not confirmed yet. Check the Orders tab before paying again.',
          )
        }
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'The payment failed on the network. Nothing was charged.')

        const [placed] = parseEventLogs({ abi: SHOP_ABI, logs: receipt.logs, eventName: 'OrderPlaced' })
        if (!placed) throw new CheckoutError('PENDING', 'Payment confirmed but the receipt could not be read. Check the Orders tab.')

        saveOrderTx(placed.args.id, hash)
        return { id: placed.args.id, hash }
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return null
      } finally {
        lock.current = false
        setPhase('idle')
      }
    },
    [address, chainId, client, switchChainAsync, writeContractAsync],
  )

  return { pay, phase, busy, error, approveHash, clearError: () => setError(null) }
}
