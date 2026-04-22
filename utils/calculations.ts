import { Member, Item, Receipt, MemberSummary, Transfer, MemberQuantity } from '../types'

/**
 * คืน assignedMemberIds จาก memberQuantities (แต่ละคนซ้ำตามจำนวน)
 * หรือคืน assignedMemberIds เดิมถ้าไม่มี memberQuantities
 */
export function getEffectiveAssignees(item: Item): string[] {
  if (item.memberQuantities && item.memberQuantities.length > 0) {
    const result: string[] = []
    item.memberQuantities.forEach(({ memberId, quantity }) => {
      for (let i = 0; i < quantity; i++) result.push(memberId)
    })
    return result
  }
  return item.assignedMemberIds
}

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
    const scaleFactor = receiptScaleFactors.get(item.receiptId) ?? 1

    if (item.memberQuantities && item.memberQuantities.length > 0) {
      // แบ่งตาม quantity ต่อคน
      const totalQty = item.memberQuantities.reduce((s, mq) => s + mq.quantity, 0)
      if (totalQty <= 0) return
      const pricePerUnit = item.price * scaleFactor
      item.memberQuantities.forEach(({ memberId, quantity }) => {
        if (quantity <= 0) return
        const stats = summaryMap.get(memberId)
        if (!stats) return
        const share = pricePerUnit * quantity
        stats.totalConsumption += share
        stats.items.push({ name: item.name, share })
      })
    } else {
      // หารเท่ากันแบบเดิม
      if (item.assignedMemberIds.length === 0) return
      const itemTotal = item.price * item.quantity * scaleFactor
      const sharePerMember = itemTotal / item.assignedMemberIds.length
      item.assignedMemberIds.forEach((memberId) => {
        const stats = summaryMap.get(memberId)
        if (!stats) return
        stats.totalConsumption += sharePerMember
        stats.items.push({ name: item.name, share: sharePerMember })
      })
    }
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
