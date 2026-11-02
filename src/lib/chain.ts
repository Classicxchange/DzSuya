import { isAddress, parseAbi, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'
import { buildAddressExplorerUrl, buildTxExplorerUrl, getUsdc, requireChain } from '@/onchain-facts'

export const CHAIN_ID = arcTestnet.id
export const CHAIN_NAME = requireChain(CHAIN_ID).name

const usdcFact = getUsdc(CHAIN_ID)
if (!usdcFact) throw new Error(`USDC is not registered for chain ${CHAIN_ID}`)
export const USDC_ADDRESS = usdcFact.address as Address

const rawShop = import.meta.env.VITE_SUYA_SHOP_ADDRESS as string | undefined
/** Deployed SuyaShop contract. Undefined until the contract is deployed and set in .env. */
export const SHOP_ADDRESS: Address | undefined = rawShop && isAddress(rawShop) ? rawShop : undefined

const rawBlock = import.meta.env.VITE_SUYA_DEPLOY_BLOCK as string | undefined
export const DEPLOY_BLOCK: bigint | undefined = rawBlock && /^\d+$/.test(rawBlock) ? BigInt(rawBlock) : undefined

export const SHOP_ABI = parseAbi([
  'function shop() view returns (address)',
  'function orderCount() view returns (uint256)',
  'function getOrder(uint256 id) view returns ((uint256 id, address customer, uint256 amount, uint8 status, uint64 createdAt, uint64 updatedAt, string details))',
  'function getOrders(uint256 offset, uint256 limit) view returns ((uint256 id, address customer, uint256 amount, uint8 status, uint64 createdAt, uint64 updatedAt, string details)[])',
  'function getOrdersOf(address customer, uint256 offset, uint256 limit) view returns ((uint256 id, address customer, uint256 amount, uint8 status, uint64 createdAt, uint64 updatedAt, string details)[])',
  'function placeOrder(uint256 amount, string details) returns (uint256 id)',
  'function setStatus(uint256 id, uint8 newStatus)',
  'event OrderPlaced(uint256 indexed id, address indexed customer, uint256 amount, string details)',
  'event StatusUpdated(uint256 indexed id, uint8 status)',
])

export interface OrderView {
  id: bigint
  customer: Address
  amount: bigint
  status: number
  createdAt: bigint
  updatedAt: bigint
  details: string
}

export const STATUS_LABELS = ['Order confirmed', 'Preparing', 'Ready for pickup', 'Collected'] as const

export const txUrl = (hash: string) => buildTxExplorerUrl(CHAIN_ID, hash)
export const addressUrl = (address: string) => buildAddressExplorerUrl(CHAIN_ID, address)

const TX_KEY = (id: bigint | number) => `suya:tx:${id}`

export function saveOrderTx(id: bigint, hash: string): void {
  try {
    localStorage.setItem(TX_KEY(id), hash)
  } catch {
    /* storage unavailable */
  }
}

export function loadOrderTx(id: bigint): `0x${string}` | undefined {
  try {
    const v = localStorage.getItem(TX_KEY(id))
    return v && /^0x[0-9a-fA-F]{64}$/.test(v) ? (v as `0x${string}`) : undefined
  } catch {
    return undefined
  }
}
