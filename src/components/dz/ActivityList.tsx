import { ArrowDownLeft, ArrowUpRight, ExternalLink, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Fiat } from '@/components/Fiat'
import { useDzActivity } from '@/hooks/useDzId'
import { txUrl } from '@/lib/chain'
import { DZID_ADDRESS, displayName } from '@/lib/dzid'
import { shortAddr, timeAgo, usd } from '@/lib/format'

export function ActivityList() {
  const { address } = useAccount()
  const { data, isLoading, isError } = useDzActivity(address)

  if (!DZID_ADDRESS || !address) return null

  return (
    <section>
      <h2 className="display text-xl font-bold text-cream-50">Recent payments</h2>
      {isLoading ? (
        <div className="flex justify-center py-8 text-ember-400">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : isError ? (
        <p className="surface mt-3 rounded-2xl p-4 text-sm text-cream-300">Could not load payments right now. They will retry shortly.</p>
      ) : !data || data.length === 0 ? (
        <p className="surface mt-3 rounded-2xl p-4 text-sm text-cream-300">
          No DZ ID payments yet. Payments you send or receive by name show up here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map((t) => {
            const incoming = t.direction === 'in'
            return (
              <li key={t.id} className="surface flex items-center gap-3 rounded-2xl p-3.5">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    incoming ? 'bg-leaf-500/15 text-leaf-400' : 'bg-ember-500/15 text-ember-400'
                  }`}
                >
                  {incoming ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-cream-50">
                    {incoming ? `From ${shortAddr(t.from)}` : `To ${displayName(t.name)}`}
                  </div>
                  <div className="truncate text-xs text-cream-300">
                    {t.timestamp ? timeAgo(t.timestamp) : ''}
                    {t.memo && ` · "${t.memo}"`}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`display text-sm font-bold tabular-nums ${incoming ? 'text-leaf-400' : 'text-cream-50'}`}>
                    {incoming ? '+' : '-'}
                    {usd(t.amount)}
                  </div>
                  <Fiat raw={t.amount} prefix="" className="text-[11px] tabular-nums text-cream-300" />
                </div>
                <a
                  href={txUrl(t.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View transaction"
                  className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-full text-cream-300 hover:text-cream-50"
                >
                  <ExternalLink className="size-4" />
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
