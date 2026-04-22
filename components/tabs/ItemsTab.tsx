import React, { useState } from 'react'
import { Trash2, AlertTriangle, Camera, PenLine, Pencil, Check, X } from 'lucide-react'
import { Item, Member, Receipt, MemberQuantity } from '../../types'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQtys, setEditQtys] = useState<MemberQuantity[]>([])

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isUnassigned = (item: Item) => {
    if (item.memberQuantities && item.memberQuantities.length > 0)
      return item.memberQuantities.every(mq => mq.quantity === 0)
    return item.assignedMemberIds.length === 0
  }
  const unassigned = items.filter(isUnassigned)

  const getReceiptName = (receiptId: string) =>
    receipts.find(r => r.id === receiptId)?.name ?? 'ไม่ระบุร้าน'

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    if (item.memberQuantities && item.memberQuantities.length > 0) {
      // เติม member ที่ขาดให้ครบ
      const existing = new Map(item.memberQuantities.map(mq => [mq.memberId, mq.quantity]))
      setEditQtys(members.map(m => ({ memberId: m.id, quantity: existing.get(m.id) ?? 0 })))
    } else {
      // แปลง assignedMemberIds เป็น quantity (นับจำนวนซ้ำ)
      const counts = new Map<string, number>()
      item.assignedMemberIds.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1))
      const equalQty = item.assignedMemberIds.length > 0 ? 1 : 0
      setEditQtys(members.map(m => ({ memberId: m.id, quantity: counts.has(m.id) ? equalQty : 0 })))
    }
  }

  const adjustQty = (memberId: string, delta: number) => {
    setEditQtys(prev => prev.map(mq =>
      mq.memberId === memberId ? { ...mq, quantity: Math.max(0, mq.quantity + delta) } : mq
    ))
  }

  const confirmEdit = (item: Item) => {
    const active = editQtys.filter(mq => mq.quantity > 0)
    const totalAssigned = active.reduce((s, mq) => s + mq.quantity, 0)
    const isUnequal = active.length > 0 && totalAssigned !== item.quantity * active.length / active.length
    // ถ้าทุกคนมี qty=1 หรือเท่ากันหมด → ใช้ assignedMemberIds แบบเดิม (backward compat)
    const allSame = active.every(mq => mq.quantity === active[0].quantity)
    if (allSame && active.length > 0) {
      onUpdateItem(item.id, {
        assignedMemberIds: active.map(mq => mq.memberId),
        memberQuantities: undefined,
      })
    } else {
      onUpdateItem(item.id, {
        assignedMemberIds: active.map(mq => mq.memberId),
        memberQuantities: active,
      })
    }
    setEditingId(null)
  }

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
              const hasNoAssignee = isUnassigned(item)
              const isEditing = editingId === item.id
              const editTotal = editQtys.reduce((s, mq) => s + mq.quantity, 0)
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
                      {isEditing ? (
                        <>
                          <button onClick={() => confirmEdit(item)} className="text-green-500 hover:text-green-600 transition-colors"><Check size={15} /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-indigo-500 transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => onRemoveItem(item.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditing ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500 dark:text-slate-400">แบ่งจำนวนต่อคน</p>
                        <span className={`text-xs font-semibold ${editTotal === item.quantity ? 'text-green-500' : 'text-amber-500'}`}>
                          รวม {editTotal}/{item.quantity}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {editQtys.map(mq => {
                          const member = members.find(m => m.id === mq.memberId)
                          if (!member) return null
                          const share = mq.quantity > 0 ? item.price * mq.quantity : 0
                          return (
                            <div key={mq.memberId} className="flex items-center gap-2">
                              <span className={`text-xs font-semibold w-14 truncate ${mq.quantity > 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-slate-500'}`}>
                                {member.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => adjustQty(mq.memberId, -1)}
                                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-bold text-base flex items-center justify-center active:scale-90 transition-all"
                                >−</button>
                                <span className={`w-6 text-center text-sm font-bold ${mq.quantity > 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-300 dark:text-slate-600'}`}>
                                  {mq.quantity}
                                </span>
                                <button
                                  onClick={() => adjustQty(mq.memberId, 1)}
                                  className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-bold text-base flex items-center justify-center active:scale-90 transition-all"
                                >+</button>
                              </div>
                              {mq.quantity > 0 && (
                                <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">
                                  {formatCurrency(share)}฿
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : hasNoAssignee ? (
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1 w-full text-left"
                    >
                      ⚠️ ยังไม่ได้เลือกว่าใครกิน — แตะเพื่อแก้ไข
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(item.memberQuantities && item.memberQuantities.some(mq => mq.quantity > 0)
                        ? item.memberQuantities.filter(mq => mq.quantity > 0).map(mq => {
                            const m = members.find(m => m.id === mq.memberId)
                            return m ? (
                              <span key={mq.memberId} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                {m.name} ×{mq.quantity}
                              </span>
                            ) : null
                          })
                        : Array.from(new Set(item.assignedMemberIds)).map(id => {
                            const m = members.find(m => m.id === id)
                            return m ? (
                              <span key={id} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                {m.name}
                              </span>
                            ) : null
                          })
                      )}
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
