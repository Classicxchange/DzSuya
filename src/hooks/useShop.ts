import { useQuery } from '@tanstack/react-query'
import { erc20Abi, parseAbiItem, type Address } from 'viem'
import { usePublicClient, useReadContract } from 'wagmi'
import { CHAIN_ID, DEPLOY_BLOCK, SHOP_ABI, SHOP_ADDRESS, USDC_ADDRESS, loadOrderTx } from '@/lib/chain'

const ORDER_PLACED = parseAbiItem(
  'event OrderPlaced(uint256 indexed id, address indexed customer, uint256 amount, string details)',
)

/** Wallet that owns the shop: receives payments and manages order status. */
export function useShopWallet() {
  return useReadContract({
    address: SHOP_ADDRESS,
    abi: SHOP_ABI,
    functionName: 'shop',
    chainId: CHAIN_ID,
    query: { enabled: !!SHOP_ADDRESS, staleTime: 60_000 },
  })
}

/** One order, refreshed every few seconds so the status tracker is live. */
export function useOrder(id: bigint | undefined) {
  const query = useReadContract({
    address: SHOP_ADDRESS,
    abi: SHOP_ABI,
    functionName: 'getOrder',
    args: [id ?? 0n],
    chainId: CHAIN_ID,
    query: { enabled: !!SHOP_ADDRESS && id !== undefined && id > 0n, refetchInterval: 4000, retry: 1 },
  })
  return { ...query, order: query.data }
}

/** The connected wallet's own orders, newest first. */
export function useMyOrders(customer: Address | undefined) {
  const query = useReadContract({
    address: SHOP_ADDRESS,
    abi: SHOP_ABI,
    functionName: 'getOrdersOf',
    args: [customer ?? '0x0000000000000000000000000000000000000001', 0n, 50n],
    chainId: CHAIN_ID,
    query: { enabled: !!SHOP_ADDRESS && !!customer, refetchInterval: 6000 },
  })
  return { ...query, orders: query.data }
}

/** Every order the shop has received, newest first. */
export function useAllOrders(enabled: boolean) {
  const query = useReadContract({
    address: SHOP_ADDRESS,
    abi: SHOP_ABI,
    functionName: 'getOrders',
    args: [0n, 50n],
    chainId: CHAIN_ID,
    query: { enabled: !!SHOP_ADDRESS && enabled, refetchInterval: 4000 },
  })
  return { ...query, orders: query.data }
}

export function useUsdcBalance(owner: Address | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner ?? '0x0000000000000000000000000000000000000001'],
    chainId: CHAIN_ID,
    query: { enabled: !!owner, refetchInterval: 8000 },
  })
}

/**
 * Transaction hash of an order. Read from this device when the order was placed here,
 * otherwise looked up from the OrderPlaced event starting at the deployment block.
 */
export function useOrderTx(id: bigint | undefined) {
  const client = usePublicClient({ chainId: CHAIN_ID })
  return useQuery({
    queryKey: ['order-tx', id?.toString()],
    enabled: id !== undefined && id > 0n,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<`0x${string}` | null> => {
      if (id === undefined) return null
      const local = loadOrderTx(id)
      if (local) return local
      if (!client || !SHOP_ADDRESS || DEPLOY_BLOCK === undefined) return null
      try {
        const logs = await client.getLogs({
          address: SHOP_ADDRESS,
          event: ORDER_PLACED,
          args: { id },
          fromBlock: DEPLOY_BLOCK,
          toBlock: 'latest',
        })
        return logs[0]?.transactionHash ?? null
      } catch {
        return null
      }
    },
  })
}
