import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MAX_LINES, cartCount, cartTotal, isValidCartLine, makeLineKey, type CartLine } from '@/lib/menu'

interface CartApi {
  lines: CartLine[]
  total: bigint
  count: number
  add: (line: Omit<CartLine, 'key'>) => boolean
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartApi | null>(null)
const STORAGE_KEY = 'suya:cart'

function load(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CartLine[]
    return Array.isArray(parsed) ? parsed.filter(isValidCartLine).slice(0, MAX_LINES) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* storage unavailable */
    }
  }, [lines])

  const add = useCallback(
    (line: Omit<CartLine, 'key'>) => {
      const key = makeLineKey(line)
      const exists = lines.some((l) => l.key === key)
      if (!exists && lines.length >= MAX_LINES) return false
      setLines((prev) =>
        prev.some((l) => l.key === key)
          ? prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + line.qty) } : l))
          : [...prev, { ...line, key }],
      )
      return true
    },
    [lines],
  )

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l)),
    )
  }, [])

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), [])
  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartApi>(
    () => ({ lines, total: cartTotal(lines), count: cartCount(lines), add, setQty, remove, clear }),
    [lines, add, setQty, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
