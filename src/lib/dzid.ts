import { isAddress, parseAbi, type Address } from 'viem'

const rawAddress = import.meta.env.VITE_DZID_ADDRESS as string | undefined
/** Deployed DzID registry on Arc Testnet. Undefined until set in .env. */
export const DZID_ADDRESS: Address | undefined = rawAddress && isAddress(rawAddress) ? rawAddress : undefined

const rawBlock = import.meta.env.VITE_DZID_DEPLOY_BLOCK as string | undefined
export const DZID_DEPLOY_BLOCK: bigint | undefined = rawBlock && /^\d+$/.test(rawBlock) ? BigInt(rawBlock) : undefined

export const DZID_ABI = parseAbi([
  'function ownerOf(string name) view returns (address)',
  'function nameOf(address owner) view returns (string)',
  'function isAvailable(string name) view returns (bool)',
  'function totalNames() view returns (uint256)',
  'function claim(string name)',
  'function sendToName(string name, uint256 amount, string memo) returns (address to)',
  'event Claimed(address indexed owner, string name)',
  'event Sent(address indexed from, address indexed to, uint256 amount, string name, string memo)',
])

export const MEMO_MAX_BYTES = 80

/** 3 to 20 chars: a-z, 0-9, underscore; no leading or trailing underscore. Mirrors the contract. */
const NAME_RE = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/

export const normalizeName = (value: string): string => value.trim().replace(/^@/, '').toLowerCase()

export function nameProblem(name: string): string | null {
  if (name.length === 0) return null
  if (name.length < 3) return 'Use at least 3 characters.'
  if (name.length > 20) return 'Use 20 characters or fewer.'
  if (/[^a-z0-9_]/.test(name)) return 'Only letters, numbers and underscore.'
  if (name.startsWith('_') || name.endsWith('_')) return 'Cannot start or end with an underscore.'
  return NAME_RE.test(name) ? null : 'That name is not valid.'
}

export const isValidName = (name: string): boolean => NAME_RE.test(name)

export const displayName = (name: string): string => `@${name}`
