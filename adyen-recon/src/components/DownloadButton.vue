<script setup lang="ts">
import type { ReconMatch } from '../types'

const props = defineProps<{ rows: ReconMatch[] }>()

function toCsv(rows: ReconMatch[]) {
  const headers = [
    'transactionId', 'status', 'merchant_amount', 'bank_amount', 'diff', 'merchant_date', 'bank_date'
  ]
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push([
      r.transactionId,
      r.status,
      r.merchant?.amount ?? '',
      r.bank?.amount ?? '',
      r.diff ?? '',
      r.merchant?.date ?? '',
      r.bank?.date ?? ''
    ].join(','))
  }
  return lines.join('\n')
}

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
  <button class="secondary" @click="download">Download CSV</button>
</template>