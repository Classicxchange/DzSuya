import { parseUsdc } from '@/onchain-money'

export type Spice = 'mild' | 'medium' | 'hot' | 'xhot'

export interface SizeOption {
  id: string
  label: string
  hint: string
  price: string
}

export interface MenuItem {
  id: string
  name: string
  tagline: string
  description: string
  tone: 'beef' | 'chicken' | 'goat' | 'fish' | 'special'
  /** Public path of the item photo. */
  image: string
  /** Short note on what this kind of suya is and how it eats. */
  about: string
  badge?: string
  sizes: SizeOption[]
}

export interface Extra {
  id: string
  label: string
  price: string
}

export const SPICE_LEVELS: { id: Spice; label: string; flames: number }[] = [
  { id: 'mild', label: 'Mild', flames: 1 },
  { id: 'medium', label: 'Medium', flames: 2 },
  { id: 'hot', label: 'Hot', flames: 3 },
  { id: 'xhot', label: 'Extra Hot', flames: 4 },
]

export const EXTRAS: Extra[] = [
  { id: 'pepper', label: 'Extra pepper', price: '0.25' },
  { id: 'onions', label: 'Extra onions', price: '0.25' },
  { id: 'yam', label: 'Roasted yam', price: '1.00' },
  { id: 'plantain', label: 'Plantain', price: '1.00' },
  { id: 'spice', label: 'Suya spice mix (bag)', price: '0.50' },
]

const trio = (s: string, m: string, l: string): SizeOption[] => [
  { id: 's', label: 'Small', hint: '4 sticks', price: s },
  { id: 'm', label: 'Medium', hint: '6 sticks', price: m },
  { id: 'l', label: 'Large', hint: '10 sticks', price: l },
]

export const MENU: MenuItem[] = [
  {
    id: 'beef',
    name: 'Classic Beef Suya',
    tagline: 'The Woji Road original',
    description: 'Thin-sliced beef rubbed in yaji, grilled over open charcoal and served with raw onion and tomato.',
    about:
      'Beef is the original and still the most common suya. Lean beef is sliced paper thin, coated in oil and yaji (a dry mix of ground peanut, ginger, dried chilli and onion), then charred over coals. Tender with crisp edges.',
    tone: 'beef',
    image: '/images/beef.jpg',
    badge: 'Best seller',
    sizes: trio('2.50', '4.00', '6.00'),
  },
  {
    id: 'chicken',
    name: 'Chicken Suya',
    tagline: 'Juicy and smoky',
    description: 'Tender chicken pieces glazed with groundnut yaji and a slow char.',
    about:
      'Milder than beef, so the nutty yaji really shines. Chicken is grilled all the way through, which gives it a deeper char and a juicy centre.',
    tone: 'chicken',
    image: '/images/chicken.jpg',
    sizes: trio('2.25', '3.75', '5.50'),
  },
  {
    id: 'goat',
    name: 'Goat Suya',
    tagline: 'Deep, rich, a little wild',
    description: 'Lean goat meat with a bold peppery yaji crust. For the serious suya head.',
    about:
      'Goat and ram suya have a stronger, richer flavour than beef, and many northern suya masters swear by them. The hot, nutty yaji holds up to the bolder taste. Photo shows peppered goat, our spicy serving style.',
    tone: 'goat',
    image: '/images/goat.jpg',
    sizes: trio('3.50', '5.50', '8.00'),
  },
  {
    id: 'fish',
    name: 'Fish Suya',
    tagline: 'Grilled catfish, fresh off the coast',
    description: 'Whole-cut catfish grilled hot and fast in a lighter yaji, with pepper and fresh salad.',
    about:
      'A coastal take on suya, popular in Port Harcourt. Firm catfish cooks in a fraction of the time beef needs, so the yaji is lighter (less ginger) to keep the fish sweet. Served with onion, cabbage and pepper.',
    tone: 'fish',
    image: '/images/fish.jpg',
    sizes: trio('3.00', '4.75', '7.00'),
  },
  {
    id: 'special',
    name: "Professor's Special",
    tagline: 'Mixed meats + extra spice',
    description: 'Beef, chicken and gizzard on one tray with double yaji, onions and a side of pepper.',
    about:
      'Our mixed tray, the way regulars order it at Lagos grills: beef for the classic bite, chicken for the char, chewy gizzard for texture. Dusted twice with yaji.',
    tone: 'special',
    image: '/images/special.jpg',
    badge: 'Chef pick',
    sizes: [
      { id: 'r', label: 'Regular', hint: 'Feeds 1 to 2', price: '7.50' },
      { id: 'p', label: 'Party', hint: 'Feeds 3 to 4', price: '14.00' },
    ],
  },
]

export const PICKUP = {
  name: 'DzSuya',
  address: 'Woji Road, Port Harcourt',
  note: 'Look for the charcoal grill and the line of regulars right by the roadside. Show your receipt QR at the grill.',
}

export const HERO_IMAGE = '/images/hero.jpg'

export const MAX_LINES = 8
export const MAX_NOTE = 60

export interface CartLine {
  key: string
  itemId: string
  sizeId: string
  spice: Spice
  extras: string[]
  qty: number
  note: string
}

export const getItem = (id: string) => MENU.find((m) => m.id === id)
export const getSize = (item: MenuItem, sizeId: string) => item.sizes.find((s) => s.id === sizeId) ?? item.sizes[0]
export const getExtra = (id: string) => EXTRAS.find((e) => e.id === id)

export const parseUsdcPrice = (price: string): bigint => parseUsdc(price)

/** Price of one unit of a line in USDC base units. */
export function unitPrice(line: Pick<CartLine, 'itemId' | 'sizeId' | 'extras'>): bigint {
  const item = getItem(line.itemId)
  if (!item) return 0n
  const base = parseUsdc(getSize(item, line.sizeId).price)
  const extras = line.extras.reduce((sum, id) => {
    const extra = getExtra(id)
    return extra ? sum + parseUsdc(extra.price) : sum
  }, 0n)
  return base + extras
}

export const lineTotal = (line: CartLine): bigint => unitPrice(line) * BigInt(line.qty)

export const cartTotal = (lines: CartLine[]): bigint => lines.reduce((sum, l) => sum + lineTotal(l), 0n)

export const cartCount = (lines: CartLine[]): number => lines.reduce((sum, l) => sum + l.qty, 0)

export const makeLineKey = (l: Pick<CartLine, 'itemId' | 'sizeId' | 'spice' | 'extras' | 'note'>): string =>
  [l.itemId, l.sizeId, l.spice, [...l.extras].sort().join('+'), l.note.trim().toLowerCase()].join('|')

/** Compact order payload stored onchain in the receipt. */
interface Payload {
  v: 1
  l: [string, string, string, string[], number, string][]
}

export function encodeOrder(lines: CartLine[]): string {
  const payload: Payload = {
    v: 1,
    l: lines.map((l) => [l.itemId, l.sizeId, l.spice, l.extras, l.qty, l.note.trim()]),
  }
  return JSON.stringify(payload)
}

export const MAX_DETAILS_BYTES = 1024

export const encodedSize = (lines: CartLine[]): number => new TextEncoder().encode(encodeOrder(lines)).length

export interface DecodedLine extends CartLine {
  itemName: string
  sizeLabel: string
  spiceLabel: string
  extraLabels: string[]
  total: bigint
}

export function decodeOrder(details: string): DecodedLine[] {
  try {
    const payload = JSON.parse(details) as Payload
    if (payload.v !== 1 || !Array.isArray(payload.l)) return []
    const out: DecodedLine[] = []
    for (const [itemId, sizeId, spice, extras, qty, note] of payload.l) {
      const item = getItem(itemId)
      if (!item) continue
      const line: CartLine = { key: '', itemId, sizeId, spice: spice as Spice, extras, qty, note }
      out.push({
        ...line,
        itemName: item.name,
        sizeLabel: getSize(item, sizeId).label,
        spiceLabel: SPICE_LEVELS.find((s) => s.id === spice)?.label ?? 'Medium',
        extraLabels: extras.map((e) => getExtra(e)?.label ?? e),
        total: lineTotal(line),
      })
    }
    return out
  } catch {
    return []
  }
}

/** Honest estimate: a base queue time plus a little per portion. */
export function prepMinutes(lines: { qty: number }[]): number {
  const portions = lines.reduce((sum, l) => sum + l.qty, 0)
  return Math.min(30, 10 + portions * 2)
}
