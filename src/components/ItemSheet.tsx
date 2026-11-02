import { useState } from 'react'
import { Check, Flame, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet } from '@/components/Sheet'
import { Fiat } from '@/components/Fiat'
import { FoodPhoto } from '@/components/FoodPhoto'
import { useCart } from '@/hooks/useCart'
import { usd } from '@/lib/format'
import {
  EXTRAS,
  MAX_NOTE,
  SPICE_LEVELS,
  parseUsdcPrice,
  unitPrice,
  type MenuItem,
  type Spice,
} from '@/lib/menu'

interface ItemSheetProps {
  item: MenuItem | null
  onClose: () => void
}

export function ItemSheet({ item, onClose }: ItemSheetProps) {
  return (
    <Sheet open={!!item} onClose={onClose} title={item?.name ?? ''} eyebrow={item?.tagline}>
      {item && <Customizer key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  )
}

function Customizer({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const { add } = useCart()
  const [sizeId, setSizeId] = useState(item.sizes[Math.min(1, item.sizes.length - 1)].id)
  const [spice, setSpice] = useState<Spice>('medium')
  const [extras, setExtras] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const unit = unitPrice({ itemId: item.id, sizeId, extras })
  const total = unit * BigInt(qty)

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))

  const submit = () => {
    const ok = add({ itemId: item.id, sizeId, spice, extras, qty, note })
    if (!ok) {
      toast.error('Your order is full. Pay for it first, then start a new one.')
      return
    }
    toast.success(`${qty} × ${item.name} added`)
    onClose()
  }

  return (
    <div className="space-y-6 pb-2">
      <div className="-mx-5 h-52 overflow-hidden">
        <FoodPhoto item={item} className="size-full" priority />
      </div>
      <p className="text-sm text-cream-200/85 text-pretty">{item.about}</p>

      <fieldset>
        <legend className="eyebrow mb-2 text-cream-300">Size</legend>
        <div className={`grid gap-2 ${item.sizes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {item.sizes.map((s) => {
            const on = s.id === sizeId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSizeId(s.id)}
                aria-pressed={on}
                className={`focus-ring min-h-[72px] rounded-2xl border p-3 text-left transition-colors ${
                  on ? 'border-ember-500 bg-ember-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="text-sm font-bold text-cream-50">{s.label}</div>
                <div className="text-[11px] text-cream-300">{s.hint}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-gold-300">{usd(parseUsdcPrice(s.price))}</div>
                <Fiat raw={parseUsdcPrice(s.price)} prefix="" className="block text-[11px] tabular-nums text-cream-300" />
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2 text-cream-300">Spice level</legend>
        <div className="grid grid-cols-4 gap-2">
          {SPICE_LEVELS.map((s) => {
            const on = s.id === spice
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpice(s.id)}
                aria-pressed={on}
                className={`focus-ring flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-xs font-semibold transition-colors ${
                  on ? 'border-chili-500 bg-chili-500/15 text-cream-50' : 'border-white/10 bg-white/[0.03] text-cream-200'
                }`}
              >
                <span className="flex">
                  {Array.from({ length: s.flames }).map((_, i) => (
                    <Flame key={i} className={`size-3.5 ${on ? 'text-chili-500' : 'text-ember-400/70'}`} />
                  ))}
                </span>
                {s.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2 text-cream-300">Extras</legend>
        <div className="space-y-2">
          {EXTRAS.map((e) => {
            const on = extras.includes(e.id)
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleExtra(e.id)}
                aria-pressed={on}
                className={`focus-ring flex min-h-[48px] w-full items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${
                  on ? 'border-ember-500 bg-ember-500/10' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-md border ${
                    on ? 'border-ember-500 bg-ember-500 text-coal-950' : 'border-white/25'
                  }`}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="flex-1 text-sm font-medium text-cream-50">{e.label}</span>
                <span className="text-sm tabular-nums text-cream-300">+{usd(parseUsdcPrice(e.price))}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="note" className="eyebrow mb-2 block text-cream-300">
          Special instructions
        </label>
        <textarea
          id="note"
          value={note}
          maxLength={MAX_NOTE}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="No onions, well done, wrap separately…"
          className="focus-ring w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-cream-50 placeholder:text-cream-300/50"
        />
        <div className="mt-1 text-right text-[11px] tabular-nums text-cream-300/70">
          {note.length}/{MAX_NOTE}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.04] p-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="btn-ghost focus-ring flex size-11 items-center justify-center rounded-full"
          >
            <Minus className="size-4" />
          </button>
          <span className="display w-10 text-center text-xl font-bold tabular-nums text-cream-50">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(20, q + 1))}
            aria-label="Increase quantity"
            className="btn-ghost focus-ring flex size-11 items-center justify-center rounded-full"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          className="btn-primary focus-ring min-h-[52px] flex-1 rounded-2xl px-4 text-[15px]"
        >
          <span className="block">Add · {usd(total)} USDC</span>
          <Fiat raw={total} className="block text-[11px] font-semibold tabular-nums opacity-75" />
        </button>
      </div>
      <div className="h-2" />
    </div>
  )
}
