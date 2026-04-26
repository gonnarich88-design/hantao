# HanTao — Project Status

> อัปเดต: 2026-04-26

---

## คืออะไร

**HanTao** คือแอป web สำหรับหารบิลร้านอาหาร (bill splitting) ใช้งานจริงกับเพื่อน รองรับ SC/VAT, สแกนใบเสร็จด้วย AI, และหารเงินได้ยืดหยุ่น (หารเท่า หรือ แต่ละคนได้ต่างจำนวน)

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS (CDN) + Supabase (auth/DB) + Gemini API (สแกนใบเสร็จ) + EasyPanel/Docker/nginx (deploy)

---

## App Flow

```
LandingPage → WizardView (2 steps) → MainTabView (3 tabs) → HistoryView
```

- **landing**: หน้าแรก — auth + ดูประวัติ
- **wizard step 1**: เพิ่มสมาชิก
- **wizard step 2**: เลือกคนจ่าย (payer)
- **calculator tab รายการ (ItemsTab)**: เพิ่ม item manual / สแกน AI — แก้ไข assign สมาชิกต่อ item
- **calculator tab บิล/ร้าน (BillsTab)**: ตั้ง SC / VAT / ส่วนลด ต่อ receipt
- **calculator tab สรุป (SummaryTab)**: ยอดรวม per person + transfer cards

---

## Data Model (`types.ts`)

```ts
Member         { id, name, bank?, promptPayId? }
MemberQuantity { memberId: string, quantity: number }
Item           { id, name, price, quantity, assignedMemberIds[], memberQuantities?: MemberQuantity[], receiptId }
Receipt        { id, name, scRate, vatRate, discountType?, discountValue? }
SavedBill      { id, timestamp, name, payerId, roundingMethod, members, items, receipts, total }
```

- `memberQuantities` = optional, ใช้เมื่อหารไม่เท่ากัน (เช่น เบียร์ 9 แก้ว คนหนึ่ง 5 อีกคน 4)
- ไม่มี `BillConfig`, `isPayer`, `fixedDeductions` (ถูกลบใน redesign)

---

## ทำอะไรเสร็จแล้ว (commit ล่าสุด = `33e9842`)

| Commit | Feature |
|--------|---------|
| `4699611` | Redesign สมบูรณ์ — Wizard 2-step + 3-tab UI + data model ใหม่ |
| `ebfb6d6` | Fix iOS Safari camera button (label+htmlFor แทน div.onClick) |
| `b4279ab` | Inline edit mode บน item card (✏️ → toggle member chips) |
| `6c8a1fc` | Per-member quantity split (MemberQuantity type + stepper UI) |
| `a7a71b6` | Redesign edit UX — toggle chips + "ทุกคน" + collapsible stepper |
| `eb61355` | Redesign SummaryTab — avatar, progress bar, expandable breakdown, transfer cards |
| `33e9842` | อัปเดต CLAUDE.md docs |

### Features ที่ใช้งานได้แล้ว
- [x] เพิ่ม/ลบสมาชิก
- [x] assign item ให้สมาชิกแบบหารเท่ากัน
- [x] assign item แบบหารต่างจำนวน (memberQuantities)
- [x] SC/VAT/ส่วนลด per receipt (scale factor approach)
- [x] สแกนใบเสร็จด้วย Gemini (`gemini-2.5-flash`) + review ก่อนเพิ่ม
- [x] SummaryTab — ยอดต่อคน + transfer cards + copy บัญชี + mark paid
- [x] Cloud sync บิลกับ Supabase
- [x] ประวัติบิล (HistoryView)
- [x] Dark mode
- [x] Auth (login/register ผ่าน Supabase)
- [x] Unit tests (7 tests ใน `utils/calculations.test.ts`)

---

## Bugs ที่ยังเปิดอยู่

### Critical
- **handleImportFromDevice อาจลบ local history**
  - `App.tsx`: `handleImportFromDevice` → `saveAllBillsToCloud` → `fetchBillHistory` → `setHistory(cloud)`
  - ถ้า Supabase error → `fetchBillHistory` คืน `[]` → `setHistory([])` → localStorage ถูก overwrite
  - แก้: merge cloud+local แทน replace, หรือ skip `setHistory` ถ้า fetch ล้มเหลว

### Low
- **saveAllBillsToCloud ไม่มี feedback ถ้า history ว่าง** — `if (bills.length === 0) return true` เงียบ

---

## Tests ที่ยังขาด

- `memberQuantities` calculation ยังไม่มี unit test (ระบุในหมายเหตุ CLAUDE.md)

---

## Infrastructure

- **Deploy:** EasyPanel — Docker multi-stage → nginx static
- **GEMINI_API_KEY:** runtime config ผ่าน `docker-entrypoint.sh` + `envsubst` → `window.__APP_CONFIG__`
  - เปลี่ยน key → Restart เพียงพอ ไม่ต้อง Redeploy
- **Supabase keys:** ส่งผ่าน Docker build args (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

---

## สิ่งที่ควรทำต่อ (Backlog ไม่เป็นทางการ)

- [ ] Fix bug: handleImportFromDevice data loss
- [ ] เพิ่ม unit tests สำหรับ memberQuantities
- [ ] รองรับหลาย receipt ใน ScanReviewSheet (ตอนนี้ assign ให้ default receipt เสมอ)
- [ ] Share link / export บิลเป็น PDF
- [ ] Saved groups — บันทึกกลุ่มเพื่อนซ้ำ (lib/savedGroups.ts มีอยู่แล้ว แต่ยังไม่มี UI ครบ)

---

## Commands

```bash
npm run dev        # dev server (port 3001)
npm run build      # production build → dist/
npm test           # vitest run
npm run test:watch # vitest watch mode
```
