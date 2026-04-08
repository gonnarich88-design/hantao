# HanTao Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** รื้อ UX/UI ใหม่ทั้งหมด — Wizard 2 ขั้นตอน → Main App 3 Tabs (รายการ / บิล-ร้าน / สรุป) พร้อมลด data model ให้เรียบง่ายขึ้น

**Architecture:** แยก view ออกเป็น WizardView (setup) และ MainTabView (3 tabs) โดย App.tsx จัดการ state กลาง ผู้จ่ายเก็บเป็น `payerId` ระดับ session แทน `isPayer` ใน Member แต่ละ item มีแค่ `assignedMemberIds` (ใครกิน) SC/VAT อยู่ที่ Receipt level

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, @google/genai, Supabase, Vitest (ต้องเพิ่ม)

---

## File Map

| File | สถานะ | หน้าที่ |
|------|--------|---------|
| `types.ts` | แก้ไข | data model ใหม่ |
| `utils/calculations.ts` | แก้ไข | calculation ที่ simplified |
| `utils/calculations.test.ts` | ใหม่ | unit tests |
| `components/WizardView.tsx` | ใหม่ | wizard 2 steps |
| `components/MainTabView.tsx` | ใหม่ | tab container + header |
| `components/tabs/ItemsTab.tsx` | ใหม่ | รายการ tab |
| `components/tabs/AddItemForm.tsx` | ใหม่ | form เพิ่มรายการ manual |
| `components/tabs/ScanReviewSheet.tsx` | ใหม่ | review AI scan result |
| `components/tabs/BillsTab.tsx` | ใหม่ | บิล/ร้าน tab |
| `components/tabs/SummaryTab.tsx` | ใหม่ | สรุป tab |
| `App.tsx` | แก้ไข | state + handlers ใหม่ |
| `components/LandingPage.tsx` | แก้ไข เล็กน้อย | เอา ManualWizard ออก |
| `components/HistoryView.tsx` | แก้ไข เล็กน้อย | compat กับ types ใหม่ |

**ลบทิ้ง (หลังทำครบ):**
- `components/ItemSection.tsx`
- `components/MemberSection.tsx`
- `components/SummarySection.tsx`
- `components/SummaryModal.tsx`
- `components/MemberCardModal.tsx`
- `components/ManualWizard.tsx`
- `components/TableSummary.tsx`

---

## Task 1: Setup Vitest + อัพเดต types.ts

**Files:**
- Create: `vite.config.ts` (เพิ่ม test config)
- Create: `utils/calculations.test.ts`
- Modify: `types.ts`
- Modify: `package.json`

- [ ] **Step 1: เพิ่ม vitest dependencies**

```bash
npm install -D vitest @vitest/ui
```

Expected: `package.json` มี `"vitest"` ใน devDependencies

- [ ] **Step 2: อัพเดต vite.config.ts เพิ่ม test config**

แทนที่ content ทั้งหมดของ `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 3: เพิ่ม test script ใน package.json**

เปิด `package.json` แล้วเปลี่ยน scripts section:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 4: อัพเดต types.ts ใหม่ทั้งหมด**

แทนที่ content ทั้งหมดของ `types.ts`:

```ts
export interface Member {
  id: string
  name: string
  bank?: string        // ชื่อธนาคาร เช่น "กสิกรไทย", "PromptPay"
  promptPayId?: string // เลขบัญชี หรือ เบอร์พร้อมเพย์ (ชื่อ field คงไว้ backward compat)
}

export interface Item {
  id: string
  name: string
  price: number       // ราคาต่อหน่วย
  quantity: number    // จำนวน
  assignedMemberIds: string[] // ใครกิน/ใช้ (หารเท่ากัน)
  receiptId: string
}

export interface Receipt {
  id: string
  name: string
  scRate: number          // Service Charge %
  vatRate: number         // VAT %
  discountType?: 'percent' | 'amount'
  discountValue?: number
}

export type RoundingMethod = 'payer' | 'split'

export interface BillSession {
  id: string
  name: string
  payerId: string         // member ที่ออกเงินจ่ายก่อน
  roundingMethod: RoundingMethod
  members: Member[]
  items: Item[]
  receipts: Receipt[]
}

// ใช้สำหรับ history ใน localStorage / Supabase
export interface SavedBill {
  id: string
  timestamp: number
  name: string
  payerId: string
  roundingMethod: RoundingMethod
  members: Member[]
  items: Item[]
  receipts: Receipt[]
  total: number
}

export interface MemberSummary {
  memberId: string
  memberName: string
  totalConsumption: number
  totalPaid: number
  netBalance: number
  items: { name: string; share: number }[]
}

export interface Transfer {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}
```

- [ ] **Step 5: Commit**

```bash
git add types.ts vite.config.ts package.json package-lock.json
git commit -m "feat: setup vitest + update types.ts with simplified data model"
```

---

## Task 2: เขียน calculations.ts ใหม่ (TDD)

**Files:**
- Modify: `utils/calculations.ts`
- Create: `utils/calculations.test.ts`

**Logic ใหม่:**
1. Per receipt: หาค่า scale factor จาก discount → SC → VAT
2. Per item: `itemTotal = price * qty * scaleFactor`
3. แต่ละ item หาร `itemTotal` เท่ากันใน `assignedMemberIds`
4. Transfer: ผู้จ่าย (payerId) จ่าย grand total แล้วรับเงินคืนจากทุกคน

- [ ] **Step 1: เขียน failing tests**

สร้าง `utils/calculations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calculateSummary, formatCurrency } from './calculations'
import { Member, Item, Receipt } from '../types'

const m1: Member = { id: 'a', name: 'แอน' }
const m2: Member = { id: 'b', name: 'บี' }
const m3: Member = { id: 'c', name: 'ซี' }
const members = [m1, m2, m3]

const receipt: Receipt = { id: 'r1', name: 'ร้าน A', scRate: 0, vatRate: 0 }

describe('calculateSummary', () => {
  it('หารเท่ากันทุกคน', () => {
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 120, quantity: 1,
      assignedMemberIds: ['a', 'b', 'c'], receiptId: 'r1'
    }]
    const { summaries } = calculateSummary(members, items, [receipt], 'a', 'payer')
    expect(summaries.find(s => s.memberId === 'a')!.totalConsumption).toBeCloseTo(40)
    expect(summaries.find(s => s.memberId === 'b')!.totalConsumption).toBeCloseTo(40)
    expect(summaries.find(s => s.memberId === 'c')!.totalConsumption).toBeCloseTo(40)
  })

  it('หารเฉพาะบางคน', () => {
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 100, quantity: 1,
      assignedMemberIds: ['a', 'b'], receiptId: 'r1'
    }]
    const { summaries } = calculateSummary(members, items, [receipt], 'a', 'payer')
    expect(summaries.find(s => s.memberId === 'a')!.totalConsumption).toBeCloseTo(50)
    expect(summaries.find(s => s.memberId === 'b')!.totalConsumption).toBeCloseTo(50)
    expect(summaries.find(s => s.memberId === 'c')!.totalConsumption).toBeCloseTo(0)
  })

  it('คำนวณ SC และ VAT ถูกต้อง', () => {
    const receiptWithTax: Receipt = { id: 'r2', name: 'ร้าน B', scRate: 10, vatRate: 7 }
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 100, quantity: 1,
      assignedMemberIds: ['a'], receiptId: 'r2'
    }]
    // 100 + SC 10 = 110, VAT 7% of 110 = 7.7 → total = 117.7
    const { summaries } = calculateSummary(members, items, [receiptWithTax], 'a', 'payer')
    expect(summaries.find(s => s.memberId === 'a')!.totalConsumption).toBeCloseTo(117.7)
  })

  it('ส่วนลด percent ลดจาก subtotal ก่อน SC/VAT', () => {
    const receiptDiscount: Receipt = {
      id: 'r3', name: 'ร้าน C', scRate: 0, vatRate: 0,
      discountType: 'percent', discountValue: 50
    }
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 200, quantity: 1,
      assignedMemberIds: ['a', 'b'], receiptId: 'r3'
    }]
    // discount 50% → 100, หาร 2 = 50 each
    const { summaries } = calculateSummary(members, items, [receiptDiscount], 'a', 'payer')
    expect(summaries.find(s => s.memberId === 'a')!.totalConsumption).toBeCloseTo(50)
    expect(summaries.find(s => s.memberId === 'b')!.totalConsumption).toBeCloseTo(50)
  })

  it('คำนวณ transfers ถูกต้อง — ผู้จ่ายคือ a', () => {
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 300, quantity: 1,
      assignedMemberIds: ['a', 'b', 'c'], receiptId: 'r1'
    }]
    const { transfers } = calculateSummary(members, items, [receipt], 'a', 'payer')
    // แต่ละคนกิน 100, a จ่าย 300 ทั้งหมด → b และ c ต้องโอนให้ a คนละ 100
    expect(transfers).toHaveLength(2)
    const bToA = transfers.find(t => t.fromId === 'b' && t.toId === 'a')
    expect(bToA!.amount).toBeCloseTo(100)
  })

  it('item ที่ไม่มี assignedMemberIds ไม่นับในการคำนวณ', () => {
    const items: Item[] = [{
      id: 'i1', name: 'ข้าวผัด', price: 120, quantity: 1,
      assignedMemberIds: [], receiptId: 'r1'
    }]
    const { summaries } = calculateSummary(members, items, [receipt], 'a', 'payer')
    summaries.forEach(s => expect(s.totalConsumption).toBeCloseTo(0))
  })
})

describe('formatCurrency', () => {
  it('format ตัวเลขเป็น string พร้อม commas', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50')
    expect(formatCurrency(0)).toBe('0.00')
  })
})
```

- [ ] **Step 2: รัน test เพื่อยืนยันว่า fail**

```bash
npm test
```

Expected: หลาย test fail เพราะ `calculateSummary` signature เปลี่ยน

- [ ] **Step 3: เขียน calculations.ts ใหม่**

แทนที่ content ทั้งหมดของ `utils/calculations.ts`:

```ts
import { Member, Item, Receipt, MemberSummary, Transfer } from '../types'

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * คำนวณ scale factor ของแต่ละ receipt
 * scale = (subtotal_after_discount + SC + VAT) / subtotal_before_discount
 * ใช้คูณราคาแต่ละรายการเพื่อกระจาย SC/VAT/discount อย่าง proportional
 */
function getReceiptScaleFactor(receipt: Receipt, subtotal: number): number {
  if (subtotal <= 0) return 1

  const discount = receipt.discountValue ?? 0
  let discounted = subtotal
  if (receipt.discountType === 'percent') {
    discounted = subtotal * (1 - discount / 100)
  } else if (receipt.discountType === 'amount') {
    discounted = Math.max(0, subtotal - discount)
  }

  const sc = discounted * (receipt.scRate / 100)
  const vat = (discounted + sc) * (receipt.vatRate / 100)
  const total = discounted + sc + vat

  return total / subtotal
}

export function calculateSummary(
  members: Member[],
  items: Item[],
  receipts: Receipt[],
  payerId: string,
  roundingMethod: 'payer' | 'split'
): { summaries: MemberSummary[]; transfers: Transfer[] } {
  const summaryMap = new Map<string, MemberSummary>()
  members.forEach((m) => {
    summaryMap.set(m.id, {
      memberId: m.id,
      memberName: m.name,
      totalConsumption: 0,
      totalPaid: 0,
      netBalance: 0,
      items: [],
    })
  })

  // คำนวณ subtotal ต่อ receipt (sum of price * qty)
  const receiptSubtotals = new Map<string, number>()
  receipts.forEach((r) => receiptSubtotals.set(r.id, 0))
  items.forEach((item) => {
    const sub = receiptSubtotals.get(item.receiptId) ?? 0
    receiptSubtotals.set(item.receiptId, sub + item.price * item.quantity)
  })

  // scale factor ต่อ receipt
  const receiptScaleFactors = new Map<string, number>()
  receipts.forEach((r) => {
    const sub = receiptSubtotals.get(r.id) ?? 0
    receiptScaleFactors.set(r.id, getReceiptScaleFactor(r, sub))
  })

  // กระจายค่าใช้จ่ายต่อ item
  items.forEach((item) => {
    if (item.assignedMemberIds.length === 0) return

    const scaleFactor = receiptScaleFactors.get(item.receiptId) ?? 1
    const itemTotal = item.price * item.quantity * scaleFactor
    const sharePerMember = itemTotal / item.assignedMemberIds.length

    item.assignedMemberIds.forEach((memberId) => {
      const stats = summaryMap.get(memberId)
      if (!stats) return
      stats.totalConsumption += sharePerMember
      stats.items.push({ name: item.name, share: sharePerMember })
    })
  })

  // grand total = ผลรวม consumption ทุกคน
  let grandTotal = 0
  summaryMap.forEach((s) => { grandTotal += s.totalConsumption })

  // ผู้จ่าย: totalPaid = grandTotal
  const payer = summaryMap.get(payerId)
  if (payer) payer.totalPaid = grandTotal

  // net balance
  summaryMap.forEach((s) => { s.netBalance = s.totalPaid - s.totalConsumption })

  // คำนวณ transfers (minimize number of transactions)
  const summaries = Array.from(summaryMap.values())
  const transfers = calculateTransfers(summaries, members)

  return { summaries, transfers }
}

function calculateTransfers(summaries: MemberSummary[], members: Member[]): Transfer[] {
  const memberMap = new Map(members.map((m) => [m.id, m]))
  const transfers: Transfer[] = []

  // creditors = คนที่ netBalance > 0 (รับเงิน), debtors = คนที่ netBalance < 0 (จ่ายเงิน)
  const creditors = summaries
    .filter((s) => s.netBalance > 0.005)
    .map((s) => ({ id: s.memberId, amount: s.netBalance }))
  const debtors = summaries
    .filter((s) => s.netBalance < -0.005)
    .map((s) => ({ id: s.memberId, amount: -s.netBalance }))

  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci]
    const debit = debtors[di]
    const amount = Math.min(credit.amount, debit.amount)

    if (amount > 0.005) {
      transfers.push({
        fromId: debit.id,
        fromName: memberMap.get(debit.id)?.name ?? debit.id,
        toId: credit.id,
        toName: memberMap.get(credit.id)?.name ?? credit.id,
        amount: Math.round(amount * 100) / 100,
      })
    }

    credit.amount -= amount
    debit.amount -= amount
    if (credit.amount < 0.005) ci++
    if (debit.amount < 0.005) di++
  }

  return transfers
}
```

- [ ] **Step 4: รัน tests**

```bash
npm test
```

Expected: ทุก test ผ่าน

- [ ] **Step 5: Commit**

```bash
git add utils/calculations.ts utils/calculations.test.ts vite.config.ts
git commit -m "feat: rewrite calculations.ts with simplified model + add vitest tests"
```

---

## Task 3: WizardView Component

**Files:**
- Create: `components/WizardView.tsx`

- [ ] **Step 1: สร้าง WizardView.tsx**

```tsx
import React, { useState } from 'react'
import { Plus, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Member } from '../types'

const BANK_OPTIONS = [
  'กสิกรไทย', 'กรุงไทย', 'กรุงเทพ', 'ไทยพาณิชย์',
  'กรุงศรีอยุธยา', 'ทหารไทยธนชาต', 'ออมสิน', 'PromptPay'
]

interface WizardViewProps {
  onComplete: (members: Member[], payerId: string) => void
}

export const WizardView: React.FC<WizardViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [members, setMembers] = useState<Member[]>([])
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [selectedPayerId, setSelectedPayerId] = useState('')
  const [nameError, setNameError] = useState('')

  const handleAddMember = () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('กรุณากรอกชื่อ'); return }
    if (members.find(m => m.name === trimmed)) { setNameError('ชื่อซ้ำ'); return }
    setNameError('')
    const newMember: Member = {
      id: crypto.randomUUID(),
      name: trimmed,
      bank: bank || undefined,
      promptPayId: account.trim() || undefined,
    }
    setMembers(prev => [...prev, newMember])
    setName('')
    setBank('')
    setAccount('')
  }

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    if (selectedPayerId === id) setSelectedPayerId('')
  }

  const handleGoToStep2 = () => {
    if (members.length < 2) return
    if (!selectedPayerId && members.length > 0) setSelectedPayerId(members[0].id)
    setStep(2)
  }

  const handleFinish = () => {
    const payerId = selectedPayerId || members[0].id
    onComplete(members, payerId)
  }

  const progress = step === 1 ? 'w-1/2' : 'w-full'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mb-6">
          <div className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${progress}`} />
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold mb-1 dark:text-white">ใครไปด้วยกัน? 👥</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">เพิ่มชื่อคนที่ร่วมหารบิลนี้</p>

            {/* Add form */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-4 space-y-2">
              <input
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="ชื่อ *"
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-400 focus:outline-none"
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                >
                  <option value="">🏦 ธนาคาร (ไม่บังคับ)</option>
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <input
                  className="flex-[2] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
                  placeholder="เลขบัญชี / พร้อมเพย์"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddMember}
                className="w-full bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-indigo-600 active:scale-95 transition-all"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>

            {/* Member list */}
            <div className="space-y-2 mb-6">
              {members.map(m => (
                <div key={m.id} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-indigo-800 dark:text-indigo-300">{m.name}</p>
                    {(m.bank || m.promptPayId) && (
                      <p className="text-xs text-indigo-400 mt-0.5">
                        {m.bank && `💳 ${m.bank}`}{m.bank && m.promptPayId && ' · '}{m.promptPayId}
                      </p>
                    )}
                    {!m.bank && !m.promptPayId && (
                      <p className="text-xs text-gray-400">ไม่มีข้อมูลรับโอน</p>
                    )}
                  </div>
                  <button onClick={() => handleRemoveMember(m.id)} className="text-indigo-300 hover:text-red-400 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleGoToStep2}
              disabled={members.length < 2}
              className="w-full bg-indigo-500 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ถัดไป <ChevronRight size={18} />
            </button>
            {members.length < 2 && (
              <p className="text-center text-xs text-gray-400 mt-2">ต้องมีอย่างน้อย 2 คน</p>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 mb-4 hover:text-gray-600">
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold mb-1 dark:text-white">ใครออกเงินจ่ายก่อน? 💳</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">คนที่ควักเงินจ่ายให้ร้าน — คนอื่นจะโอนเงินคืนให้เขา</p>

            <div className="space-y-2 mb-6">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedPayerId(m.id)}
                  className={`w-full text-left border-2 rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                    selectedPayerId === m.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-100 dark:border-slate-700 hover:border-indigo-200'
                  }`}
                >
                  <div>
                    <p className={`font-semibold text-sm ${selectedPayerId === m.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'}`}>{m.name}</p>
                    {(m.bank || m.promptPayId) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.bank && `💳 ${m.bank}`}{m.bank && m.promptPayId && ' · '}{m.promptPayId}
                      </p>
                    )}
                    {!m.bank && !m.promptPayId && <p className="text-xs text-gray-300">ไม่มีข้อมูลรับโอน</p>}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayerId === m.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-200 dark:border-slate-600'
                  }`}>
                    {selectedPayerId === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={!selectedPayerId}
              className="w-full bg-indigo-500 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              เริ่มใส่รายการ 🚀
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ตรวจสอบ TypeScript compile ไม่ error**

```bash
npx tsc --noEmit
```

Expected: ไม่มี error (อาจมี warning จาก file อื่นที่ยังใช้ types เก่า — ปล่อยไว้ก่อน)

- [ ] **Step 3: Commit**

```bash
git add components/WizardView.tsx
git commit -m "feat: add WizardView with 2-step member setup"
```

---

## Task 4: AddItemForm Component

**Files:**
- Create: `components/tabs/AddItemForm.tsx`

- [ ] **Step 1: สร้าง directory และ component**

```bash
mkdir -p /path/to/components/tabs
```

สร้าง `components/tabs/AddItemForm.tsx`:

```tsx
import React, { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Member, Receipt } from '../../types'

interface AddItemFormProps {
  members: Member[]
  receipts: Receipt[]
  onAdd: (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => void
  onClose: () => void
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ members, receipts, onAdd, onClose }) => {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [receiptId, setReceiptId] = useState(receipts[0]?.id ?? '')
  const [errors, setErrors] = useState<{ name?: string; price?: string; members?: string }>({})

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(members.map(m => m.id)))

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'กรุณากรอกชื่อรายการ'
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) e.price = 'กรุณากรอกราคา'
    if (selected.size === 0) e.members = 'กรุณาเลือกอย่างน้อย 1 คน'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onAdd(name.trim(), parseFloat(price), parseInt(quantity) || 1, Array.from(selected), receiptId)
    onClose()
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      <div className="flex gap-2 mb-2">
        <div className="flex-[2]">
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ชื่อรายการ *"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div className="flex-1">
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ราคา *"
            type="number"
            min="0"
            value={price}
            onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: undefined })) }}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">จำนวน</label>
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </div>
        {receipts.length > 1 && (
          <div className="flex-[2]">
            <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">ร้าน</label>
            <select
              className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
              value={receiptId}
              onChange={e => setReceiptId(e.target.value)}
            >
              {receipts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Member selector */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-500 dark:text-slate-400">ใครกิน/ใช้? *</p>
          <button onClick={selectAll} className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
            <Users size={12} /> ทุกคน
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => { toggle(m.id); setErrors(p => ({ ...p, members: undefined })) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                selected.has(m.id)
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400'
              }`}
            >
              {selected.has(m.id) ? '✓ ' : ''}{m.name}
            </button>
          ))}
        </div>
        {errors.members && <p className="text-xs text-red-500 mt-1">{errors.members}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-indigo-600 active:scale-95 transition-all"
        >
          <Plus size={16} /> เพิ่ม
        </button>
        <button
          onClick={onClose}
          className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tabs/AddItemForm.tsx
git commit -m "feat: add AddItemForm component with member chip selector"
```

---

## Task 5: ScanReviewSheet Component

**Files:**
- Create: `components/tabs/ScanReviewSheet.tsx`

หมายเหตุ: logic การเรียก Gemini AI ยังอยู่ใน `App.tsx` (handleScanReceipt) — Task นี้สร้างเฉพาะ review UI หลังจาก AI ส่ง result มาแล้ว

- [ ] **Step 1: สร้าง ScanReviewSheet.tsx**

```tsx
import React, { useState, useRef } from 'react'
import { Camera, Upload, Users, Check, X, Loader2 } from 'lucide-react'
import { Member, Receipt } from '../../types'

export interface ScannedItem {
  id: string
  name: string
  price: number
  quantity: number
  assignedMemberIds: string[]
}

interface ScanReviewSheetProps {
  members: Member[]
  receipts: Receipt[]
  defaultReceiptId: string
  onConfirm: (items: ScannedItem[], receiptId: string) => void
  onCancel: () => void
  onScanFiles: (files: File[]) => Promise<ScannedItem[]>
  isScanning: boolean
}

export const ScanReviewSheet: React.FC<ScanReviewSheetProps> = ({
  members, receipts, defaultReceiptId,
  onConfirm, onCancel, onScanFiles, isScanning
}) => {
  const [phase, setPhase] = useState<'upload' | 'scanning' | 'review'>('upload')
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [receiptId, setReceiptId] = useState(defaultReceiptId)
  const [previews, setPreviews] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (selected: File[]) => {
    if (selected.length === 0) return
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
  }

  const handleScan = async () => {
    if (files.length === 0) return
    setPhase('scanning')
    const items = await onScanFiles(files)
    setScannedItems(items)
    setPhase('review')
  }

  const toggleMember = (itemId: string, memberId: string) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const has = item.assignedMemberIds.includes(memberId)
      return {
        ...item,
        assignedMemberIds: has
          ? item.assignedMemberIds.filter(id => id !== memberId)
          : [...item.assignedMemberIds, memberId]
      }
    }))
  }

  const selectAllForItem = (itemId: string) => {
    setScannedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, assignedMemberIds: members.map(m => m.id) } : item
    ))
  }

  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setScannedItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value }
        : item
    ))
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      {phase === 'upload' && (
        <>
          <h3 className="font-semibold text-sm mb-3 dark:text-white">📷 สแกนใบเสร็จ</h3>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors mb-3"
          >
            <Camera size={32} className="mx-auto text-indigo-400 mb-2" />
            <p className="text-sm font-semibold text-indigo-500">ถ่ายรูป / เลือกรูป</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG — เลือกหลายรูปได้</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(Array.from(e.target.files ?? []))}
          />
          {previews.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {previews.map((src, i) => (
                <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-indigo-300" />
              ))}
            </div>
          )}
          {receipts.length > 1 && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">เพิ่มเข้าร้าน</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
                value={receiptId}
                onChange={e => setReceiptId(e.target.value)}
              >
                {receipts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleScan}
              disabled={files.length === 0}
              className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40"
            >
              ✨ วิเคราะห์ด้วย AI
            </button>
            <button onClick={onCancel} className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 rounded-lg text-sm">
              ยกเลิก
            </button>
          </div>
        </>
      )}

      {phase === 'scanning' && (
        <div className="text-center py-10">
          <Loader2 size={40} className="mx-auto text-indigo-400 animate-spin mb-3" />
          <p className="font-semibold dark:text-white">AI กำลังอ่านใบเสร็จ...</p>
          <p className="text-xs text-gray-400 mt-1">ไม่เกิน 15 วินาที</p>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm dark:text-white">✨ AI พบ {scannedItems.length} รายการ</p>
            <p className="text-xs text-gray-400">แก้ไขได้ก่อนเพิ่ม</p>
          </div>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {scannedItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border-b border-gray-200 dark:border-slate-600 text-sm font-semibold dark:text-white bg-transparent focus:outline-none"
                    value={item.name}
                    onChange={e => updateItem(item.id, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="w-16 text-right border-b border-gray-200 dark:border-slate-600 text-sm font-bold text-indigo-600 bg-transparent focus:outline-none"
                      type="number"
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', e.target.value)}
                    />
                    <span className="text-xs text-gray-400">฿</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-400">ใครกิน?</p>
                  <button onClick={() => selectAllForItem(item.id)} className="text-xs text-indigo-500 flex items-center gap-1">
                    <Users size={10} /> ทุกคน
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => {
                    const active = item.assignedMemberIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(item.id, m.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                          active
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-400'
                        }`}
                      >
                        {active ? '✓ ' : ''}{m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(scannedItems, receiptId)}
              className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all"
            >
              <Check size={16} /> เพิ่มทั้งหมด
            </button>
            <button onClick={onCancel} className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 rounded-lg text-sm">
              <X size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tabs/ScanReviewSheet.tsx
git commit -m "feat: add ScanReviewSheet component for AI scan review"
```

---

## Task 6: ItemsTab Component

**Files:**
- Create: `components/tabs/ItemsTab.tsx`

- [ ] **Step 1: สร้าง ItemsTab.tsx**

```tsx
import React, { useState } from 'react'
import { Edit2, Trash2, AlertTriangle, Camera, PenLine } from 'lucide-react'
import { Item, Member, Receipt } from '../../types'
import { formatCurrency } from '../../utils/calculations'
import { AddItemForm } from './AddItemForm'
import { ScanReviewSheet, ScannedItem } from './ScanReviewSheet'

type AddMode = null | 'manual' | 'scan'

interface ItemsTabProps {
  items: Item[]
  members: Member[]
  receipts: Receipt[]
  onAddItem: (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => void
  onAddScannedItems: (items: ScannedItem[], receiptId: string) => void
  onRemoveItem: (id: string) => void
  onUpdateItem: (id: string, updates: Partial<Item>) => void
  onScanFiles: (files: File[]) => Promise<ScannedItem[]>
  isScanning: boolean
}

export const ItemsTab: React.FC<ItemsTabProps> = ({
  items, members, receipts,
  onAddItem, onAddScannedItems, onRemoveItem, onUpdateItem,
  onScanFiles, isScanning
}) => {
  const [addMode, setAddMode] = useState<AddMode>(null)

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const unassigned = items.filter(item => item.assignedMemberIds.length === 0)

  const getReceiptName = (receiptId: string) =>
    receipts.find(r => r.id === receiptId)?.name ?? 'ไม่ระบุร้าน'

  return (
    <div className="p-4">
      {/* Add buttons */}
      {addMode === null && (
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setAddMode('manual')}
            className="flex-1 bg-indigo-500 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all shadow-sm"
          >
            <PenLine size={16} /> พิมพ์เอง
          </button>
          <button
            onClick={() => setAddMode('scan')}
            className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-500 text-indigo-500 rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 transition-all"
          >
            <Camera size={16} /> สแกนใบเสร็จ
          </button>
        </div>
      )}

      {/* Add forms */}
      {addMode === 'manual' && (
        <AddItemForm
          members={members}
          receipts={receipts}
          onAdd={onAddItem}
          onClose={() => setAddMode(null)}
        />
      )}
      {addMode === 'scan' && (
        <ScanReviewSheet
          members={members}
          receipts={receipts}
          defaultReceiptId={receipts[0]?.id ?? ''}
          onConfirm={(items, receiptId) => {
            onAddScannedItems(items, receiptId)
            setAddMode(null)
          }}
          onCancel={() => setAddMode(null)}
          onScanFiles={onScanFiles}
          isScanning={isScanning}
        />
      )}

      {/* Warning: unassigned items */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            มี {unassigned.length} รายการที่ยังไม่ได้เลือกว่าใครกิน
          </p>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🍽️</p>
          <p className="text-sm">ยังไม่มีรายการ — เพิ่มด้านบนได้เลย</p>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
            รายการทั้งหมด ({items.length})
          </div>
          <div className="space-y-2">
            {items.map(item => {
              const hasNoAssignee = item.assignedMemberIds.length === 0
              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-3 ${
                    hasNoAssignee
                      ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700'
                      : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm dark:text-white">
                        {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                      </p>
                      {receipts.length > 1 && (
                        <p className="text-xs text-gray-400 mt-0.5">🏪 {getReceiptName(item.receiptId)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                        {formatCurrency(item.price * item.quantity)}฿
                      </span>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-red-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {hasNoAssignee ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1">
                      ⚠️ ยังไม่ได้เลือกว่าใครกิน — แตะ ✏️ เพื่อแก้ไข
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(item.assignedMemberIds)).map(id => {
                        const m = members.find(m => m.id === id)
                        return m ? (
                          <span key={id} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">
                            {m.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Footer total */}
      {items.length > 0 && (
        <div className="mt-4 flex justify-between items-center text-sm border-t border-gray-100 dark:border-slate-700 pt-3">
          <span className="text-gray-500 dark:text-slate-400">รวม {items.length} รายการ</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{formatCurrency(grandTotal)}฿</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tabs/ItemsTab.tsx
git commit -m "feat: add ItemsTab with manual/scan mode toggle and warning states"
```

---

## Task 7: BillsTab Component

**Files:**
- Create: `components/tabs/BillsTab.tsx`

- [ ] **Step 1: สร้าง BillsTab.tsx**

```tsx
import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Settings2, Trash2, Plus } from 'lucide-react'
import { Receipt, Item } from '../../types'
import { formatCurrency } from '../../utils/calculations'

interface BillsTabProps {
  receipts: Receipt[]
  items: Item[]
  onAddReceipt: (name: string) => void
  onUpdateReceipt: (id: string, updates: Partial<Receipt>) => void
  onRemoveReceipt: (id: string) => void
}

export const BillsTab: React.FC<BillsTabProps> = ({
  receipts, items, onAddReceipt, onUpdateReceipt, onRemoveReceipt
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editingSettings, setEditingSettings] = useState<string | null>(null)
  const [newReceiptName, setNewReceiptName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const getReceiptItems = (receiptId: string) => items.filter(i => i.receiptId === receiptId)

  const getReceiptSubtotal = (receiptId: string) =>
    getReceiptItems(receiptId).reduce((sum, i) => sum + i.price * i.quantity, 0)

  const getReceiptTotal = (receipt: Receipt) => {
    const sub = getReceiptSubtotal(receipt.id)
    const discount = receipt.discountValue ?? 0
    let discounted = sub
    if (receipt.discountType === 'percent') discounted = sub * (1 - discount / 100)
    else if (receipt.discountType === 'amount') discounted = Math.max(0, sub - discount)
    const sc = discounted * (receipt.scRate / 100)
    const vat = (discounted + sc) * (receipt.vatRate / 100)
    return discounted + sc + vat
  }

  const grandTotal = receipts.reduce((sum, r) => sum + getReceiptTotal(r), 0)

  const handleAddReceipt = () => {
    if (!newReceiptName.trim()) return
    onAddReceipt(newReceiptName.trim())
    setNewReceiptName('')
    setShowAddForm(false)
  }

  return (
    <div className="p-4">
      {/* Add receipt */}
      {showAddForm ? (
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ชื่อร้าน / บิล"
            value={newReceiptName}
            onChange={e => setNewReceiptName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddReceipt()}
            autoFocus
          />
          <button onClick={handleAddReceipt} className="bg-indigo-500 text-white rounded-lg px-4 text-sm font-semibold">เพิ่ม</button>
          <button onClick={() => setShowAddForm(false)} className="bg-gray-100 dark:bg-slate-700 text-gray-600 rounded-lg px-3 text-sm">ยกเลิก</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full border-2 border-dashed border-indigo-200 dark:border-indigo-700 text-indigo-500 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all mb-4"
        >
          <Plus size={16} /> เพิ่มร้าน/บิลใหม่
        </button>
      )}

      {/* Receipt cards */}
      <div className="space-y-3">
        {receipts.map((receipt, idx) => {
          const receiptItems = getReceiptItems(receipt.id)
          const subtotal = getReceiptSubtotal(receipt.id)
          const total = getReceiptTotal(receipt)
          const isCollapsed = collapsed.has(receipt.id)
          const isEditingSettings = editingSettings === receipt.id

          const COLORS = [
            { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-800', header: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' },
            { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-100 dark:border-sky-800', header: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300' },
            { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-100 dark:border-violet-800', header: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
          ]
          const color = COLORS[idx % COLORS.length]

          return (
            <div key={receipt.id} className={`border ${color.border} rounded-xl overflow-hidden`}>
              {/* Header */}
              <div className={`${color.header} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold text-sm ${color.text} truncate`}>{receipt.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text} font-medium flex-shrink-0`}>
                    {receiptItems.length} รายการ
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => setEditingSettings(isEditingSettings ? null : receipt.id)}
                    className={`p-1 rounded-lg transition-colors ${isEditingSettings ? color.text : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Settings2 size={15} />
                  </button>
                  {receipts.length > 1 && (
                    <button onClick={() => onRemoveReceipt(receipt.id)} className="p-1 text-red-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button onClick={() => toggleCollapse(receipt.id)} className={`p-1 ${color.text}`}>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>
              </div>

              {/* Settings panel */}
              {isEditingSettings && (
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">SC (%)</label>
                    <input
                      type="number" min="0" max="100" step="0.5"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none"
                      value={receipt.scRate}
                      onChange={e => onUpdateReceipt(receipt.id, { scRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">VAT (%)</label>
                    <input
                      type="number" min="0" max="100" step="0.5"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none"
                      value={receipt.vatRate}
                      onChange={e => onUpdateReceipt(receipt.id, { vatRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">ส่วนลด</label>
                    <select
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none"
                      value={receipt.discountType ?? 'percent'}
                      onChange={e => onUpdateReceipt(receipt.id, { discountType: e.target.value as 'percent' | 'amount' })}
                    >
                      <option value="percent">เปอร์เซ็นต์ (%)</option>
                      <option value="amount">จำนวนเงิน (฿)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {receipt.discountType === 'amount' ? 'จำนวน (฿)' : 'จำนวน (%)'}
                    </label>
                    <input
                      type="number" min="0"
                      className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-800 dark:text-white focus:outline-none"
                      value={receipt.discountValue ?? 0}
                      onChange={e => onUpdateReceipt(receipt.id, { discountValue: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              {/* Items list */}
              {!isCollapsed && (
                <div className="bg-white dark:bg-slate-900 px-4 py-3">
                  {receiptItems.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">ยังไม่มีรายการ — เพิ่มจาก Tab รายการ</p>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {receiptItems.map(item => {
                        const memberNames = Array.from(new Set(item.assignedMemberIds))
                          .map(id => members => members) // placeholder — filled in props
                        return (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700 dark:text-slate-300 truncate pr-2">
                              {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                            </span>
                            <span className="text-gray-500 dark:text-slate-400 flex-shrink-0 text-xs">
                              {formatCurrency(item.price * item.quantity)}฿
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs border-t border-gray-100 dark:border-slate-700 pt-2">
                    <span className="text-gray-400">
                      {receipt.scRate > 0 && `SC ${receipt.scRate}%`}
                      {receipt.scRate > 0 && receipt.vatRate > 0 && ' · '}
                      {receipt.vatRate > 0 && `VAT ${receipt.vatRate}%`}
                      {(receipt.discountValue ?? 0) > 0 && ` · ลด ${receipt.discountType === 'percent' ? `${receipt.discountValue}%` : `${receipt.discountValue}฿`}`}
                      {receipt.scRate === 0 && receipt.vatRate === 0 && (receipt.discountValue ?? 0) === 0 && 'ไม่มี SC/VAT'}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(total)}฿
                    </span>
                  </div>
                </div>
              )}

              {/* Collapsed summary */}
              {isCollapsed && (
                <div className="bg-white dark:bg-slate-900 px-4 py-2 flex justify-between text-xs text-gray-400">
                  <span>SC {receipt.scRate}% · VAT {receipt.vatRate}%</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(total)}฿</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Grand total */}
      {receipts.length > 0 && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="font-semibold text-sm text-green-800 dark:text-green-300">ยอดรวมทั้งหมด (หลัง SC/VAT)</span>
          <span className="font-bold text-lg text-green-700 dark:text-green-400">{formatCurrency(grandTotal)}฿</span>
        </div>
      )}
    </div>
  )
}
```

**หมายเหตุ:** ใน BillsTab ส่วน `receiptItems.map` ให้ใช้แค่ข้อมูล item ที่มี ไม่ต้องแสดงชื่อ member (แสดงใน ItemsTab แล้ว) — map ที่ถูกต้องมีแค่:
```tsx
{receiptItems.map(item => (
  <div key={item.id} className="flex justify-between items-center text-sm">
    <span className="text-gray-700 dark:text-slate-300 truncate pr-2">
      {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
    </span>
    <span className="text-gray-500 dark:text-slate-400 flex-shrink-0 text-xs">
      {formatCurrency(item.price * item.quantity)}฿
    </span>
  </div>
))}
```

- [ ] **Step 2: Commit**

```bash
git add components/tabs/BillsTab.tsx
git commit -m "feat: add BillsTab with collapsible receipt cards and SC/VAT settings"
```

---

## Task 8: SummaryTab Component

**Files:**
- Create: `components/tabs/SummaryTab.tsx`

- [ ] **Step 1: สร้าง SummaryTab.tsx**

```tsx
import React, { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Member, Item, Receipt, MemberSummary, Transfer } from '../../types'
import { calculateSummary, formatCurrency } from '../../utils/calculations'

interface SummaryTabProps {
  members: Member[]
  items: Item[]
  receipts: Receipt[]
  payerId: string
  roundingMethod: 'payer' | 'split'
  billName: string
  onSave: () => void
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  members, items, receipts, payerId, roundingMethod, billName, onSave
}) => {
  const { summaries, transfers } = calculateSummary(members, items, receipts, payerId, roundingMethod)
  const grandTotal = summaries.reduce((sum, s) => sum + s.totalConsumption, 0)
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const payer = members.find(m => m.id === payerId)

  const markPaid = (key: string) =>
    setPaidTransfers(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const copyAccount = (account: string, key: string) => {
    navigator.clipboard.writeText(account).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = () => {
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleShare = () => {
    const lines = [
      `📋 ${billName}`,
      `ยอดรวม: ${formatCurrency(grandTotal)}฿`,
      '',
      'โอนเงิน:',
      ...transfers.map(t => {
        const toMember = members.find(m => m.id === t.toId)
        const account = toMember?.promptPayId ? ` (${toMember.bank ?? ''} ${toMember.promptPayId})` : ''
        return `• ${t.fromName} → ${t.toName}${account}: ${formatCurrency(t.amount)}฿`
      }),
    ]
    const text = lines.join('\n')
    if (navigator.share) {
      navigator.share({ text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  const unassignedItems = items.filter(i => i.assignedMemberIds.length === 0)

  return (
    <div className="p-4">
      {unassignedItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ มี {unassignedItems.length} รายการที่ยังไม่มีคนกิน — ไปแก้ใน Tab รายการก่อน
        </div>
      )}

      {/* Grand total */}
      <div className="bg-indigo-500 rounded-xl p-4 text-center mb-4">
        <p className="text-indigo-200 text-sm mb-1">ยอดรวมทั้งหมด</p>
        <p className="text-white text-3xl font-extrabold">{formatCurrency(grandTotal)}฿</p>
        {payer && <p className="text-indigo-200 text-xs mt-1">💳 {payer.name} ออกเงินไปก่อน</p>}
      </div>

      {/* Per-person */}
      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">ยอดของแต่ละคน</p>
      <div className="space-y-2 mb-5">
        {summaries.map(s => {
          const isPayer = s.memberId === payerId
          return (
            <div key={s.memberId} className={`border rounded-xl px-4 py-3 flex items-center justify-between ${
              isPayer ? 'border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'
            }`}>
              <div>
                <p className="font-semibold text-sm dark:text-white">{s.memberName}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {s.items.map(i => i.name).join(', ') || 'ไม่มีรายการ'}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${isPayer ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatCurrency(s.totalConsumption)}฿
                </p>
                {isPayer && <p className="text-xs text-green-500 font-semibold mt-0.5">✓ จ่ายแล้ว</p>}
                {!isPayer && s.totalConsumption > 0.005 && <p className="text-xs text-amber-500 mt-0.5">ค้างชำระ</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <>
          <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">โอนเงินให้ใคร</p>
          <div className="space-y-3 mb-5">
            {transfers.map(t => {
              const key = `${t.fromId}-${t.toId}`
              const isPaid = paidTransfers.has(key)
              const toMember = members.find(m => m.id === t.toId)
              const accountInfo = toMember?.promptPayId
                ? `${toMember.bank ? `${toMember.bank} · ` : ''}${toMember.promptPayId}`
                : null

              return (
                <div key={key} className={`border rounded-xl p-4 ${isPaid ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 opacity-60' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm">
                      <span className="font-bold dark:text-white">{t.fromName}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{t.toName}</span>
                    </p>
                    <p className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">{formatCurrency(t.amount)}฿</p>
                  </div>
                  {accountInfo && <p className="text-xs text-gray-400 mb-2">💳 {accountInfo}</p>}
                  <div className="flex gap-2">
                    {accountInfo && (
                      <button
                        onClick={() => copyAccount(toMember!.promptPayId!, key + '-copy')}
                        className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-indigo-600 active:scale-95 transition-all"
                      >
                        {copied === key + '-copy' ? <><Check size={12} /> คัดลอกแล้ว</> : <><Copy size={12} /> คัดลอกเลขบัญชี</>}
                      </button>
                    )}
                    <button
                      onClick={() => markPaid(key)}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all ${
                        isPaid
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <Check size={12} /> {isPaid ? 'โอนแล้ว' : 'จ่ายแล้ว'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {transfers.length === 0 && items.length > 0 && unassignedItems.length === 0 && (
        <div className="text-center py-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700 mb-4">
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-semibold text-green-700 dark:text-green-300 text-sm">ทุกคนจ่ายครบแล้ว!</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 border-2 border-indigo-500 text-indigo-500 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 transition-all"
        >
          <Share2 size={16} /> แชร์สรุป
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          {saved ? <><Check size={16} /> บันทึกแล้ว</> : '💾 บันทึกบิล'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tabs/SummaryTab.tsx
git commit -m "feat: add SummaryTab with transfer cards, copy account, and share"
```

---

## Task 9: MainTabView + อัพเดต App.tsx

**Files:**
- Create: `components/MainTabView.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: สร้าง MainTabView.tsx**

```tsx
import React, { useState } from 'react'
import { Item, Member, Receipt } from '../types'
import { ItemsTab } from './tabs/ItemsTab'
import { BillsTab } from './tabs/BillsTab'
import { SummaryTab } from './tabs/SummaryTab'
import { ScannedItem } from './tabs/ScanReviewSheet'

type TabId = 'items' | 'bills' | 'summary'

interface MainTabViewProps {
  members: Member[]
  items: Item[]
  receipts: Receipt[]
  payerId: string
  roundingMethod: 'payer' | 'split'
  billName: string
  onChangePayerId: (id: string) => void
  onAddItem: (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => void
  onAddScannedItems: (items: ScannedItem[], receiptId: string) => void
  onRemoveItem: (id: string) => void
  onUpdateItem: (id: string, updates: Partial<Item>) => void
  onAddReceipt: (name: string) => void
  onUpdateReceipt: (id: string, updates: Partial<Receipt>) => void
  onRemoveReceipt: (id: string) => void
  onScanFiles: (files: File[]) => Promise<ScannedItem[]>
  onSave: () => void
  isScanning: boolean
}

export const MainTabView: React.FC<MainTabViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabId>('items')
  const [showPayerPicker, setShowPayerPicker] = useState(false)

  const payer = props.members.find(m => m.id === props.payerId)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'items', label: '🧾 รายการ' },
    { id: 'bills', label: '🏪 บิล/ร้าน' },
    { id: 'summary', label: '💰 สรุป' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 dark:bg-indigo-900 px-4 py-3 flex items-center justify-between shadow-md">
        <span className="font-bold text-white text-base">HanTao 🍜</span>
        <div className="relative">
          <button
            onClick={() => setShowPayerPicker(!showPayerPicker)}
            className="bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-white/30 transition-colors"
          >
            💳 {payer?.name ?? '—'} จ่าย
          </button>
          {showPayerPicker && (
            <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-40 overflow-hidden">
              {props.members.map(m => (
                <button
                  key={m.id}
                  onClick={() => { props.onChangePayerId(m.id); setShowPayerPicker(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${m.id === props.payerId ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'dark:text-white'}`}
                >
                  {m.id === props.payerId ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                : 'text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600 dark:hover:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'items' && (
          <ItemsTab
            items={props.items}
            members={props.members}
            receipts={props.receipts}
            onAddItem={props.onAddItem}
            onAddScannedItems={props.onAddScannedItems}
            onRemoveItem={props.onRemoveItem}
            onUpdateItem={props.onUpdateItem}
            onScanFiles={props.onScanFiles}
            isScanning={props.isScanning}
          />
        )}
        {activeTab === 'bills' && (
          <BillsTab
            receipts={props.receipts}
            items={props.items}
            onAddReceipt={props.onAddReceipt}
            onUpdateReceipt={props.onUpdateReceipt}
            onRemoveReceipt={props.onRemoveReceipt}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryTab
            members={props.members}
            items={props.items}
            receipts={props.receipts}
            payerId={props.payerId}
            roundingMethod={props.roundingMethod}
            billName={props.billName}
            onSave={props.onSave}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: อัพเดต App.tsx — state ใหม่และ handlers**

เปลี่ยน state section และ handlers ใน `App.tsx` ให้ใช้ data model ใหม่:

```tsx
// แทนที่ state ส่วน members, items, receipts, config ด้วย:
const [payerId, setPayerId] = useState<string>('')
const [roundingMethod] = useState<RoundingMethod>('payer')
const [members, setMembers] = useState<Member[]>([])
const [items, setItems] = useState<Item[]>([])
const [receipts, setReceipts] = useState<Receipt[]>([
  { id: 'default', name: 'บิล', scRate: 0, vatRate: 0 }
])
```

เปลี่ยน view type:
```tsx
type AppView = 'landing' | 'wizard' | 'calculator' | 'history' | 'auth'
```

เพิ่ม handler สำหรับ WizardView:
```tsx
const handleWizardComplete = (newMembers: Member[], newPayerId: string) => {
  setMembers(newMembers)
  setPayerId(newPayerId)
  setItems([])
  setReceipts([{ id: crypto.randomUUID(), name: 'บิล', scRate: 0, vatRate: 0 }])
  setBillName(`บิล ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`)
  setView('calculator')
}
```

เปลี่ยน handlers ของ items ให้ใช้ signature ใหม่ (ไม่มี paidBy):
```tsx
const handleAddItem = (
  name: string, price: number, quantity: number,
  assignedMemberIds: string[], receiptId: string
) => {
  setItems(prev => [...prev, {
    id: crypto.randomUUID(), name, price, quantity, assignedMemberIds, receiptId
  }])
}

const handleAddScannedItems = (scannedItems: ScannedItem[], receiptId: string) => {
  const newItems: Item[] = scannedItems.map(si => ({
    id: crypto.randomUUID(),
    name: si.name,
    price: si.price,
    quantity: si.quantity,
    assignedMemberIds: si.assignedMemberIds,
    receiptId,
  }))
  setItems(prev => [...prev, ...newItems])
}

const handleUpdateItem = (id: string, updates: Partial<Item>) => {
  setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
}

const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

const handleAddReceipt = (name: string) => {
  setReceipts(prev => [...prev, { id: crypto.randomUUID(), name, scRate: 0, vatRate: 0 }])
}

const handleUpdateReceipt = (id: string, updates: Partial<Receipt>) => {
  setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
}

const handleRemoveReceipt = (id: string) => {
  setReceipts(prev => prev.filter(r => r.id !== id))
  setItems(prev => prev.filter(i => i.receiptId !== id))
}
```

อัพเดต `handleScanReceipt` ใน App.tsx ให้ return `ScannedItem[]`:
```tsx
const handleScanFiles = async (files: File[]): Promise<ScannedItem[]> => {
  // ย้าย Gemini scan logic ที่มีอยู่แล้วมาที่นี่
  // return array ของ ScannedItem แทน void
  // ... (Gemini AI parsing logic เดิม)
  return [] // placeholder — ใส่ logic จากโค้ดเดิม
}
```

อัพเดต `handleSaveToHistory`:
```tsx
const handleSaveToHistory = () => {
  const { summaries } = calculateSummary(members, items, receipts, payerId, roundingMethod)
  const total = summaries.reduce((acc, s) => acc + s.totalConsumption, 0)
  const newBill: SavedBill = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    name: billName,
    payerId,
    roundingMethod,
    members,
    items,
    receipts,
    total,
  }
  setHistory(prev => [newBill, ...prev])
  if (auth?.user) void saveBillToCloud(auth.user.id, newBill)
}
```

เปลี่ยน JSX render ส่วน view:
```tsx
// แทนที่ render เดิมด้วย:
if (view === 'landing') return <LandingPage onStart={() => setView('wizard')} ... />
if (view === 'wizard') return <WizardView onComplete={handleWizardComplete} />
if (view === 'calculator') return (
  <MainTabView
    members={members}
    items={items}
    receipts={receipts}
    payerId={payerId}
    roundingMethod={roundingMethod}
    billName={billName}
    onChangePayerId={setPayerId}
    onAddItem={handleAddItem}
    onAddScannedItems={handleAddScannedItems}
    onRemoveItem={handleRemoveItem}
    onUpdateItem={handleUpdateItem}
    onAddReceipt={handleAddReceipt}
    onUpdateReceipt={handleUpdateReceipt}
    onRemoveReceipt={handleRemoveReceipt}
    onScanFiles={handleScanFiles}
    onSave={handleSaveToHistory}
    isScanning={isScanning}
  />
)
if (view === 'history') return <HistoryView ... />
if (view === 'auth') return <AuthView ... />
```

- [ ] **Step 3: Import ที่ต้องเพิ่มใน App.tsx**

เพิ่ม imports:
```tsx
import { WizardView } from './components/WizardView'
import { MainTabView } from './components/MainTabView'
import { ScannedItem } from './components/tabs/ScanReviewSheet'
import { RoundingMethod } from './types'
```

ลบ imports เดิมที่ไม่ใช้แล้ว:
```tsx
// ลบออก:
// import { MemberSection } from './components/MemberSection'
// import { ItemSection } from './components/ItemSection'
// import { SummarySection } from './components/SummarySection'
// import { ManualWizard } from './components/ManualWizard'
// import { TableSummary } from './components/TableSummary'
// import { BillConfig } from './types'
```

- [ ] **Step 4: ย้าย Gemini scan logic ใน App.tsx**

หา `handleScanReceipts` ใน `App.tsx` (บรรทัด 380-483) แล้วเขียน `handleScanFiles` ใหม่แทนที่:

```tsx
const handleScanFiles = async (files: File[]): Promise<ScannedItem[]> => {
  const apiKey = (window as any).__APP_CONFIG__?.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) return []
  setIsScanning(true)
  try {
    const ai = new GoogleGenAI({ apiKey })
    const allItems: ScannedItem[] = []
    for (const file of files) {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } },
            { text: "Extract food items with quantity and UNIT price (not line total). Return JSON with items array (name, price, quantity), vatRate, serviceChargeRate." }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER }
                  }
                }
              },
              vatRate: { type: Type.NUMBER },
              serviceChargeRate: { type: Type.NUMBER }
            }
          }
        }
      })
      const data = JSON.parse(response.text || '{}')
      if (Array.isArray(data.items)) {
        allItems.push(...data.items
          .filter((i: any) => i.price > 0)
          .map((i: any) => ({
            id: crypto.randomUUID(),
            name: i.name,
            price: i.price,
            quantity: i.quantity || 1,
            assignedMemberIds: [],
          }))
        )
      }
    }
    return allItems
  } catch (err) {
    console.error('[Scan] Error:', err)
    return []
  } finally {
    setIsScanning(false)
  }
}
```

**หมายเหตุ:** SC/VAT ที่ AI ตรวจจับได้ ให้ผู้ใช้ตั้งเองใน Tab บิล/ร้าน แทนการตั้งอัตโนมัติ (ลด complexity)

- [ ] **Step 5: ตรวจสอบ TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -50
```

แก้ error ที่เหลือทีละอัน (ส่วนใหญ่จะเป็น import ที่ไม่ใช้แล้ว หรือ type mismatch จาก handler signature เก่า)

- [ ] **Step 6: ทดสอบ manual — dev server**

```bash
npm run dev
```

เปิด browser ตรวจสอบ:
- [ ] Landing page โหลดได้
- [ ] กด "สร้างบิลใหม่" → wizard step 1
- [ ] เพิ่มสมาชิก 2 คน → ไป step 2
- [ ] เลือกผู้จ่าย → กด "เริ่มใส่รายการ"
- [ ] เข้า Tab รายการ, Tab บิล/ร้าน, Tab สรุปได้
- [ ] เพิ่มรายการ manual ได้, เลือกว่าใครกิน, กด เพิ่ม
- [ ] สรุปแสดงยอดถูกต้อง

- [ ] **Step 7: Commit**

```bash
git add components/MainTabView.tsx App.tsx
git commit -m "feat: add MainTabView + update App.tsx for new data model and routing"
```

---

## Task 10: HistoryView Compatibility + Cleanup

**Files:**
- Modify: `components/HistoryView.tsx`
- Delete (optional): ไฟล์ component เก่า

- [ ] **Step 1: อัพเดต HistoryView.tsx ให้รองรับ SavedBill แบบใหม่**

เปิด `components/HistoryView.tsx` แล้วตรวจสอบที่ใช้ `bill.config`, `bill.members.find(m => m.isPayer)` ฯลฯ

เปลี่ยนจาก:
```tsx
const payer = bill.members.find(m => m.isPayer)
```
เป็น:
```tsx
const payer = bill.members.find(m => m.id === bill.payerId)
```

ถ้ามี `bill.config` อย่างอื่น ให้ลบออกหรือใช้ค่า default แทน

- [ ] **Step 2: อัพเดต handleLoadBill ใน App.tsx**

```tsx
const handleLoadBill = (bill: SavedBill) => {
  setBillName(bill.name)
  setMembers(bill.members)
  setItems(bill.items)
  setPayerId(bill.payerId ?? bill.members[0]?.id ?? '')
  setReceipts(
    bill.receipts?.length > 0
      ? bill.receipts
      : [{ id: 'default', name: 'บิล', scRate: 0, vatRate: 0 }]
  )
  setView('calculator')
}
```

- [ ] **Step 3: รัน tests อีกครั้ง**

```bash
npm test
```

Expected: ทุก test ยังผ่าน

- [ ] **Step 4: Build เพื่อตรวจสอบไม่มี error**

```bash
npm run build
```

Expected: build สำเร็จไม่มี error

- [ ] **Step 5: ลบ component เก่าที่ไม่ใช้แล้ว**

```bash
rm components/ItemSection.tsx
rm components/MemberSection.tsx
rm components/SummarySection.tsx
rm components/SummaryModal.tsx
rm components/MemberCardModal.tsx
rm components/ManualWizard.tsx
rm components/TableSummary.tsx
```

- [ ] **Step 6: Build อีกครั้งหลัง cleanup**

```bash
npm run build
```

Expected: build สำเร็จ

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete HanTao redesign — wizard, 3-tab UI, simplified data model"
```

---

## Checklist ครอบคลุม Spec

| Spec requirement | Task |
|-----------------|------|
| Wizard step 1: เพิ่มสมาชิก + ธนาคาร/PromptPay | Task 3 |
| Wizard step 2: เลือกผู้จ่าย 1 คน | Task 3 |
| Tab รายการ: 2 ปุ่ม พิมพ์เอง / สแกน | Task 6 |
| Tab รายการ: เลือกว่าใครกิน + ปุ่มทุกคน | Task 4, 6 |
| Tab รายการ: ⚠️ warning ถ้าไม่มีคนกิน | Task 6 |
| Tab บิล/ร้าน: หลาย receipt กาง/ย่อได้ | Task 7 |
| Tab บิล/ร้าน: SC/VAT/ส่วนลด per receipt | Task 7 |
| Tab สรุป: ยอดรวม + ยอดต่อคน | Task 8 |
| Tab สรุป: โอนเงิน + copy เลขบัญชี | Task 8 |
| Tab สรุป: mark จ่ายแล้ว + แชร์สรุป | Task 8 |
| AI scan: อัพโหลดหลายรูป | Task 5 |
| AI scan: review ก่อนเพิ่ม + แก้ชื่อ/ราคา | Task 5 |
| เปลี่ยนผู้จ่ายได้จาก header | Task 9 |
| calculations: SC/VAT/discount per receipt | Task 2 |
| calculations: หารเท่ากันใน assignedMemberIds | Task 2 |
| backward compat กับ history เก่า | Task 10 |
