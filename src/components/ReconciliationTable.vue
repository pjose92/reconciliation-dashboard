<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReconMatch } from '../types'

const props = defineProps<{ rows: ReconMatch[] }>()

const query = ref('')
const status = ref<
  'all' | 'matched' | 'missing_in_bank' | 'missing_in_merchant' | 'amount_mismatch'
>('all')

function formatStatus(s: string) {
  return s.replace(/_/g, ' ')
}

function effectiveStatus(r: ReconMatch) {
  return r.overrideStatus ?? r.status
}

/* =========================
   🔥 Manual Override Logic
========================= */

function approveMismatch(r: ReconMatch) {
  r.overrideStatus = 'approved_mismatch'
  r.overrideReason = 'Manually approved by user'
}

function forceMatch(r: ReconMatch) {
  // Missing in bank → clone merchant into bank
  if (r.status === 'missing_in_bank' && r.merchant && !r.bank) {
    r.bank = {
      transactionId: r.merchant.transactionId,
      amount: r.merchant.amount,
      date: r.merchant.date,
    } as any
  }

  // Missing in merchant → clone bank into merchant
  if (r.status === 'missing_in_merchant' && r.bank && !r.merchant) {
    r.merchant = {
      transactionId: r.bank.transactionId,
      amount: r.bank.amount,
      date: r.bank.date,
    } as any
  }

  r.diff = 0
  r.overrideStatus = 'matched'
  r.overrideReason = 'Manually force-matched'
}

function clearOverride(r: ReconMatch) {
  r.overrideStatus = undefined
  r.overrideReason = undefined
}

/* =========================
   Filtering (uses override)
========================= */

const filtered = computed(() => {
  return props.rows.filter((r) => {
    const current = effectiveStatus(r)
    const inStatus = status.value === 'all' ? true : current === status.value

    const q = query.value.trim().toLowerCase()
    const inQuery = q
      ? r.transactionId.toLowerCase().includes(q) ||
        (r.merchant?.amount + '').includes(q) ||
        (r.bank?.amount + '').includes(q)
      : true

    return inStatus && inQuery
  })
})

const rowCount = computed(() => filtered.value.length)
</script>

<template>
  <div class="card">
    <h2>3) Review Results</h2>

    <div class="toolbar">
      <input
        class="input"
        placeholder="Search by ID or amount"
        v-model="query"
      />

      <select class="input" v-model="status">
        <option value="all">All statuses</option>
        <option value="matched">Matched</option>
        <option value="missing_in_bank">Missing in Bank</option>
        <option value="missing_in_merchant">Missing in Merchant</option>
        <option value="amount_mismatch">Amount Mismatch</option>
      </select>

      <div class="count">
        {{ rowCount }} rows
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Merchant Amount</th>
            <th>Bank Amount</th>
            <th>Diff</th>
            <th>Merchant Date</th>
            <th>Bank Date</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(r, i) in filtered"
            :key="r.transactionId + '-' + i"
            :class="effectiveStatus(r)"
          >
            <td><code>{{ r.transactionId }}</code></td>

            <!-- STATUS + ACTIONS -->
            <td>
              <span class="badge" :class="effectiveStatus(r)">
                {{ formatStatus(effectiveStatus(r)) }}
              </span>

              <div class="actions">
                <!-- Approve mismatch -->
                <button
                  v-if="r.status === 'amount_mismatch' && !r.overrideStatus"
                  @click="approveMismatch(r)"
                  class="link"
                >
                  Approve
                </button>

                <!-- Force match missing -->
                <button
                  v-if="(r.status === 'missing_in_bank' || r.status === 'missing_in_merchant') && !r.overrideStatus"
                  @click="forceMatch(r)"
                  class="link"
                >
                  Force Match
                </button>

                <!-- Reset override -->
                <button
                  v-if="r.overrideStatus"
                  @click="clearOverride(r)"
                  class="link danger"
                >
                  Reset
                </button>
              </div>
            </td>

            <!-- REASON -->
            <td>
              <small class="reason">
                {{ r.overrideReason ?? r.matchReason }}
              </small>
            </td>

            <td>{{ r.merchant?.amount?.toFixed?.(2) ?? '—' }}</td>
            <td>{{ r.bank?.amount?.toFixed?.(2) ?? '—' }}</td>

            <td :class="{ negative: r.diff < 0, positive: r.diff > 0 }">
              {{ r.diff?.toFixed?.(2) }}
            </td>

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

.table {
  width:100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th, .table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;  
}

td {
  color: black;
}

tr.matched { background: #f5fff7; }
tr.missing_in_bank { background: #fff7f7; }
tr.missing_in_merchant { background: #fffaf2; }
tr.amount_mismatch { background: #fffaf2; }
tr.approved_mismatch { background: #eef2ff; }

.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.matched { background:#d9f8e3; color:#0a7a2f; }
.badge.missing_in_bank { background:#ffdcdc; color:#a80000; }
.badge.missing_in_merchant { background:#ffe9c9; color:#a05a00; }
.badge.amount_mismatch { background:#ffe9c9; color:#a05a00; }
.badge.approved_mismatch { background:#e0e7ff; color:#3730a3; }

.reason {
  color:#666;
  font-size: 11px;
}

.negative { color:#a80000; font-weight:600; }
.positive { color:#0a7a2f; font-weight:600; }

.toolbar {
  display:flex;
  gap:12px;
  margin-bottom:12px;
  align-items:center;
}

.count {
  margin-left:auto;
  font-weight:600;
}

/* Override buttons */
.actions {
  display:flex;
  gap:6px;
  margin-top:4px;
}

.link {
  background:none;
  border:none;
  padding:0;
  font-size:11px;
  cursor:pointer;
  color:#2563eb;
}

.link:hover {
  text-decoration:underline;
}

.link.danger {
  color:#b91c1c;
}
</style>