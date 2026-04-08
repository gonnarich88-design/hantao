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
