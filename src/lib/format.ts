import { formatUnitsExact, usdcDecimalsFor } from '@/onchain-money'
import { CHAIN_ID } from '@/lib/chain'

/** Exact USDC amount with at least two decimals, e.g. 2.50 or 0.001. */
export function usd(raw: bigint): string {
  const exact = formatUnitsExact(raw, usdcDecimalsFor(CHAIN_ID))
  const [whole, fraction = ''] = exact.split('.')
  return `${whole}.${fraction.padEnd(2, '0')}`
}

export const shortAddr = (a: string): string => `${a.slice(0, 6)}…${a.slice(-4)}`

export const shortHash = (h: string): string => `${h.slice(0, 10)}…${h.slice(-8)}`

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const timeOnly = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export const formatStamp = (unixSeconds: bigint | number): string => dateTime.format(new Date(Number(unixSeconds) * 1000))

export const formatClock = (ms: number): string => timeOnly.format(new Date(ms))

export function timeAgo(unixSeconds: bigint | number, now = Date.now()): string {
  const diff = Math.max(0, Math.floor(now / 1000 - Number(unixSeconds)))
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} d ago`
}

/** Compact amount for sentences, e.g. "1,000" or "2.5". */
export const formatUsdcShort = (raw: bigint): string => {
  const [whole, fraction] = usd(raw).split('.')
  const trimmed = fraction.replace(/0+$/, '')
  return `${Number(whole).toLocaleString()}${trimmed ? `.${trimmed}` : ''}`
}
