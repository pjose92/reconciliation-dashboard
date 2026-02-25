<script setup lang="ts">
import { ref, computed } from 'vue'
import UploadArea from './components/UploadArea.vue'
import SummaryCards from './components/SummaryCards.vue'
import ReconciliationTable from './components/ReconciliationTable.vue'
import DownloadButton from './components/DownloadButton.vue'
import StatusDonut from './components/StatusDonut.vue'
import DailyNetBar from './components/DailyNetBar.vue'

import type { BankTxn, MerchantTxn, ReconResult } from './types'
import { reconcile } from './utils/reconcile'

const result = ref<ReconResult | null>(null)
const rows = ref<ReconResult['matches']>([])
const tolerance = ref(0)

function onLoaded(payload: { merchant: MerchantTxn[]; bank: BankTxn[] }) {
  result.value = reconcile(payload.merchant, payload.bank, { amountTolerance: tolerance.value })
  rows.value = result.value.matches
}

function onRecompute() {
  if (!result.value) return

  const lastMerchant = result.value.matches
    .filter(m => m.merchant)
    .map(m => m.merchant!)

  const lastBank = result.value.matches
    .filter(m => m.bank)
    .map(m => m.bank!)

  const uniqM = new Map<string, MerchantTxn>()
  for (const m of lastMerchant) uniqM.set(m.transactionId, m)

  const uniqB = new Map<string, BankTxn>()
  for (const b of lastBank) uniqB.set(b.transactionId, b)

  const recon = reconcile(
    [...uniqM.values()],
    [...uniqB.values()],
    { amountTolerance: tolerance.value }
  )

  result.value = recon
  rows.value = recon.matches
}

/* =========================
   Donut Totals
========================= */
const donut = computed(() => {
  if (!result.value) {
    return {
      matched: 0,
      missingInBank: 0,
      missingInMerchant: 0,
      amountMismatch: 0
    }
  }

  const t = result.value.totals

  return {
    matched: t.matched,
    missingInBank: t.missingInBank,
    missingInMerchant: t.missingInMerchant,
    amountMismatch: t.amountMismatch
  }
})

/* =========================
   Strongly Typed Summary
========================= */
interface Summary {
  total: number
  matched: number
  forcedMatched: number
  approvedMismatch: number
  missingInBank: number
  missingInMerchant: number
  amountMismatch: number
  netVariance: number
}

const summary = computed<Summary>(() => {
  if (!result.value) {
    return {
      total: 0,
      matched: 0,
      forcedMatched: 0,
      approvedMismatch: 0,
      missingInBank: 0,
      missingInMerchant: 0,
      amountMismatch: 0,
      netVariance: 0,
    }
  }

  const total = result.value.matches.length

  const forcedMatched = result.value.matches.filter(
    (r) =>
      r.overrideStatus === 'matched' &&
      (r.status === 'missing_in_bank' || r.status === 'missing_in_merchant')
  ).length

  const approvedMismatch = result.value.matches.filter(
    (r) => r.overrideStatus === 'approved_mismatch'
  ).length

  const matched = result.value.totals.matched
  const missingInBank = result.value.totals.missingInBank
  const missingInMerchant = result.value.totals.missingInMerchant
  const amountMismatch = result.value.totals.amountMismatch
  const netVariance = result.value.totals.sumDiff

  return {
    total,
    matched,
    forcedMatched,
    approvedMismatch,
    missingInBank,
    missingInMerchant,
    amountMismatch,
    netVariance,
  }
})
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

    <div v-if="result" class="card summary">
  <h2>Reconciliation Summary</h2>

  <div class="summary-grid">
      <div><strong>Total:</strong> {{ summary.total }}</div>
      <div><strong>Matched:</strong> {{ summary.matched }}</div>
      <div><strong>Forced Matched:</strong> {{ summary.forcedMatched }}</div>
      <div><strong>Approved Mismatch:</strong> {{ summary.approvedMismatch }}</div>
      <div><strong>Missing in Bank:</strong> {{ summary.missingInBank }}</div>
      <div><strong>Missing in Merchant:</strong> {{ summary.missingInMerchant }}</div>
      <div><strong>Amount Mismatch:</strong> {{ summary.amountMismatch }}</div>
      <div><strong>Net Variance:</strong> {{ summary.netVariance.toFixed(2) }}</div>
    </div>
  </div>

    <SummaryCards :result="result" />

    <!-- Charts -->
    <div v-if="result" class="row" style="align-items: stretch;">
      <div style="flex: 1 1 360px;">
        <StatusDonut
          :matched="donut.matched"
          :missing-in-bank="donut.missingInBank"
          :missing-in-merchant="donut.missingInMerchant"
          :amount-mismatch="donut.amountMismatch"
        />
      </div>
      <div style="flex: 2 1 520px;">
        <DailyNetBar :rows="rows" />
      </div>
    </div>

    <div class="actions" v-if="result">
      <DownloadButton :rows="rows" />
    </div>

    <ReconciliationTable v-if="result" :rows="rows" />

    <footer class="muted small">
      <p>Tip: Expected CSV headers: <code>transactionId,date,amount</code>. Extra columns like <code>currency</code> or <code>fee</code> are allowed.</p>
    </footer>
  </main>
</template>
