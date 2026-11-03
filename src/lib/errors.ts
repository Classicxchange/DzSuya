import { BaseError, ContractFunctionRevertedError } from 'viem'

export class CheckoutError extends Error {
  readonly code: 'INSUFFICIENT_USDC' | 'TOO_LARGE' | 'NO_SHOP' | 'REVERTED' | 'PENDING'

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

/** Name of the Solidity custom error a failed call reverted with, if any. */
export function revertName(error: unknown): string | undefined {
  if (!(error instanceof BaseError)) return undefined
  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError)
  return revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined
}

const REVERT_MESSAGES: Record<string, string> = {
  NotShop: 'Only the shop wallet can do that.',
  NotPendingShop: 'This wallet is not waiting to take over the shop.',
  InvalidStatus: 'That order already moved past this step.',
  OrderNotFound: 'That order does not exist.',
  InvalidAmount: 'That amount is not allowed.',
  InvalidDetails: 'The order details are not valid.',
  InvalidName: 'That DZ ID is not valid.',
  NameTaken: 'That DZ ID was just taken. Try another.',
  AlreadyHasName: 'This wallet already has a DZ ID.',
  NameNotFound: 'No one has claimed that DZ ID yet.',
  SelfPayment: 'You cannot pay your own DZ ID.',
  MemoTooLong: 'That note is too long.',
  NoCommitment: 'Your name reservation was not found. Start the claim again.',
  CommitmentExists: 'You already have a name reservation in progress.',
  CommitmentTooNew: 'Almost there. The reservation needs a few more seconds. Try again.',
  CommitmentExpired: 'Your name reservation expired. Start the claim again.',
  ZeroAddress: 'That address is not allowed.',
}

export function parseTxError(error: unknown): ParsedError {
  if (error instanceof CheckoutError) return { message: error.message, cancelled: false }
  const name = revertName(error)
  if (name && REVERT_MESSAGES[name]) return { message: REVERT_MESSAGES[name], cancelled: false }

  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  const text = raw.toLowerCase()
  const code = (error as { code?: number } | null)?.code
  if (code === 4001 || text.includes('user rejected') || text.includes('user denied') || text.includes('userrejected')) {
    return { message: 'You cancelled the request in your wallet.', cancelled: true }
  }
  if (text.includes('insufficient funds') || text.includes('exceeds balance')) {
    return { message: 'Not enough USDC to cover this plus network fees.', cancelled: false }
  }
  if (text.includes('reverted')) return { message: 'The network rejected the transaction. Please try again.', cancelled: false }
  if (text.includes('timeout') || text.includes('failed to fetch') || text.includes('http request failed')) {
    return { message: 'Network issue. Check your connection and try again.', cancelled: false }
  }
  return { message: 'Something went wrong. Please try again.', cancelled: false }
}
