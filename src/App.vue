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
  // Recompute from current matches (your original approach)
  const uniqM = new Map<string, MerchantTxn>()
  for (const m of lastMerchant) uniqM.set(m.transactionId, m)
  const uniqB = new Map<string, BankTxn>()
  for (const b of lastBank) uniqB.set(b.transactionId, b)
  const recon = reconcile([...uniqM.values()], [...uniqB.values()], { amountTolerance: tolerance.value })
  result.value = recon
  rows.value = recon.matches
}

// Totals for donut
const donut = computed(() => {
  if (!result.value) return { matched: 0, missingInBank: 0, missingInMerchant: 0, amountMismatch: 0 }
  const t = result.value.totals
  return {
    matched: t.matched,
    missingInBank: t.missingInBank,
    missingInMerchant: t.missingInMerchant,
    amountMismatch: t.amountMismatch
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
