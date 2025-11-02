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