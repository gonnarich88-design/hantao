# HanTao Redesign — Design Spec
_Date: 2026-04-08_

## Overview

รื้อ UX/UI ใหม่ทั้งหมดให้ใช้งานง่ายขึ้น โดยเน้น 3 เป้าหมายหลัก:
1. User ใหม่เปิดแอปแล้วรู้ทันทีว่าต้องทำอะไร
2. รองรับหารเท่ากันทุกคน และหารเฉพาะบางคนต่อรายการ
3. ลด complexity ของ data model และ UI

---

## Core Concepts (ที่เปลี่ยนจากเดิม)

| เดิม | ใหม่ |
|------|------|
| `paidBy` per item | ผู้จ่าย 1 คนต่อบิลทั้งหมด |
| SC/VAT per item | SC/VAT per receipt (ร้าน) |
| ไม่มี wizard | Hybrid wizard → tab |
| ปุ่มสแกนซ่อนอยู่ | 2 ปุ่มชัดเจน: พิมพ์เอง / สแกน |

---

## User Flow

```
Landing Page
    ↓ กด "สร้างบิลใหม่"
Wizard Step 1 — เพิ่มสมาชิก (ชื่อ + ธนาคาร/PromptPay)
    ↓
Wizard Step 2 — เลือกผู้จ่าย (1 คน)
    ↓
Main App (3 Tabs)
    ├── 🧾 รายการ  ← default tab
    ├── 🏪 บิล/ร้าน
    └── 💰 สรุป
```

---

## Wizard

### Step 1 — เพิ่มสมาชิก
- Input: ชื่อ (required) + ธนาคาร (dropdown, optional) + เลขบัญชี/PromptPay (optional)
- กด Enter หรือปุ่ม "เพิ่ม" → แสดงเป็น chip ด้านล่าง
- chip แสดง: ชื่อ + ข้อมูลธนาคาร (ถ้ามี) + ปุ่ม ×
- ต้องมีอย่างน้อย 2 คนจึงจะไปต่อได้

### Step 2 — เลือกผู้จ่าย
- แสดงรายชื่อสมาชิกทั้งหมดเป็น card
- แต่ละ card แสดงชื่อ + ข้อมูลธนาคาร (ถ้ามี)
- เลือกได้ 1 คน (single select)
- ผู้จ่าย = คนที่ออกเงินจ่ายให้ร้านก่อน คนอื่นจะโอนเงินคืนให้เขา
- เปลี่ยนผู้จ่ายทีหลังได้จาก header ของแอปหลัก

---

## Main App — 3 Tabs

### Header (ทุก tab)
- ซ้าย: "HanTao 🍜"
- กลาง/ขวา: badge "💳 [ชื่อผู้จ่าย] จ่าย" — กดได้เพื่อเปลี่ยนผู้จ่าย
- ขวาสุด: menu (⋮) สำหรับตั้งชื่อบิล, บันทึก, ประวัติ

---

### Tab 1 — 🧾 รายการ (default)

**2 ปุ่มบนสุด:**
- `✏️ พิมพ์เอง` (primary, filled)
- `📷 สแกนใบเสร็จ` (secondary, outlined)

**เมื่อกด "พิมพ์เอง":**
- form inline หรือ bottom sheet: ชื่อ + ราคา
- chip เลือกว่าใครกิน/ใช้: แตะเพื่อ toggle แต่ละคน + ปุ่ม "ทุกคน" (shortcut)
- ต้องเลือกอย่างน้อย 1 คน

**เมื่อกด "สแกนใบเสร็จ":**
→ ดู flow สแกน AI ด้านล่าง

**รายการที่เพิ่มแล้ว:**
- card แต่ละรายการ: ชื่อ + ราคา + badge ชื่อคนกิน
- ⚠️ warning สีเหลืองถ้ารายการไหนยังไม่มีคนกิน
- กด ✏️ แก้ไข, 🗑 ลบ

**Footer:**
- "รวม N รายการ · XXX฿" (ก่อน SC/VAT)

---

### Tab 2 — 🏪 บิล/ร้าน

- ปุ่ม "+ เพิ่มร้าน/บิลใหม่" (dashed border)
- แต่ละ receipt = card ที่กาง/ย่อได้
  - Header: ชื่อร้าน + จำนวนรายการ + ปุ่ม ⚙️ (settings) + 🗑 + ▲▼
  - Settings: SC%, VAT%, ส่วนลด (amount หรือ %)
  - Body (เมื่อกาง): รายการทั้งหมดในร้านนี้ + ใครกิน + ราคา
  - Footer ใน card: ยอดรวมก่อน SC/VAT
- Footer ของ tab: ยอดรวมทั้งหมดหลัง SC/VAT

**การเชื่อมรายการกับร้าน:**
- ตอนเพิ่มรายการใน Tab 1 มี dropdown "ร้านไหน?" (ถ้ามีหลายร้าน)
- ถ้ามีร้านเดียว assign อัตโนมัติ (ไม่แสดง dropdown)
- ถ้ายังไม่มีร้าน สร้าง default receipt "บิล" ให้อัตโนมัติ (ผู้ใช้แก้ชื่อทีหลังได้)

---

### Tab 3 — 💰 สรุป

**ส่วนบน:**
- card ยอดรวมทั้งหมด (หลัง SC/VAT ทุกร้าน)

**ยอดของแต่ละคน:**
- card แต่ละคน: ชื่อ + รายการที่กิน + ยอดรวม + สถานะ (ค้างชำระ / จ่ายแล้ว)
- ผู้จ่ายแสดงสถานะ "✓ จ่ายแล้ว (ออกก่อน)"

**โอนเงินให้ใคร:**
- card แต่ละรายการโอน: "[คนA] → [คนB]" + จำนวน + ข้อมูลธนาคาร
- ปุ่ม "📋 คัดลอก" — copy เลขบัญชี/PromptPay
- ปุ่ม "✓ จ่ายแล้ว" — mark รายการนั้นว่าโอนแล้ว

**ล่างสุด:**
- ปุ่ม "📤 แชร์สรุปให้เพื่อน"

---

## Flow สแกนใบเสร็จ AI

1. **เลือก/ถ่ายรูป** — รองรับหลายรูปพร้อมกัน (JPG, PNG, PDF)
2. **AI วิเคราะห์** — progress bar + ข้อความสถานะ (ไม่เกิน ~10 วินาที)
3. **ตรวจสอบก่อนเพิ่ม** — review screen แสดงรายการที่ AI อ่านได้:
   - แก้ชื่อ/ราคาได้ inline
   - เลือกว่าใครกินแต่ละรายการได้เลยในหน้านี้
   - AI ตรวจจับ SC/VAT แล้วแสดง banner แจ้ง (จะตั้งใน Tab บิล/ร้าน อัตโนมัติ)
   - ปุ่ม "เพิ่มทั้งหมด ✓" และ "ยกเลิก"

---

## Data Model (เปลี่ยนจากเดิม)

### Member
```ts
interface Member {
  id: string
  name: string
  bank?: string          // ชื่อธนาคาร
  accountNumber?: string // เลขบัญชี หรือ เบอร์พร้อมเพย์
}
```

### Item
```ts
interface Item {
  id: string
  name: string
  price: number
  quantity: number
  assignedMemberIds: string[] // ใครกิน/ใช้
  receiptId: string
  // ลบ: paidBy, fixedDeductions, excludeServiceCharge, excludeVat (ย้ายไป receipt level)
}
```

### Receipt
```ts
interface Receipt {
  id: string
  name: string
  scRate: number         // Service Charge %
  vatRate: number        // VAT %
  discountType?: 'percent' | 'amount'
  discountValue?: number
}
```

### BillSession
```ts
interface BillSession {
  id: string
  name: string
  payerId: string        // สมาชิกที่เป็นผู้จ่าย (แทน isPayer ใน Member)
  roundingMethod: 'payer' | 'split'  // การปัดเศษ — default: 'payer'
  members: Member[]
  items: Item[]
  receipts: Receipt[]
}
```

---

## สิ่งที่ตัดออกจากระบบเดิม

- `isPayer` field ใน Member → ย้ายเป็น `payerId` ใน BillSession
- `paidBy` per item → ผู้จ่ายระดับ bill เดียว
- `fixedDeductions` → ตัดออก (ซับซ้อนเกินไป)
- `excludeServiceCharge` / `excludeVat` per item → ย้ายไป receipt level
- `manualServiceChargeAmount` / `manualVatAmount` / `finalBillTotal` ใน BillConfig → ใช้ SC/VAT % แทน

---

## Components ที่ต้องสร้าง/แก้ไข

| Component | สถานะ | หมายเหตุ |
|-----------|--------|----------|
| `WizardView` | ใหม่ | 2 steps: members → payer |
| `MainTabView` | ใหม่ | wrapper 3 tabs |
| `ItemsTab` | แก้ไข | จาก ItemSection.tsx |
| `BillsTab` | แก้ไข | จาก ItemSection.tsx (receipt part) |
| `SummaryTab` | แก้ไข | จาก SummarySection.tsx |
| `ScanReviewSheet` | ใหม่ | review AI scan results |
| `AddItemForm` | ใหม่ | inline/bottom sheet form |
| `calculations.ts` | แก้ไข | ลบ paidBy per item logic |

---

## Success Criteria

- User ใหม่ที่ไม่เคยใช้ เปิดแอปแล้วสร้างบิลแรกได้ภายใน 2 นาที
- ไม่มี "warning รายการไม่มีคนกิน" ค้างอยู่เมื่อกด Tab สรุป
- สแกนใบเสร็จ 1 รูป → ได้รายการพร้อมใช้งานภายใน 15 วินาที
