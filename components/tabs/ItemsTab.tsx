import React, { useState } from 'react'
import { Trash2, AlertTriangle, Camera, PenLine, Pencil, Check, X, Users } from 'lucide-react'
import { Item, Member, Receipt } from '../../types'
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
  const [editSelected, setEditSelected] = useState<Set<string>>(new Set())

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const unassigned = items.filter(item => item.assignedMemberIds.length === 0)

  const getReceiptName = (receiptId: string) =>
    receipts.find(r => r.id === receiptId)?.name ?? 'ไม่ระบุร้าน'

  const startEdit = (item: Item) => {
    setEditingId(item.id)
    setEditSelected(new Set(item.assignedMemberIds))
  }

  const confirmEdit = (id: string) => {
    onUpdateItem(id, { assignedMemberIds: Array.from(editSelected) })
    setEditingId(null)
  }

  const toggleEditMember = (memberId: string) => {
    setEditSelected(prev => {
      const next = new Set(prev)
      next.has(memberId) ? next.delete(memberId) : next.add(memberId)
      return next
    })
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
              const hasNoAssignee = item.assignedMemberIds.length === 0
              const isEditing = editingId === item.id
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
                          <button onClick={() => confirmEdit(item.id)} className="text-green-500 hover:text-green-600 transition-colors"><Check size={15} /></button>
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
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-gray-500 dark:text-slate-400">ใครกิน/ใช้?</p>
                        <button onClick={() => setEditSelected(new Set(members.map(m => m.id)))} className="text-xs text-indigo-500 flex items-center gap-1"><Users size={10} /> ทุกคน</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <button
                            key={m.id}
                            onClick={() => toggleEditMember(m.id)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                              editSelected.has(m.id)
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                                : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400'
                            }`}
                          >
                            {editSelected.has(m.id) ? '✓ ' : ''}{m.name}
                          </button>
                        ))}
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
                      {Array.from(new Set(item.assignedMemberIds)).map(id => {
                        const m = members.find(m => m.id === id)
                        return m ? (
                          <span key={id} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">
                            {m.name}
                          </span>
                        ) : null
                      })}
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
