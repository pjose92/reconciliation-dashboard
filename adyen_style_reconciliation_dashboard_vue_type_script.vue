# Quickstart
# 1) Create project
# npm create vite@latest adyen-recon -- --template vue-ts
# cd adyen-recon

# 2) Install deps
# npm i papaparse

# 3) Replace the following files with the code below
#    - index.html
#    - src/main.ts
#    - src/App.vue
#    - src/types.ts
#    - src/utils/reconcile.ts
#    - src/components/UploadArea.vue
#    - src/components/SummaryCards.vue
#    - src/components/ReconciliationTable.vue
#    - src/components/DownloadButton.vue
#    - src/styles.css

# 4) Run dev server
# npm run dev

# 5) Optional Build
# npm run build && npm run preview


<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Merchant Reconciliation Dashboard</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>


// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#app')


// src/types.ts
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


// src/utils/reconcile.ts
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


// src/components/UploadArea.vue
<script setup lang="ts">
import { ref } from 'vue'
import Papa from 'papaparse'
import type { BankTxn, MerchantTxn } from '../types'

const emit = defineEmits<{
  (e: 'loaded', payload: { merchant: MerchantTxn[]; bank: BankTxn[] }): void
}>()

const merchantFile = ref<File | null>(null)
const bankFile = ref<File | null>(null)
const parsing = ref(false)
const error = ref<string | null>(null)

function parseCsv<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<T>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as T[]),
      error: (err) => reject(err),
    })
  })
}

async function handleParse() {
  if (!merchantFile.value || !bankFile.value) {
    error.value = 'Please choose both files.'
    return
  }
  error.value = null
  parsing.value = true
  try {
    const [merchant, bank] = await Promise.all([
      parseCsv<MerchantTxn>(merchantFile.value!),
      parseCsv<BankTxn>(bankFile.value!),
    ])

    // Basic sanity check for required fields
    const requiredM = ['transactionId', 'date', 'amount']
    const requiredB = ['transactionId', 'date', 'amount']
    for (const f of requiredM) if (!(f in merchant[0])) throw new Error(`Merchant file missing field: ${f}`)
    for (const f of requiredB) if (!(f in bank[0])) throw new Error(`Bank file missing field: ${f}`)

    emit('loaded', { merchant, bank })
  } catch (e: any) {
    error.value = e.message || 'Failed to parse files'
  } finally {
    parsing.value = false
  }
}
</script>

<template>
  <div class="card">
    <h2>1) Upload CSVs</h2>
    <p class="muted">Both files must have headers: <code>transactionId,date,amount</code>. Extra columns are OK.</p>

    <div class="row">
      <label class="file-input">
        <input type="file" accept=".csv" @change="e => merchantFile = (e.target as HTMLInputElement).files?.[0] || null" />
        <span>Choose Merchant Export</span>
      </label>
      <label class="file-input">
        <input type="file" accept=".csv" @change="e => bankFile = (e.target as HTMLInputElement).files?.[0] || null" />
        <span>Choose Bank Statement</span>
      </label>
    </div>

    <button class="primary" :disabled="parsing" @click="handleParse">{{ parsing ? 'Parsing…' : 'Parse & Load' }}</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.file-input { position: relative; display: inline-block; }
.file-input input[type='file'] { display: none; }
.file-input span { display:inline-block; padding:8px 12px; border:1px solid var(--border); border-radius:10px; cursor:pointer; }
</style>


// src/components/SummaryCards.vue
<script setup lang="ts">
import type { ReconResult } from '../types'

const props = defineProps<{ result: ReconResult | null }>()
</script>

<template>
  <div class="cards" v-if="result">
    <div class="card small">
      <h3>Merchant Rows</h3>
      <p class="kpi">{{ result.totals.merchantCount }}</p>
    </div>
    <div class="card small">
      <h3>Bank Rows</h3>
      <p class="kpi">{{ result.totals.bankCount }}</p>
    </div>
    <div class="card small">
      <h3>Matched</h3>
      <p class="kpi">{{ result.totals.matched }}</p>
    </div>
    <div class="card small warn">
      <h3>Missing in Bank</h3>
      <p class="kpi">{{ result.totals.missingInBank }}</p>
    </div>
    <div class="card small warn">
      <h3>Missing in Merchant</h3>
      <p class="kpi">{{ result.totals.missingInMerchant }}</p>
    </div>
    <div class="card small warn">
      <h3>Amount Mismatch</h3>
      <p class="kpi">{{ result.totals.amountMismatch }}</p>
    </div>
    <div class="card small">
      <h3>Sum Merchant</h3>
      <p class="kpi">{{ result.totals.sumMerchant.toFixed(2) }}</p>
    </div>
    <div class="card small">
      <h3>Sum Bank</h3>
      <p class="kpi">{{ result.totals.sumBank.toFixed(2) }}</p>
    </div>
    <div class="card small {{ result.totals.sumDiff === 0 ? '' : 'warn' }}">
      <h3>Diff (Bank - Merchant)</h3>
      <p class="kpi">{{ result.totals.sumDiff.toFixed(2) }}</p>
    </div>
  </div>
</template>


// src/components/ReconciliationTable.vue
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
.table { width:100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap; }
tr.matched { background: #f5fff7; }
tr.missing_in_bank { background: #fff7f7; }
tr.missing_in_merchant { background: #fffaf2; }
tr.amount_mismatch { background: #fffaf2; }
.tag { text-transform: capitalize; font-weight: 600; }
</style>


// src/components/DownloadButton.vue
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


// src/App.vue
<script setup lang="ts">
import { ref } from 'vue'
import UploadArea from './components/UploadArea.vue'
import SummaryCards from './components/SummaryCards.vue'
import ReconciliationTable from './components/ReconciliationTable.vue'
import DownloadButton from './components/DownloadButton.vue'
import type { BankTxn, MerchantTxn, ReconResult } from './types'
import { reconcile } from './utils/reconcile'

const result = ref<ReconResult | null>(null)
const rows = ref(result.value?.matches || [])
const tolerance = ref(0)

function onLoaded(payload: { merchant: MerchantTxn[]; bank: BankTxn[] }) {
  result.value = reconcile(payload.merchant, payload.bank, { amountTolerance: tolerance.value })
  rows.value = result.value.matches
}

function onRecompute() {
  if (!result.value) return
  const lastMerchant = result.value.matches.filter(m => m.merchant).map(m => m.merchant!)
  const lastBank = result.value.matches.filter(m => m.bank).map(m => m.bank!)
  // Recompute from original arrays is better; in a real app keep originals.
  // For simplicity we reconstruct from current matches.
  const uniqM = new Map<string, MerchantTxn>()
  for (const m of lastMerchant) uniqM.set(m.transactionId, m)
  const uniqB = new Map<string, BankTxn>()
  for (const b of lastBank) uniqB.set(b.transactionId, b)
  const recon = reconcile([...uniqM.values()], [...uniqB.values()], { amountTolerance: tolerance.value })
  result.value = recon
  rows.value = recon.matches
}
</script>

<template>
  <main class="container">
    <header>
      <h1>Merchant Reconciliation Dashboard</h1>
      <p class="muted">Upload merchant export and bank statement CSVs to reconcile by transactionId and amount.</p>
    </header>

    <UploadArea @loaded="onLoaded" />

    <div class="card" v-if="result">
      <h2>2) Reconciliation Settings</h2>
      <label class="input-group">
        <span>Amount tolerance</span>
        <input type="number" step="0.01" v-model.number="tolerance" @input="onRecompute" class="input" />
      </label>
    </div>

    <SummaryCards :result="result" />

    <div class="actions" v-if="result">
      <DownloadButton :rows="rows" />
    </div>

    <ReconciliationTable v-if="result" :rows="rows" />

    <footer class="muted small">
      <p>Tip: Expected CSV headers: <code>transactionId,date,amount</code>. Extra columns like <code>currency</code> or <code>fee</code> are allowed.</p>
    </footer>
  </main>
</template>


// src/styles.css
:root {
  --bg: #0b0e13;
  --card: #11151c;
  --muted: #9aa4b2;
  --text: #e7ecf3;
  --border: #232b36;
  --primary: #3b82f6;
}
* { box-sizing: border-box; }
html, body, #app { height:100%; }
body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: var(--bg); color: var(--text); }
.container { max-width: 1100px; margin: 0 auto; padding: 24px; }
header { margin-bottom: 16px; }

.card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
.card.small { width: 100%; max-width: 220px; }
.card.warn { border-color: #4d2a2a; }

h1 { font-size: 24px; margin: 0 0 8px; }
h2 { font-size: 18px; margin: 0 0 8px; }
h3 { font-size: 14px; margin: 0 0 6px; color: var(--muted); font-weight: 500; }

.muted { color: var(--muted); }
.small { font-size: 12px; }
.kpi { font-size: 22px; font-weight: 700; margin: 4px 0 0; }

.row { display:flex; gap:12px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 8px; }
.toolbar { display:flex; gap:8px; margin-bottom: 8px; }
.actions { display:flex; justify-content:flex-end; margin-bottom: 8px; }

.input-group { display:flex; align-items:center; gap:8px; }
.input { padding:8px 10px; border-radius: 10px; border:1px solid var(--border); background: transparent; color: var(--text); }
button { border:1px solid var(--border); background: transparent; color: var(--text); border-radius: 12px; padding:8px 12px; cursor:pointer; }
button.primary { background: var(--primary); border-color: transparent; }
button.primary:disabled { opacity: 0.6; cursor: not-allowed; }
button.secondary { background: transparent; }
.error { color: #ff6b6b; margin-top: 8px; }

.table code { background: rgba(255,255,255,0.04); padding:2px 6px; border-radius:6px; }
