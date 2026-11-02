import { ActivityList } from '@/components/dz/ActivityList'
import { ClaimCard } from '@/components/dz/ClaimCard'
import { SendCard } from '@/components/dz/SendCard'

export function DzIdView({ initialName }: { initialName?: string }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="eyebrow text-ember-400">DZ ID</div>
        <h1 className="display text-3xl font-bold text-cream-50 text-balance">Pay anyone by name</h1>
        <p className="mt-1 text-sm text-cream-300 text-pretty">
          Claim a short name for your wallet. Friends type it, send USDC, and it reaches you in seconds. No long address to
          copy.
        </p>
      </div>
      <ClaimCard />
      <SendCard key={initialName ?? 'blank'} initialName={initialName} />
      <ActivityList />
    </div>
  )
}
