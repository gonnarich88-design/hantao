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
