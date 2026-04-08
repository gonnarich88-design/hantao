import React, { useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Member, Receipt } from '../../types'

interface AddItemFormProps {
  members: Member[]
  receipts: Receipt[]
  onAdd: (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => void
  onClose: () => void
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ members, receipts, onAdd, onClose }) => {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [receiptId, setReceiptId] = useState(receipts[0]?.id ?? '')
  const [errors, setErrors] = useState<{ name?: string; price?: string; members?: string }>({})

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(members.map(m => m.id)))

  const validate = () => {
    const e: typeof errors = {}
    if (!name.trim()) e.name = 'กรุณากรอกชื่อรายการ'
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) e.price = 'กรุณากรอกราคา'
    if (selected.size === 0) e.members = 'กรุณาเลือกอย่างน้อย 1 คน'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onAdd(name.trim(), parseFloat(price), parseInt(quantity) || 1, Array.from(selected), receiptId)
    onClose()
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      <div className="flex gap-2 mb-2">
        <div className="flex-[2]">
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ชื่อรายการ *"
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })) }}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div className="flex-1">
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="ราคา *"
            type="number"
            min="0"
            value={price}
            onChange={e => { setPrice(e.target.value); setErrors(p => ({ ...p, price: undefined })) }}
          />
          {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">จำนวน</label>
          <input
            className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
        </div>
        {receipts.length > 1 && (
          <div className="flex-[2]">
            <label className="text-xs text-gray-500 dark:text-slate-400 mb-1 block">ร้าน</label>
            <select
              className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
              value={receiptId}
              onChange={e => setReceiptId(e.target.value)}
            >
              {receipts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Member selector */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-500 dark:text-slate-400">ใครกิน/ใช้? *</p>
          <button onClick={selectAll} className="text-xs text-indigo-500 font-semibold flex items-center gap-1">
            <Users size={12} /> ทุกคน
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map(m => (
            <button
              key={m.id}
              onClick={() => { toggle(m.id); setErrors(p => ({ ...p, members: undefined })) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                selected.has(m.id)
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400'
              }`}
            >
              {selected.has(m.id) ? '✓ ' : ''}{m.name}
            </button>
          ))}
        </div>
        {errors.members && <p className="text-xs text-red-500 mt-1">{errors.members}</p>}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-indigo-600 active:scale-95 transition-all"
        >
          <Plus size={16} /> เพิ่ม
        </button>
        <button
          onClick={onClose}
          className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  )
}
