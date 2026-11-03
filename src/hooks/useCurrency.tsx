import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { USDC_DECIMALS } from '@/onchain-facts'

const RATES_URL = 'https://open.er-api.com/v6/latest/USD'
const STORAGE_KEY = 'suya:fx'
const CACHE_KEY = 'suya:fx-rates'

interface RatesPayload {
  rates: Record<string, number>
  /** Provider's last update time, unix seconds. */
  updatedAt: number
}

interface CurrencyApi {
  code: string
  setCode: (code: string) => void
  rates: Record<string, number> | undefined
  updatedAt: number | undefined
  isLoading: boolean
  isError: boolean
  /** Approximate value of a USDC amount (base units) in the chosen currency, or null when rates are unavailable. */
  convert: (raw: bigint) => number | null
  /** Formatted "≈ ₦6,150" style string, or null when rates are unavailable. */
  format: (raw: bigint) => string | null
}

const REGION_CURRENCY: Record<string, string> = {
  NG: 'NGN', US: 'USD', GB: 'GBP', GH: 'GHS', KE: 'KES', ZA: 'ZAR', CA: 'CAD', AU: 'AUD', IN: 'INR', AE: 'AED',
  EG: 'EGP', TZ: 'TZS', UG: 'UGX', JP: 'JPY', CN: 'CNY', BR: 'BRL', CM: 'XAF', SN: 'XOF', CI: 'XOF', RW: 'RWF',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR', IE: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
}

function defaultCode(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
    const region = new Intl.Locale(navigator.language).maximize().region
    return (region && REGION_CURRENCY[region]) || 'NGN'
  } catch {
    return 'NGN'
  }
}

function readCache(): RatesPayload | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as RatesPayload | null
    return parsed && parsed.rates ? { ...parsed, rates: cleanRates(parsed.rates) } : undefined
  } catch {
    return undefined
  }
}

function cleanRates(input: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [code, value] of Object.entries(input)) {
    if (/^[A-Z]{3}$/.test(code) && typeof value === 'number' && Number.isFinite(value) && value > 0) out[code] = value
  }
  return out
}

async function fetchRates(): Promise<RatesPayload> {
  const res = await fetch(RATES_URL, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`rates ${res.status}`)
  const json = (await res.json()) as { result?: string; rates?: Record<string, number>; time_last_update_unix?: number }
  if (json.result !== 'success' || !json.rates) throw new Error('rates unavailable')
  const payload: RatesPayload = { rates: cleanRates(json.rates), updatedAt: json.time_last_update_unix ?? Math.floor(Date.now() / 1000) }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* storage unavailable */
  }
  return payload
}

const CurrencyContext = createContext<CurrencyApi | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCodeState] = useState<string>(defaultCode)
  const query = useQuery({
    queryKey: ['fx-rates'],
    queryFn: fetchRates,
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    initialData: readCache,
    initialDataUpdatedAt: () => (readCache()?.updatedAt ?? 0) * 1000,
    retry: 2,
  })

  const setCode = useCallback((next: string) => {
    setCodeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const rates = query.data?.rates
  // USDC is a dollar stablecoin, so its fiat value is its USD value times the USD rate.
  const rate = code === 'USD' ? 1 : rates?.[code]

  const convert = useCallback(
    (raw: bigint) => (rate === undefined ? null : (Number(raw) / 10 ** USDC_DECIMALS) * rate),
    [rate],
  )

  const format = useCallback(
    (raw: bigint) => {
      const value = convert(raw)
      if (value === null) return null
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: value >= 100 ? 0 : 2,
        }).format(value)
      } catch {
        return `${value.toFixed(2)} ${code}`
      }
    },
    [convert, code],
  )

  const value = useMemo<CurrencyApi>(
    () => ({
      code,
      setCode,
      rates,
      updatedAt: query.data?.updatedAt,
      isLoading: query.isLoading,
      isError: query.isError && !rates,
      convert,
      format,
    }),
    [code, setCode, rates, query.data?.updatedAt, query.isLoading, query.isError, convert, format],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyApi {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
