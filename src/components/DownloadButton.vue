<script setup lang="ts">
import type { ReconMatch } from '../types'

const props = defineProps<{ rows: ReconMatch[] }>()

/* =========================
   Export Status Resolver
========================= */
function exportStatus(r: ReconMatch) {
  // Forced match (missing → manually matched)
  if (
    r.overrideStatus === 'matched' &&
    (r.status === 'missing_in_bank' || r.status === 'missing_in_merchant')
  ) {
    return 'forced_matched'
  }

  // Approved mismatch
  if (r.overrideStatus === 'approved_mismatch') {
    return 'approved_mismatch'
  }

  return r.overrideStatus ?? r.status
}

/* =========================
   CSV Generator
========================= */
function toCsv(rows: ReconMatch[]) {
  const headers = [
    'transactionId',
    'status',
    'merchant_amount',
    'bank_amount',
    'diff',
    'merchant_date',
    'bank_date',
    'override_reason'
  ]

  const lines = [headers.join(',')]

  for (const r of rows) {
    lines.push([
      r.transactionId,
      exportStatus(r),
      r.merchant?.amount ?? '',
      r.bank?.amount ?? '',
      r.diff ?? '',
      r.merchant?.date ?? '',
      r.bank?.date ?? '',
      r.overrideReason ?? ''
    ].join(','))
  }

  return lines.join('\n')
}

/* =========================
   Download
========================= */
function download() {
  const csv = toCsv(props.rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'reconciliation.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <button class="secondary" @click="download">
    Download CSV
  </button>
</template>