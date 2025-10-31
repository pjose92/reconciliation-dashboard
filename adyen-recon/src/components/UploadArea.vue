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

// Selected file UI state
const merchantSelected = ref(false)
const bankSelected = ref(false)
const merchantName = ref('')
const bankName = ref('')

// Success toast state
const success = ref(false)
const successMsg = ref('Files uploaded and parsed successfully')
const durationMs = 2500

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

function showSuccess(message: string) {
  successMsg.value = message
  success.value = false
  requestAnimationFrame(() => {
    success.value = true
    window.setTimeout(() => { success.value = false }, durationMs)
  })
}

function onMerchantChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] || null
  merchantFile.value = file
  if (file) {
    merchantName.value = file.name
    merchantSelected.value = false
    requestAnimationFrame(() => { merchantSelected.value = true })
  } else {
    merchantName.value = ''
    merchantSelected.value = false
  }
}

function onBankChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] || null
  bankFile.value = file
  if (file) {
    bankName.value = file.name
    bankSelected.value = false
    requestAnimationFrame(() => { bankSelected.value = true })
  } else {
    bankName.value = ''
    bankSelected.value = false
  }
}

function clearMerchant() {
  merchantFile.value = null
  merchantName.value = ''
  merchantSelected.value = false
  // also clear the input element
  const el = document.getElementById('merchant-input') as HTMLInputElement | null
  if (el) el.value = ''
}

function clearBank() {
  bankFile.value = null
  bankName.value = ''
  bankSelected.value = false
  const el = document.getElementById('bank-input') as HTMLInputElement | null
  if (el) el.value = ''
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

    const requiredM = ['transactionId', 'date', 'amount']
    const requiredB = ['transactionId', 'date', 'amount']
    for (const f of requiredM) if (!(f in merchant[0])) throw new Error(`Merchant file missing field: ${f}`)
    for (const f of requiredB) if (!(f in bank[0])) throw new Error(`Bank file missing field: ${f}`)

    emit('loaded', { merchant, bank })
    showSuccess('Files uploaded and parsed successfully')
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
    <p class="muted">
      Both files must have headers: <code>transactionId,date,amount</code>. Extra columns are OK.
    </p>

    <div class="row">
      <!-- Merchant picker -->
      <div class="picker">
        <label class="file-input" for="merchant-input">
          <input id="merchant-input" type="file" accept=".csv" @change="onMerchantChange" />
          <span>Choose Merchant Export</span>
        </label>

        <!-- Selection indicator -->
        <div
          v-if="merchantSelected"
          class="chip success"
          aria-live="polite"
          aria-atomic="true"
        >
          <span class="check">✓</span>
          <span class="name" :title="merchantName">{{ merchantName }}</span>
          <button class="clear" @click="clearMerchant" aria-label="Clear merchant file">×</button>
          <div class="pulse"></div>
        </div>
      </div>

      <!-- Bank picker -->
      <div class="picker">
        <label class="file-input" for="bank-input">
          <input id="bank-input" type="file" accept=".csv" @change="onBankChange" />
          <span>Choose Bank Statement</span>
        </label>

        <!-- Selection indicator -->
        <div
          v-if="bankSelected"
          class="chip success"
          aria-live="polite"
          aria-atomic="true"
        >
          <span class="check">✓</span>
          <span class="name" :title="bankName">{{ bankName }}</span>
          <button class="clear" @click="clearBank" aria-label="Clear bank file">×</button>
          <div class="pulse"></div>
        </div>
      </div>
    </div>

    <button class="primary" :disabled="parsing" @click="handleParse">
      {{ parsing ? 'Parsing…' : 'Parse & Load' }}
    </button>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <!-- Success toast after both files are parsed -->
    <div v-if="success" class="toast success" aria-live="polite" aria-atomic="true">
      <span class="check">✅</span>
      <span>{{ successMsg }}</span>
      <div class="bar"></div>
    </div>
  </div>
</template>

<style scoped>
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.picker { display: flex; flex-direction: column; gap: 8px; min-width: 260px; }

/* File button */
.file-input { position: relative; display: inline-block; }
.file-input input[type='file'] { display: none; }
.file-input span {
  display:inline-block; padding:8px 12px;
  border:1px solid var(--border); border-radius:10px; cursor:pointer;
}

/* Inline chip indicator */
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 9999px;
  border: 1px solid var(--border);
  background: #13251a;
  color: #c6f6d5;
  animation: fadeInUp 160ms ease-out;
}
.chip.success { border-color: #1d3b2b; }
.check {
  display:inline-flex; align-items:center; justify-content:center;
  width:18px; height:18px; border-radius:50%;
  background:#34d399; color:#0b0e13; font-weight:700; font-size:12px;
}
.name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px;
}
.clear {
  margin-left: 4px;
  border: none;
  background: transparent;
  color: #c6f6d5;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.clear:hover { opacity: 0.85; }

/* Subtle pulse ring once on appear */
.pulse {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  pointer-events: none;
  animation: ring 600ms ease-out 1;
}
@keyframes ring {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.45); }
  100% { box-shadow: 0 0 0 10px rgba(52, 211, 153, 0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Parse button and error */
.error { color: #ff6b6b; margin-top: 8px; }

/* Success toast with countdown bar */
.toast {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #122218;
  color: #c6f6d5;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  animation: slideFadeIn 220ms ease-out;
}
.toast.success { border-color: #1d3b2b; }
.bar {
  position: absolute;
  left: 10px; right: 10px; bottom: 6px;
  height: 3px; background: #34d399; border-radius: 9999px;
  transform-origin: left center;
  animation: countdown 2500ms linear forwards;
}
@keyframes slideFadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
@keyframes countdown { from { transform: scaleX(1); opacity:1;} to { transform: scaleX(0); opacity:0.7;} }
</style>
