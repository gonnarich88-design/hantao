import React, { useState } from 'react'
import { Trash2, AlertTriangle, Camera, PenLine, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Item, Member, Receipt, MemberQuantity } from '../../types'
import { formatCurrency } from '../../utils/calculations'
import { AddItemForm } from './AddItemForm'
import { ScanReviewSheet, ScannedItem } from './ScanReviewSheet'

type AddMode = null | 'manual' | 'scan'

interface EditState {
  selected: Set<string>       // ใครเลือก (หารเท่ากัน)
  showCustom: boolean         // เปิด stepper หรือเปล่า
  qtys: Map<string, number>   // จำนวนต่อคน (custom mode)
}

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
  const [edit, setEdit] = useState<EditState>({ selected: new Set(), showCustom: false, qtys: new Map() })

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const isUnassigned = (item: Item) => {
    if (item.memberQuantities && item.memberQuantities.length > 0)
      return item.memberQuantities.every(mq => mq.quantity === 0)
    return item.assignedMemberIds.length === 0
  }
  const unassigned = items.filter(isUnassigned)

  const getReceiptName = (receiptId: string) =>
    receipts.find(r => r.id === receiptId)?.name ?? 'ไม่ระบุร้าน'

  // เปิด edit mode
  const startEdit = (item: Item) => {
    setEditingId(item.id)
    if (item.memberQuantities && item.memberQuantities.some(mq => mq.quantity > 0)) {
      const selected = new Set(item.memberQuantities.filter(mq => mq.quantity > 0).map(mq => mq.memberId))
      const qtys = new Map(item.memberQuantities.map(mq => [mq.memberId, mq.quantity]))
      setEdit({ selected, showCustom: true, qtys })
    } else {
      setEdit({ selected: new Set(item.assignedMemberIds), showCustom: false, qtys: new Map() })
    }
  }

  // toggle สมาชิก (equal mode)
  const toggleMember = (memberId: string) => {
    setEdit(prev => {
      const selected = new Set(prev.selected)
      selected.has(memberId) ? selected.delete(memberId) : selected.add(memberId)
      // sync qtys ถ้า custom เปิดอยู่
      const qtys = new Map(prev.qtys)
      if (!selected.has(memberId)) qtys.set(memberId, 0)
      else if ((qtys.get(memberId) ?? 0) === 0) qtys.set(memberId, 1)
      return { ...prev, selected, qtys }
    })
  }

  const selectAll = () => {
    setEdit(prev => {
      const selected = new Set(members.map(m => m.id))
      const qtys = new Map(prev.qtys)
      members.forEach(m => { if ((qtys.get(m.id) ?? 0) === 0) qtys.set(m.id, 1) })
      return { ...prev, selected, qtys }
    })
  }

  // เปิด/ปิด custom stepper
  const toggleCustom = (item: Item) => {
    setEdit(prev => {
      if (prev.showCustom) return { ...prev, showCustom: false }
      // เปิด: กระจาย qty เท่ากันในกลุ่มที่เลือก
      const selectedArr = Array.from(prev.selected)
      const qtys = new Map(prev.qtys)
      if (selectedArr.length > 0) {
        const base = Math.floor(item.quantity / selectedArr.length)
        const rem = item.quantity % selectedArr.length
        selectedArr.forEach((id, i) => qtys.set(id, base + (i < rem ? 1 : 0)))
      }
      return { ...prev, showCustom: true, qtys }
    })
  }

  // ปรับ qty ต่อคน
  const adjustQty = (memberId: string, delta: number) => {
    setEdit(prev => {
      const qtys = new Map(prev.qtys)
      const next = Math.max(0, (qtys.get(memberId) ?? 0) + delta)
      qtys.set(memberId, next)
      // sync selected
      const selected = new Set(prev.selected)
      next > 0 ? selected.add(memberId) : selected.delete(memberId)
      return { ...prev, qtys, selected }
    })
  }

  // บันทึก
  const confirmEdit = (item: Item) => {
    const { selected, showCustom, qtys } = edit
    if (showCustom) {
      const active: MemberQuantity[] = Array.from(selected)
        .map(id => ({ memberId: id, quantity: qtys.get(id) ?? 0 }))
        .filter(mq => mq.quantity > 0)
      const allSame = active.length > 0 && active.every(mq => mq.quantity === active[0].quantity)
      onUpdateItem(item.id, {
        assignedMemberIds: active.map(mq => mq.memberId),
        memberQuantities: allSame ? undefined : active,
      })
    } else {
      onUpdateItem(item.id, {
        assignedMemberIds: Array.from(selected),
        memberQuantities: undefined,
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

      {addMode === 'manual' && (
        <AddItemForm members={members} receipts={receipts} onAdd={onAddItem} onClose={() => setAddMode(null)} />
      )}
      {addMode === 'scan' && (
        <ScanReviewSheet
          members={members} receipts={receipts} defaultReceiptId={receipts[0]?.id ?? ''}
          onConfirm={(items, receiptId) => { onAddScannedItems(items, receiptId); setAddMode(null) }}
          onCancel={() => setAddMode(null)} onScanFiles={onScanFiles} isScanning={isScanning}
        />
      )}

      {/* Warning banner */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">มี {unassigned.length} รายการที่ยังไม่ได้เลือกว่าใครกิน</p>
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
              const customTotal = Array.from(edit.qtys.values()).reduce((s, q) => s + q, 0)

              return (
                <div
                  key={item.id}
                  className={`border rounded-xl p-3 transition-all ${
                    isEditing
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : hasNoAssignee
                      ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700'
                      : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Row: name + price + actions */}
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
                          <button onClick={() => confirmEdit(item)} className="text-green-500 active:scale-90 transition-all"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 active:scale-90 transition-all"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-indigo-500 transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => onRemoveItem(item.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="mt-1">
                      {/* Member toggles */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          onClick={selectAll}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 ${
                            edit.selected.size === members.length
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400'
                          }`}
                        >
                          ทุกคน
                        </button>
                        {members.map(m => (
                          <button
                            key={m.id}
                            onClick={() => toggleMember(m.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all active:scale-95 ${
                              edit.selected.has(m.id)
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500'
                            }`}
                          >
                            {edit.selected.has(m.id) ? '✓ ' : ''}{m.name}
                          </button>
                        ))}
                      </div>

                      {/* Toggle custom split */}
                      {item.quantity > 1 && edit.selected.size > 0 && (
                        <button
                          onClick={() => toggleCustom(item)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-2 active:opacity-70 transition-opacity"
                        >
                          {edit.showCustom ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          แบ่งจำนวนต่างกัน
                        </button>
                      )}

                      {/* Custom steppers */}
                      {edit.showCustom && (
                        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-gray-400 dark:text-slate-500">จำนวนต่อคน</p>
                            <span className={`text-xs font-bold ${customTotal === item.quantity ? 'text-green-500' : 'text-amber-500'}`}>
                              รวม {customTotal}/{item.quantity} {customTotal === item.quantity ? '✓' : ''}
                            </span>
                          </div>
                          {members.map(m => {
                            const qty = edit.qtys.get(m.id) ?? 0
                            const isActive = qty > 0
                            return (
                              <div key={m.id} className="flex items-center gap-2">
                                <span className={`text-xs font-semibold flex-1 truncate ${isActive ? 'text-gray-800 dark:text-white' : 'text-gray-300 dark:text-slate-600'}`}>
                                  {m.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => adjustQty(m.id, -1)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-bold flex items-center justify-center active:scale-90 transition-all text-base"
                                  >−</button>
                                  <span className={`w-5 text-center text-sm font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-300 dark:text-slate-600'}`}>
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => adjustQty(m.id, 1)}
                                    className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center active:scale-90 transition-all text-base"
                                  >+</button>
                                </div>
                                <span className={`text-xs w-16 text-right tabular-nums ${isActive ? 'text-gray-500 dark:text-slate-400' : 'text-gray-200 dark:text-slate-700'}`}>
                                  {isActive ? `${formatCurrency(item.price * qty)}฿` : '—'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : hasNoAssignee ? (
                    <button
                      onClick={() => startEdit(item)}
                      className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-lg px-2 py-1.5 w-full text-left active:opacity-70 transition-opacity"
                    >
                      ⚠️ ยังไม่ได้เลือกว่าใครกิน — แตะเพื่อแก้ไข
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {item.memberQuantities && item.memberQuantities.some(mq => mq.quantity > 0)
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
                      }
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
