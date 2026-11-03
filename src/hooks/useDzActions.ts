import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { erc20Abi, toHex, zeroAddress, type Address } from 'viem'
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from 'wagmi'
import { CHAIN_ID, GAS_RESERVE, USDC_ADDRESS } from '@/lib/chain'
import { DZID_ABI, DZID_ADDRESS, MAX_COMMIT_AGE, MEMO_MAX_BYTES, MIN_COMMIT_AGE } from '@/lib/dzid'
import { CheckoutError, parseTxError, revertName } from '@/lib/errors'
import { formatUsdcShort } from '@/lib/format'

export type DzPhase =
  | 'idle'
  | 'checking'
  | 'switching'
  | 'committing'
  | 'commit-confirm'
  | 'waiting'
  | 'approving'
  | 'approving-confirm'
  | 'wallet'
  | 'confirming'

export interface DzSendResult {
  hash: `0x${string}`
  to: Address
  name: string
  amount: bigint
}

const RECEIPT_TIMEOUT_MS = 90_000
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

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
      setPhase('checking')
    }
  }, [chainId, switchChainAsync])

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['readContract'] }),
      queryClient.invalidateQueries({ queryKey: ['dz-activity'] }),
    ])
  }, [queryClient])

  return { address, client, writeContractAsync, ensureChain, refresh, phase, setPhase, error, setError }
}

interface PendingClaim {
  name: string
  salt: `0x${string}`
  commitment: `0x${string}`
}

const claimKey = (address: Address) => `suya:claim:${DZID_ADDRESS}:${address.toLowerCase()}`

function loadPending(address: Address): PendingClaim | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(claimKey(address)) ?? 'null') as PendingClaim | null
    return parsed && /^0x[0-9a-fA-F]{64}$/.test(parsed.salt) && /^0x[0-9a-fA-F]{64}$/.test(parsed.commitment) ? parsed : null
  } catch {
    return null
  }
}

function savePending(address: Address, pending: PendingClaim | null): void {
  try {
    if (pending) localStorage.setItem(claimKey(address), JSON.stringify(pending))
    else localStorage.removeItem(claimKey(address))
  } catch {
    /* storage unavailable */
  }
}

/**
 * Claim a DZ ID in two steps so nobody watching the network can grab the name first:
 * reserve it with a hidden commitment, wait a few seconds, then reveal it.
 */
export function useClaimName() {
  const base = useDzBase()
  const { address, client, writeContractAsync, ensureChain, refresh, setPhase, setError } = base
  const lock = useRef(false)

  const claim = useCallback(
    async (name: string): Promise<boolean> => {
      if (lock.current) return false
      lock.current = true
      setError(null)
      setPhase('checking')
      try {
        if (!address || !client || !DZID_ADDRESS) throw new CheckoutError('NO_SHOP', 'Connect your wallet first.')
        await ensureChain()

        const [owner, existing] = await Promise.all([
          client.readContract({ address: DZID_ADDRESS, abi: DZID_ABI, functionName: 'ownerOf', args: [name] }),
          client.readContract({ address: DZID_ADDRESS, abi: DZID_ABI, functionName: 'nameOf', args: [address] }),
        ])
        if (owner !== zeroAddress) throw new CheckoutError('REVERTED', 'That DZ ID was just taken. Try another.')
        if (existing) throw new CheckoutError('REVERTED', 'This wallet already has a DZ ID.')

        // Reuse a saved reservation for the same name (survives a page reload), otherwise start a new one.
        let pending = loadPending(address)
        if (!pending || pending.name !== name) {
          const salt = toHex(crypto.getRandomValues(new Uint8Array(32)))
          const commitment = await client.readContract({
            address: DZID_ADDRESS,
            abi: DZID_ABI,
            functionName: 'makeCommitment',
            args: [name, address, salt],
          })
          pending = { name, salt, commitment }
          savePending(address, pending)
        }

        const registry: Address = DZID_ADDRESS
        const readCommittedAt = () =>
          client.readContract({ address: registry, abi: DZID_ABI, functionName: 'commitments', args: [pending.commitment] })

        let committedAt = await readCommittedAt()
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000))
        if (committedAt === 0n || nowSeconds > committedAt + BigInt(MAX_COMMIT_AGE)) {
          setPhase('committing')
          await client.simulateContract({
            account: address,
            address: DZID_ADDRESS,
            abi: DZID_ABI,
            functionName: 'commit',
            args: [pending.commitment],
          })
          const commitHash = await writeContractAsync({
            address: DZID_ADDRESS,
            abi: DZID_ABI,
            functionName: 'commit',
            args: [pending.commitment],
            chainId: CHAIN_ID,
          })
          setPhase('commit-confirm')
          const committed = await client.waitForTransactionReceipt({ hash: commitHash, timeout: RECEIPT_TIMEOUT_MS })
          if (committed.status !== 'success') throw new CheckoutError('REVERTED', 'The name reservation did not go through.')
          committedAt = await readCommittedAt()
        }

        // The reservation has to age a few seconds before it can be revealed.
        setPhase('waiting')
        const readyAt = Number(committedAt) + MIN_COMMIT_AGE + 1
        while (Date.now() / 1000 < readyAt) await sleep(500)

        // Re-check that nobody took the name while we waited, so a reveal is not wasted.
        const stillFree = await client.readContract({ address: DZID_ADDRESS, abi: DZID_ABI, functionName: 'ownerOf', args: [name] })
        if (stillFree !== zeroAddress) {
          savePending(address, null)
          throw new CheckoutError('REVERTED', 'That DZ ID was just taken. Try another.')
        }

        // Block time can trail the clock slightly, so retry the dry run briefly if the contract says "too new".
        let attempts = 0
        for (;;) {
          try {
            await client.simulateContract({
              account: address,
              address: DZID_ADDRESS,
              abi: DZID_ABI,
              functionName: 'claim',
              args: [name, pending.salt],
            })
            break
          } catch (e) {
            if (revertName(e) === 'CommitmentTooNew' && attempts < 8) {
              attempts += 1
              await sleep(1500)
              continue
            }
            if (revertName(e) === 'CommitmentExpired' || revertName(e) === 'NoCommitment') savePending(address, null)
            throw e
          }
        }

        setPhase('wallet')
        const hash = await writeContractAsync({
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'claim',
          args: [name, pending.salt],
          chainId: CHAIN_ID,
        })
        setPhase('confirming')
        let receipt
        try {
          receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS })
        } catch {
          throw new CheckoutError('PENDING', 'Your claim was sent but has not confirmed yet. Refresh in a moment to see your DZ ID.')
        }
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'That name could not be claimed. It may have just been taken.')
        savePending(address, null)
        await refresh()
        return true
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return false
      } finally {
        lock.current = false
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
  const lock = useRef(false)

  const send = useCallback(
    async (name: string, amount: bigint, memo: string): Promise<DzSendResult | null> => {
      if (lock.current) return null
      lock.current = true
      setError(null)
      setPhase('checking')
      try {
        if (!address || !client || !DZID_ADDRESS) throw new CheckoutError('NO_SHOP', 'Connect your wallet first.')
        if (new TextEncoder().encode(memo).length > MEMO_MAX_BYTES) {
          throw new CheckoutError('TOO_LARGE', `Keep the note under ${MEMO_MAX_BYTES} characters.`)
        }
        if (amount <= 0n) throw new CheckoutError('TOO_LARGE', 'Enter an amount to send.')
        await ensureChain()

        const balance = await client.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        })
        if (balance < amount + GAS_RESERVE) {
          throw new CheckoutError(
            'INSUFFICIENT_USDC',
            `You need about ${formatUsdcShort(amount + GAS_RESERVE)} USDC: the payment plus a little for network fees.`,
          )
        }

        const to = await client.readContract({ address: DZID_ADDRESS, abi: DZID_ABI, functionName: 'ownerOf', args: [name] })
        if (to === zeroAddress) throw new CheckoutError('REVERTED', 'No one has claimed that DZ ID yet.')

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
          const approval = await client.waitForTransactionReceipt({ hash: approveHash, timeout: RECEIPT_TIMEOUT_MS })
          if (approval.status !== 'success') throw new CheckoutError('REVERTED', 'The USDC allowance did not go through.')
        }

        await client.simulateContract({
          account: address,
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'sendToName',
          args: [name, amount, memo],
        })

        setPhase('wallet')
        const hash = await writeContractAsync({
          address: DZID_ADDRESS,
          abi: DZID_ABI,
          functionName: 'sendToName',
          args: [name, amount, memo],
          chainId: CHAIN_ID,
        })
        setPhase('confirming')
        let receipt
        try {
          receipt = await client.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS })
        } catch {
          throw new CheckoutError('PENDING', 'Your payment was sent but has not confirmed yet. Check Recent payments before sending again.')
        }
        if (receipt.status !== 'success') throw new CheckoutError('REVERTED', 'The payment failed on the network. Nothing was sent.')
        await refresh()
        return { hash, to, name, amount }
      } catch (e) {
        const parsed = parseTxError(e)
        setError(parsed.cancelled ? null : parsed.message)
        return null
      } finally {
        lock.current = false
        setPhase('idle')
      }
    },
    [address, client, writeContractAsync, ensureChain, refresh, setPhase, setError],
  )

  return { send, phase: base.phase, busy: base.phase !== 'idle', error: base.error }
}
