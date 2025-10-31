<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto' // auto-registers all needed components

const props = defineProps<{
  matched: number
  missingInBank: number
  missingInMerchant: number
  amountMismatch: number
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function render() {
  if (!canvasRef.value) return
  if (chart) chart.destroy()

  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: ['Matched', 'Missing in Bank', 'Missing in Merchant', 'Amount Mismatch'],
      datasets: [
        {
          data: [
            props.matched,
            props.missingInBank,
            props.missingInMerchant,
            props.amountMismatch
          ]
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
      cutout: '60%'
    }
  })
}

onMounted(render)
onBeforeUnmount(() => chart?.destroy())
watch(() => [props.matched, props.missingInBank, props.missingInMerchant, props.amountMismatch], render)
</script>

<template>
  <div class="card">
    <h2>Reconciliation Status</h2>
    <canvas ref="canvasRef"></canvas>
  </div>
</template>
 