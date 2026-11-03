import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/** Open sheets, topmost last, so Escape only closes the one on top. */
const openSheets: string[] = []

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  locked?: boolean
}

/** Bottom sheet on mobile, centered card on larger screens. */
export function Sheet({ open, onClose, title, eyebrow, children, footer, locked }: SheetProps) {
  const id = useId()
  const panel = useRef<HTMLElement>(null)
  const latest = useRef({ onClose, locked })

  useEffect(() => {
    latest.current = { onClose, locked }
  })

  useEffect(() => {
    if (!open) return
    openSheets.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (openSheets[openSheets.length - 1] !== id) return
      if (e.key === 'Escape' && !latest.current.locked) {
        e.stopPropagation()
        latest.current.onClose()
        return
      }
      if (e.key === 'Tab' && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      const i = openSheets.indexOf(id)
      if (i >= 0) openSheets.splice(i, 1)
      previouslyFocused?.focus?.()
    }
  }, [open, id])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={locked ? undefined : onClose} />
          <motion.section
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92dvh] w-full max-w-md flex-col outline-none overflow-hidden rounded-t-[28px] bg-coal-900 shadow-2xl sm:rounded-[28px]"
            style={{ border: '1px solid rgba(246,234,215,0.1)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <div className="h-1 w-full bg-gradient-to-r from-chili-500 via-ember-500 to-gold-400" />
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
              <div className="min-w-0">
                {eyebrow && <div className="eyebrow text-ember-400">{eyebrow}</div>}
                <h2 className="display text-xl font-bold text-cream-50 text-balance">{title}</h2>
              </div>
              <button
                onClick={onClose}
                disabled={locked}
                aria-label="Close"
                className="btn-ghost focus-ring flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
            {footer && (
              <div className="border-t border-white/5 bg-coal-900 px-5 pb-5 pt-3">{footer}</div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
