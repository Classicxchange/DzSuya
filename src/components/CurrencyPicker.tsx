import { useMemo, useState } from 'react'
import { Check, ChevronDown, Globe, Search } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { useCurrency } from '@/hooks/useCurrency'
import { formatClock } from '@/lib/format'

const POPULAR = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'CAD', 'XOF', 'XAF', 'AED', 'INR']

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

export function CurrencyPicker({ className }: { className?: string }) {
  const { code, setCode, rates, updatedAt, isError } = useCurrency()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const codes = rates ? Object.keys(rates) : POPULAR
    const rank = (c: string) => (POPULAR.includes(c) ? POPULAR.indexOf(c) : 999)
    const q = query.trim().toLowerCase()
    return codes
      .filter((c) => !q || c.toLowerCase().includes(q) || currencyName(c).toLowerCase().includes(q))
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((c) => ({ code: c, name: currencyName(c) }))
  }, [rates, query])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn-ghost focus-ring flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-xs ${className ?? ''}`}
        aria-label={`Show prices in ${code}. Change currency`}
      >
        <Globe className="size-3.5 text-ember-400" />
        <span className="font-bold tabular-nums">{code}</span>
        <ChevronDown className="size-3.5 opacity-70" />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Your currency" title="Show prices in">
        <div className="space-y-3 pb-4">
          <p className="text-sm text-cream-300 text-pretty">
            You always pay in USDC. Other currencies are an estimate at today's exchange rate so you know what it
            costs you.
          </p>
          <label className="relative block">
            <span className="sr-only">Search currencies</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-cream-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or code"
              className="focus-ring min-h-[48px] w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-cream-50 placeholder:text-cream-300/50"
            />
          </label>

          {isError && (
            <div className="rounded-xl bg-chili-500/15 p-3 text-sm text-cream-50">
              Live rates are unavailable right now. Prices stay in USDC until they load.
            </div>
          )}

          <ul className="space-y-1.5">
            {list.map((c) => {
              const on = c.code === code
              const rate = c.code === 'USD' ? 1 : rates?.[c.code]
              return (
                <li key={c.code}>
                  <button
                    onClick={() => {
                      setCode(c.code)
                      setOpen(false)
                      setQuery('')
                    }}
                    aria-pressed={on}
                    className={`focus-ring flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
                      on ? 'border-ember-500 bg-ember-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="w-11 font-mono text-sm font-bold text-cream-50">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-cream-200">{c.name}</span>
                    {rate !== undefined && (
                      <span className="text-xs tabular-nums text-cream-300">
                        1 USDC ≈ {rate >= 100 ? Math.round(rate).toLocaleString() : rate.toFixed(2)}
                      </span>
                    )}
                    {on && <Check className="size-4 text-ember-400" />}
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="py-6 text-center text-sm text-cream-300">No currency matches.</li>}
          </ul>

          <p className="text-[11px] text-cream-300/70">
            {updatedAt ? `Rates updated ${formatClock(updatedAt * 1000)}. ` : ''}
            Rates by{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">
              Exchange Rate API
            </a>
            .
          </p>
        </div>
      </Sheet>
    </>
  )
}
