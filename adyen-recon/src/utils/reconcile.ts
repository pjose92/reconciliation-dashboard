import type { BankTxn, MerchantTxn, ReconMatch, ReconResult } from '../types'

export function normalizeId(id: string) {
  return id?.trim().toLowerCase()
}

export function reconcile(
  merchant: MerchantTxn[],
  bank: BankTxn[],
  { amountTolerance = 0 }: { amountTolerance?: number } = {}
): ReconResult {
  const bankMap = new Map<string, BankTxn>()
  bank.forEach((b) => bankMap.set(normalizeId(b.transactionId), b))

  const matches: ReconMatch[] = []

  // Pass 1: iterate merchant rows and find bank rows
  for (const m of merchant) {
    const key = normalizeId(m.transactionId)
    const b = bankMap.get(key) || null

    if (!b) {
      matches.push({ transactionId: m.transactionId, merchant: m, bank: null, status: 'missing_in_bank', diff: 0 })
      continue
    }

    const diff = +(b.amount - m.amount).toFixed(2)
    if (Math.abs(diff) <= amountTolerance) {
      matches.push({ transactionId: m.transactionId, merchant: m, bank: b, status: 'matched', diff: 0 })
    } else {
      matches.push({ transactionId: m.transactionId, merchant: m, bank: b, status: 'amount_mismatch', diff })
    }

    // mark bank row as consumed
    bankMap.delete(key)
  }

  // Pass 2: whatever remains in bankMap was not in merchant
  for (const [, b] of bankMap) {
    matches.push({ transactionId: b.transactionId, merchant: null, bank: b, status: 'missing_in_merchant', diff: 0 })
  }

  const totals = computeTotals(matches)
  return { matches, totals }
}

function computeTotals(matches: ReconMatch[]) {
  let merchantCount = 0
  let bankCount = 0
  let matched = 0
  let missingInBank = 0
  let missingInMerchant = 0
  let amountMismatch = 0
  let sumMerchant = 0
  let sumBank = 0

  for (const m of matches) {
    if (m.merchant) {
      merchantCount++
      sumMerchant += m.merchant.amount
    }
    if (m.bank) {
      bankCount++
      sumBank += m.bank.amount
    }

    if (m.status === 'matched') matched++
    if (m.status === 'missing_in_bank') missingInBank++
    if (m.status === 'missing_in_merchant') missingInMerchant++
    if (m.status === 'amount_mismatch') amountMismatch++
  }

  const sumDiff = +(sumBank - sumMerchant).toFixed(2)

  return { merchantCount, bankCount, matched, missingInBank, missingInMerchant, amountMismatch, sumMerchant: +sumMerchant.toFixed(2), sumBank: +sumBank.toFixed(2), sumDiff }
}
