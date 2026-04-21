# HanTao — CLAUDE.md

แอปหารบิล (bill splitting) สำหรับใช้งานจริงกับเพื่อน

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (CDN)
- **Auth/DB:** Supabase (`https://afhfgzbjmfwuxejqefos.supabase.co`)
- **AI Scan:** Gemini API (`gemini-2.5-flash`) — อ่านรูปใบเสร็จแยก items
- **Deploy:** EasyPanel via Docker multi-stage + nginx

## Commands

```bash
npm run dev        # dev server (port 3001)
npm run build      # production build → dist/
npm test           # vitest run (unit tests)
npm run test:watch # vitest watch mode
```

## Architecture

```
App.tsx                     # root state + routing (5 views)
types.ts                    # data model (Member, Item, Receipt, SavedBill)
utils/calculations.ts       # core calculation logic (scale factor approach)
utils/calculations.test.ts  # vitest unit tests

components/
  WizardView.tsx            # wizard setup: step 1 (สมาชิก) → step 2 (ผู้จ่าย)
  MainTabView.tsx           # 3-tab container + header + payer picker
  tabs/
    ItemsTab.tsx            # Tab รายการ — เพิ่ม manual / สแกน
    BillsTab.tsx            # Tab บิล/ร้าน — SC/VAT/ส่วนลด per receipt
    SummaryTab.tsx          # Tab สรุป — ยอดต่อคน + transfers + แชร์
    AddItemForm.tsx         # form เพิ่มรายการ manual
    ScanReviewSheet.tsx     # review AI scan result ก่อนเพิ่ม
  LandingPage.tsx
  HistoryView.tsx
  AuthView.tsx
  HelpModal.tsx
  ProfileModal.tsx

lib/
  supabase.ts               # Supabase client
  billHistory.ts            # cloud sync บิล
  profile.ts                # user profile
  savedGroups.ts            # บันทึกกลุ่มเพื่อน

context/
  AuthContext.tsx           # auth state
```

## App Flow

```
landing → wizard (2 steps) → calculator (3 tabs) → summary/history
```

- **View 'landing'**: LandingPage — auth, history link
- **View 'wizard'**: WizardView — ตั้งค่าสมาชิก + ผู้จ่าย
- **View 'calculator'**: MainTabView — ใส่รายการ / ตั้ง SC/VAT / ดูสรุป
- **View 'history'**: HistoryView — ประวัติบิล
- **View 'auth'**: AuthView — login/register

## Data Model (types.ts)

```ts
Member    { id, name, bank?, promptPayId? }
Item      { id, name, price, quantity, assignedMemberIds[], receiptId }
Receipt   { id, name, scRate, vatRate, discountType?, discountValue? }
SavedBill { id, timestamp, name, payerId, roundingMethod, members, items, receipts, total }
```

**ไม่มี** `isPayer`, `paidBy`, `BillConfig`, `fixedDeductions` — ถูกลบออกในการ redesign

## Calculation Logic

`utils/calculations.ts` ใช้ **scale factor approach**:
1. คำนวณ `subtotal` ต่อ receipt (sum price × qty)
2. คำนวณ `scaleFactor = (subtotal_after_discount + SC + VAT) / subtotal`
3. `itemTotal = price × qty × scaleFactor`
4. หาร `itemTotal` เท่ากันใน `assignedMemberIds`
5. `payerId` จ่าย `grandTotal` ทั้งหมด — คนอื่น transfer คืน

## Deploy (EasyPanel)

**GEMINI_API_KEY** ใช้ runtime pattern (ไม่ใช่ build-time):
- `docker-entrypoint.sh` ใช้ `envsubst` inject key เข้า `window.__APP_CONFIG__`
- App.tsx อ่านจาก `(window as any).__APP_CONFIG__?.GEMINI_API_KEY`
- เปลี่ยน key ใน EasyPanel → **Restart เพียงพอ** ไม่ต้อง Redeploy

**Supabase keys** ส่งผ่าน Docker build args (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Testing

Unit tests อยู่ใน `utils/calculations.test.ts` (7 tests) — ครอบคลุม:
- หารเท่ากัน / หารเฉพาะบางคน
- SC + VAT คำนวณถูกต้อง
- ส่วนลด percent
- Transfer calculation
- Item ที่ไม่มี assignee

## Conventions

- ภาษาไทยใน UI ทั้งหมด
- Tailwind classes ตรง ๆ ไม่ใช้ CSS modules
- Component ใหม่ใน `components/tabs/` ถ้าเป็น tab content
- ไม่มี `BillConfig` — SC/VAT อยู่ที่ Receipt level
- `formatCurrency(amount)` → `"1,234.50"` (en-US, ไม่มีสัญลักษณ์ ฿)
