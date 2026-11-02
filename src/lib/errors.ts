export class CheckoutError extends Error {
  readonly code: 'INSUFFICIENT_USDC' | 'TOO_LARGE' | 'NO_SHOP' | 'REVERTED'

  constructor(code: CheckoutError['code'], message: string) {
    super(message)
    this.name = 'CheckoutError'
    this.code = code
  }
}

export interface ParsedError {
  message: string
  cancelled: boolean
}

export function parseTxError(error: unknown): ParsedError {
  if (error instanceof CheckoutError) return { message: error.message, cancelled: false }
  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  const text = raw.toLowerCase()
  const code = (error as { code?: number } | null)?.code
  if (code === 4001 || text.includes('user rejected') || text.includes('user denied') || text.includes('userrejected')) {
    return { message: 'You cancelled the request in your wallet.', cancelled: true }
  }
  if (text.includes('insufficient funds') || text.includes('exceeds balance')) {
    return { message: 'Not enough USDC to cover this order plus network fees.', cancelled: false }
  }
  if (text.includes('notshop')) return { message: 'Only the shop wallet can do that.', cancelled: false }
  if (text.includes('invalidstatus')) return { message: 'That order already moved past this step.', cancelled: false }
  if (text.includes('reverted')) return { message: 'The transaction was rejected by the network. Please try again.', cancelled: false }
  if (text.includes('network') || text.includes('timeout') || text.includes('fetch')) {
    return { message: 'Network issue. Check your connection and try again.', cancelled: false }
  }
  return { message: 'Something went wrong. Please try again.', cancelled: false }
}
