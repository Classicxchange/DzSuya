import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem, zeroAddress, type Address } from 'viem'
import { usePublicClient, useReadContract } from 'wagmi'
import { CHAIN_ID } from '@/lib/chain'
import { DZID_ABI, DZID_ADDRESS, DZID_DEPLOY_BLOCK, isValidName } from '@/lib/dzid'

const SENT_EVENT = parseAbiItem(
  'event Sent(address indexed from, address indexed to, uint256 amount, string name, string memo)',
)

export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

/** The DZ ID claimed by a wallet, or undefined if it has none. */
export function useMyDzName(address: Address | undefined) {
  const query = useReadContract({
    address: DZID_ADDRESS,
    abi: DZID_ABI,
    functionName: 'nameOf',
    args: [address ?? zeroAddress],
    chainId: CHAIN_ID,
    query: { enabled: !!DZID_ADDRESS && !!address, staleTime: 15_000 },
  })
  return { ...query, name: query.data ? query.data : undefined }
}

/** Wallet that owns a name (zero address when unclaimed). Only queries valid names. */
export function useNameOwner(name: string) {
  const valid = isValidName(name)
  const query = useReadContract({
    address: DZID_ADDRESS,
    abi: DZID_ABI,
    functionName: 'ownerOf',
    args: [name],
    chainId: CHAIN_ID,
    query: { enabled: !!DZID_ADDRESS && valid, staleTime: 5_000 },
  })
  const owner = query.data && query.data !== zeroAddress ? query.data : undefined
  return { ...query, valid, owner, isTaken: valid && query.data !== undefined && query.data !== zeroAddress }
}

export interface DzTransfer {
  hash: `0x${string}`
  from: Address
  to: Address
  amount: bigint
  name: string
  memo: string
  timestamp: number
  direction: 'in' | 'out'
}

interface Raw {
  hash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  from: Address
  to: Address
  amount: bigint
  name: string
  memo: string
  direction: 'in' | 'out'
}

interface SentLog {
  transactionHash: `0x${string}`
  blockNumber: bigint
  logIndex: number
  args: { from?: Address; to?: Address; amount?: bigint; name?: string; memo?: string }
}

function toRaw(log: SentLog, direction: 'in' | 'out'): Raw {
  return {
    hash: log.transactionHash,
    blockNumber: log.blockNumber,
    logIndex: log.logIndex,
    from: log.args.from ?? zeroAddress,
    to: log.args.to ?? zeroAddress,
    amount: log.args.amount ?? 0n,
    name: log.args.name ?? '',
    memo: log.args.memo ?? '',
    direction,
  }
}

const STEP = 10_000n
const MAX_LOOKBACK = 300_000n
const MAX_ITEMS = 20

/** Recent DZ ID payments sent or received by a wallet, scanned forward from the deployment block. */
export function useDzActivity(address: Address | undefined) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  return useQuery({
    queryKey: ['dz-activity', address],
    enabled: !!client && !!DZID_ADDRESS && !!address,
    refetchInterval: 10_000,
    retry: 1,
    queryFn: async (): Promise<DzTransfer[]> => {
      if (!client || !DZID_ADDRESS || !address) return []
      const head = await client.getBlockNumber()
      const floor = head > MAX_LOOKBACK ? head - MAX_LOOKBACK : 0n
      let start = DZID_DEPLOY_BLOCK !== undefined && DZID_DEPLOY_BLOCK > floor ? DZID_DEPLOY_BLOCK : floor
      const found = new Map<string, Raw>()

      while (start <= head) {
        const end = start + STEP - 1n > head ? head : start + STEP - 1n
        const [sent, received] = await Promise.all([
          client.getLogs({ address: DZID_ADDRESS, event: SENT_EVENT, args: { from: address }, fromBlock: start, toBlock: end }),
          client.getLogs({ address: DZID_ADDRESS, event: SENT_EVENT, args: { to: address }, fromBlock: start, toBlock: end }),
        ])
        for (const log of sent) found.set(`${log.transactionHash}:${log.logIndex}`, toRaw(log, 'out'))
        for (const log of received) {
          const key = `${log.transactionHash}:${log.logIndex}`
          if (!found.has(key)) found.set(key, toRaw(log, 'in'))
        }
        start = end + 1n
      }

      const newest = [...found.values()]
        .sort((a, b) => Number(b.blockNumber - a.blockNumber) || b.logIndex - a.logIndex)
        .slice(0, MAX_ITEMS)

      const blocks = new Map<bigint, number>()
      await Promise.all(
        [...new Set(newest.map((n) => n.blockNumber))].map(async (bn) => {
          const block = await client.getBlock({ blockNumber: bn })
          blocks.set(bn, Number(block.timestamp))
        }),
      )

      return newest.map((n) => ({
        hash: n.hash,
        from: n.from,
        to: n.to,
        amount: n.amount,
        name: n.name,
        memo: n.memo,
        timestamp: blocks.get(n.blockNumber) ?? 0,
        direction: n.direction,
      }))
    },
  })
}
