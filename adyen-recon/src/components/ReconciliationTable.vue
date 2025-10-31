<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReconMatch } from '../types'

const props = defineProps<{ rows: ReconMatch[] }>()
const query = ref('')
const status = ref<'all' | 'matched' | 'missing_in_bank' | 'missing_in_merchant' | 'amount_mismatch'>('all')

const filtered = computed(() => {
  return props.rows.filter((r) => {
    const inStatus = status.value === 'all' ? true : r.status === status.value
    const q = query.value.trim().toLowerCase()
    const inQuery = q
      ? r.transactionId.toLowerCase().includes(q) ||
        (r.merchant?.amount + '').includes(q) ||
        (r.bank?.amount + '').includes(q)
      : true
    return inStatus && inQuery
  })
})
</script>

<template>
  <div class="card">
    <h2>3) Review Results</h2>

    <div class="toolbar">
      <input class="input" placeholder="Search by ID or amount" v-model="query" />
      <select class="input" v-model="status">
        <option value="all">All statuses</option>
        <option value="matched">Matched</option>
        <option value="missing_in_bank">Missing in Bank</option>
        <option value="missing_in_merchant">Missing in Merchant</option>
        <option value="amount_mismatch">Amount Mismatch</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Status</th>
            <th>Merchant Amount</th>
            <th>Bank Amount</th>
            <th>Diff</th>
            <th>Merchant Date</th>
            <th>Bank Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered" :key="r.transactionId" :class="r.status">
            <td><code>{{ r.transactionId }}</code></td>
            <td class="tag">{{ r.status }}</td>
            <td>{{ r.merchant?.amount?.toFixed?.(2) ?? '—' }}</td>
            <td>{{ r.bank?.amount?.toFixed?.(2) ?? '—' }}</td>
            <td>{{ r.diff?.toFixed?.(2) }}</td>
            <td>{{ r.merchant?.date ?? '—' }}</td>
            <td>{{ r.bank?.date ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-wrap { overflow:auto; }
tbody { color: black }
.table { width:100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
tr.matched { background: #f5fff7; }
tr.missing_in_bank { background: #fff7f7; }
tr.missing_in_merchant { background: #fffaf2; }
tr.amount_mismatch { background: #fffaf2; }
.tag { text-transform: capitalize; font-weight: 600; }
</style>