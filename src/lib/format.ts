import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { CHAIN_ID } from '@/lib/chain'

export const usd = (raw: bigint): string => Amount.fromRaw(raw, usdcDecimalsFor(CHAIN_ID)).toFixed(2)

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
