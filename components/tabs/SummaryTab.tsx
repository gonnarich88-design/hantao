import React, { useState } from 'react'
import { Check, Copy, Share2, ChevronDown, ChevronUp } from 'lucide-react'
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

// สีอวาตาร์ auto จากชื่อ
const AVATAR_COLORS = [
  ['bg-rose-400', 'text-rose-50'],
  ['bg-pink-400', 'text-pink-50'],
  ['bg-violet-400', 'text-violet-50'],
  ['bg-indigo-400', 'text-indigo-50'],
  ['bg-blue-400', 'text-blue-50'],
  ['bg-cyan-400', 'text-cyan-50'],
  ['bg-teal-400', 'text-teal-50'],
  ['bg-emerald-400', 'text-emerald-50'],
  ['bg-amber-400', 'text-amber-50'],
  ['bg-orange-400', 'text-orange-50'],
]

function getAvatarColors(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const [bg, fg] = getAvatarColors(name)
  const sizeClass = size === 'lg' ? 'w-12 h-12 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sizeClass} ${bg} ${fg} rounded-full flex items-center justify-center font-extrabold flex-shrink-0 shadow-sm`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  members, items, receipts, payerId, roundingMethod, billName, onSave
}) => {
  const { summaries, transfers } = calculateSummary(members, items, receipts, payerId, roundingMethod)
  const grandTotal = summaries.reduce((sum, s) => sum + s.totalConsumption, 0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [paidTransfers, setPaidTransfers] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const payer = members.find(m => m.id === payerId)

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const markPaid = (key: string) =>
    setPaidTransfers(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const copyAccount = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = () => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const handleShare = () => {
    const lines = [
      `📋 ${billName}`,
      `ยอดรวม: ${formatCurrency(grandTotal)}฿`,
      '',
      ...summaries.map(s => `${s.memberName}: ${formatCurrency(s.totalConsumption)}฿`),
      '',
      transfers.length > 0 ? 'โอนเงิน:' : '',
      ...transfers.map(t => {
        const toMember = members.find(m => m.id === t.toId)
        const acct = toMember?.promptPayId ? ` (${toMember.bank ? toMember.bank + ' ' : ''}${toMember.promptPayId})` : ''
        return `• ${t.fromName} → ${t.toName}${acct}: ${formatCurrency(t.amount)}฿`
      }),
    ].filter(Boolean)
    const text = lines.join('\n')
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard.writeText(text).catch(() => {})
  }

  const unassignedCount = items.filter(i => i.assignedMemberIds.length === 0 && (!i.memberQuantities || i.memberQuantities.every(mq => mq.quantity === 0))).length

  return (
    <div className="p-4 pb-8">
      {unassignedCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ มี {unassignedCount} รายการที่ยังไม่มีคนกิน — ไปแก้ใน Tab รายการก่อน
        </div>
      )}

      {/* Grand total */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 mb-5 shadow-lg shadow-indigo-200/40 dark:shadow-indigo-900/40">
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">ยอดรวมทั้งหมด</p>
        <p className="text-white text-4xl font-black tracking-tight">{formatCurrency(grandTotal)}<span className="text-2xl ml-1 font-bold text-indigo-200">฿</span></p>
        {payer && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/20">
            <Avatar name={payer.name} size="sm" />
            <p className="text-indigo-100 text-sm"><span className="font-semibold">{payer.name}</span> ออกเงินไปก่อน</p>
          </div>
        )}
      </div>

      {/* Per-person cards */}
      <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">ยอดของแต่ละคน</p>
      <div className="space-y-2 mb-6">
        {summaries.map(s => {
          const isPayer = s.memberId === payerId
          const isOpen = expanded.has(s.memberId)
          const pct = grandTotal > 0 ? (s.totalConsumption / grandTotal) * 100 : 0

          return (
            <div
              key={s.memberId}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isPayer
                  ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'border-gray-100 dark:border-slate-700/80 bg-white dark:bg-slate-900'
              }`}
            >
              {/* Card header — tappable */}
              <button
                onClick={() => s.items.length > 0 && toggleExpand(s.memberId)}
                className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
              >
                <Avatar name={s.memberName} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-800 dark:text-white">{s.memberName}</p>
                    {isPayer && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">จ่ายก่อน</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden w-full">
                    <div
                      className={`h-full rounded-full transition-all ${isPayer ? 'bg-indigo-400' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                  <div>
                    <p className={`font-extrabold text-base tabular-nums ${isPayer ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-white'}`}>
                      {formatCurrency(s.totalConsumption)}฿
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 text-right">{pct.toFixed(0)}%</p>
                  </div>
                  {s.items.length > 0 && (
                    <span className="text-gray-300 dark:text-slate-600">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded item list */}
              {isOpen && s.items.length > 0 && (
                <div className="border-t border-gray-100 dark:border-slate-700/60 px-4 py-3 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="space-y-1.5">
                    {s.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-baseline">
                        <p className="text-xs text-gray-600 dark:text-slate-400 truncate flex-1 mr-3">{item.name}</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 tabular-nums flex-shrink-0">{formatCurrency(item.share)}฿</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/60">
                    <p className="text-xs text-gray-400 dark:text-slate-500">{s.items.length} รายการ (รวม SC/VAT)</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-white tabular-nums">{formatCurrency(s.totalConsumption)}฿</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">โอนเงิน</p>
          <div className="space-y-3 mb-6">
            {transfers.map(t => {
              const key = `${t.fromId}-${t.toId}`
              const isPaid = paidTransfers.has(key)
              const toMember = members.find(m => m.id === t.toId)
              const fromMember = members.find(m => m.id === t.fromId)
              const accountInfo = toMember?.promptPayId
                ? `${toMember.bank ? toMember.bank + ' · ' : ''}${toMember.promptPayId}`
                : null

              return (
                <div key={key} className={`rounded-2xl border overflow-hidden transition-all ${
                  isPaid ? 'border-green-200 dark:border-green-800 opacity-50' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}>
                  <div className="p-4">
                    {/* From → To */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar name={t.fromName} size="sm" />
                        <p className="font-semibold text-sm text-gray-800 dark:text-white">{t.fromName}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-gray-300 dark:text-slate-600 text-lg">→</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <p className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">{t.toName}</p>
                        <Avatar name={t.toName} size="sm" />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-center mb-3">
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{formatCurrency(t.amount)}<span className="text-lg">฿</span></p>
                      {accountInfo && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">💳 {accountInfo}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {accountInfo && (
                        <button
                          onClick={() => copyAccount(toMember!.promptPayId!, key + '-copy')}
                          className="flex-1 bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          {copied === key + '-copy' ? <><Check size={13} /> คัดลอกแล้ว</> : <><Copy size={13} /> คัดลอกเลข</>}
                        </button>
                      )}
                      <button
                        onClick={() => markPaid(key)}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                          isPaid
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                        }`}
                      >
                        <Check size={13} /> {isPaid ? 'โอนแล้ว ✓' : 'จ่ายแล้ว'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {transfers.length === 0 && items.length > 0 && unassignedCount === 0 && (
        <div className="text-center py-8 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 mb-5">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-green-700 dark:text-green-300">ทุกคนจ่ายครบแล้ว!</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 border-2 border-indigo-400 text-indigo-500 dark:text-indigo-400 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Share2 size={16} /> แชร์สรุป
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm ${
            saved ? 'bg-green-500 text-white shadow-green-200 dark:shadow-green-900' : 'bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-900'
          }`}
        >
          {saved ? <><Check size={16} /> บันทึกแล้ว</> : '💾 บันทึกบิล'}
        </button>
      </div>
    </div>
  )
}
