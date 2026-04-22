export interface Member {
  id: string
  name: string
  bank?: string        // ชื่อธนาคาร เช่น "กสิกรไทย", "PromptPay"
  promptPayId?: string // เลขบัญชี หรือ เบอร์พร้อมเพย์ (ชื่อ field คงไว้ backward compat)
}

export interface MemberQuantity {
  memberId: string
  quantity: number
}

export interface Item {
  id: string
  name: string
  price: number       // ราคาต่อหน่วย
  quantity: number    // จำนวนรวม
  assignedMemberIds: string[] // ใครกิน/ใช้ (หารเท่ากัน) — ใช้เมื่อไม่มี memberQuantities
  memberQuantities?: MemberQuantity[] // แบ่งจำนวนต่อคน (optional)
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
