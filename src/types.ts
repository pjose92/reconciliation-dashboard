export type Currency = 'USD' | 'EUR' | 'GBP' | string

export interface MerchantTxn {
  transactionId: string
  date: string // ISO date string
  amount: number // positive for sale, negative for refund
  currency: Currency
  method?: string
  fee?: number
}

export interface BankTxn {
  transactionId: string
  date: string
  amount: number
  currency?: Currency
  description?: string
}

export interface ReconMatch {
  transactionId: string
  merchant: MerchantTxn | null
  bank: BankTxn | null
  status: 'matched' | 'missing_in_bank' | 'missing_in_merchant' | 'amount_mismatch'
  diff: number // bank.amount - merchant.amount (0 if matched)
}

export interface ReconResult {
  matches: ReconMatch[]
  totals: {
    merchantCount: number
    bankCount: number
    matched: number
    missingInBank: number
    missingInMerchant: number
    amountMismatch: number
    sumMerchant: number
    sumBank: number
    sumDiff: number
  }
}

export type ValidationError = {
  row: number
  reason: string
  raw: Record<string, any>
}

export type ValidationResult<T> = {
  valid: T[]
  invalid: ValidationError[]
}

export type MatchReason =
  | 'EXACT_ID'
  | 'AMOUNT_TOLERANCE'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_IN_BANK'
  | 'MISSING_IN_MERCHANT'

export interface ReconMatch {
  transactionId: string
  merchant: MerchantTxn | null
  bank: BankTxn | null
  status:
    | 'matched'
    | 'missing_in_bank'
    | 'missing_in_merchant'
    | 'amount_mismatch'

  diff: number
  matchReason: string

  // 🔥 NEW
  overrideStatus?: 'matched' | 'approved_mismatch'
  overrideReason?: string
}