import { useCurrency } from '@/hooks/useCurrency'

interface FiatProps {
  /** USDC amount in base units. */
  raw: bigint
  className?: string
  prefix?: string
}

/** Approximate local-currency value of a USDC amount. Renders nothing until rates are available. */
export function Fiat({ raw, className, prefix = '≈ ' }: FiatProps) {
  const { format } = useCurrency()
  const text = format(raw)
  if (!text) return null
  return (
    <span className={className} title="Indicative value. You pay in USDC.">
      {prefix}
      {text}
    </span>
  )
}
