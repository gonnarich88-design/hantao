import React, { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { Member, Item, Receipt } from '../../types'
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
