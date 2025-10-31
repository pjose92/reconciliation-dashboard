<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

type Row = {
  status: 'matched' | 'missing_in_bank' | 'missing_in_merchant' | 'amount_mismatch'
  diff: number
  merchant: { date?: string; amount?: number } | null
  bank: { date?: string; amount?: number } | null
}

const props = defineProps<{ rows: Row[] }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function toYMD(s?: string) {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10)
}

function buildSeries() {
  const byDate = new Map<string, number>()

  for (const r of props.rows) {
    const date = toYMD(r.bank?.date || r.merchant?.date)
    if (!date) continue

    let delta = 0
    if (r.status === 'missing_in_bank' && r.merchant?.amount != null) {
      delta = -r.merchant.amount
    } else if (r.status === 'missing_in_merchant' && r.bank?.amount != null) {
      delta = r.bank.amount
    } else {
      delta = r.diff ?? 0
    }

    byDate.set(date, +(((byDate.get(date) || 0) + delta).toFixed(2)))
  }

  const labels = Array.from(byDate.keys()).sort()
  return { labels, data: labels.map(l => byDate.get(l) || 0) }
}

function render() {
  if (!canvasRef.value) return
  if (chart) chart.destroy()

  const { labels, data } = buildSeries()
  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Bank - Merchant (per day)', data }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: { y: { beginAtZero: true } }
    }
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => props.rows, render, { deep: true })
</script>

<template>
  <div class="card">
    <h2>Daily Net Difference</h2>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
