import React, { useState, useRef } from 'react'
import { Camera, Users, Check, X, Loader2 } from 'lucide-react'
import { Member, Receipt } from '../../types'

export interface ScannedItem {
  id: string
  name: string
  price: number
  quantity: number
  assignedMemberIds: string[]
}

interface ScanReviewSheetProps {
  members: Member[]
  receipts: Receipt[]
  defaultReceiptId: string
  onConfirm: (items: ScannedItem[], receiptId: string) => void
  onCancel: () => void
  onScanFiles: (files: File[]) => Promise<ScannedItem[]>
  isScanning: boolean
}

export const ScanReviewSheet: React.FC<ScanReviewSheetProps> = ({
  members, receipts, defaultReceiptId,
  onConfirm, onCancel, onScanFiles, isScanning
}) => {
  const [phase, setPhase] = useState<'upload' | 'scanning' | 'review'>('upload')
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [receiptId, setReceiptId] = useState(defaultReceiptId)
  const [previews, setPreviews] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = (selected: File[]) => {
    if (selected.length === 0) return
    setFiles(selected)
    setPreviews(selected.map(f => URL.createObjectURL(f)))
  }

  const handleScan = async () => {
    if (files.length === 0) return
    setPhase('scanning')
    const items = await onScanFiles(files)
    setScannedItems(items)
    setPhase('review')
  }

  const toggleMember = (itemId: string, memberId: string) => {
    setScannedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const has = item.assignedMemberIds.includes(memberId)
      return {
        ...item,
        assignedMemberIds: has
          ? item.assignedMemberIds.filter(id => id !== memberId)
          : [...item.assignedMemberIds, memberId]
      }
    }))
  }

  const selectAllForItem = (itemId: string) => {
    setScannedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, assignedMemberIds: members.map(m => m.id) } : item
    ))
  }

  const updateItem = (id: string, field: 'name' | 'price', value: string) => {
    setScannedItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value }
        : item
    ))
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4">
      {phase === 'upload' && (
        <>
          <h3 className="font-semibold text-sm mb-3 dark:text-white">📷 สแกนใบเสร็จ</h3>
          <label
            htmlFor="scan-file-input"
            className="border-2 border-dashed border-indigo-200 dark:border-indigo-700 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors mb-3 flex flex-col items-center"
          >
            <Camera size={32} className="text-indigo-400 mb-2" />
            <p className="text-sm font-semibold text-indigo-500">ถ่ายรูป / เลือกรูป</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG — เลือกหลายรูปได้</p>
          </label>
          <input
            ref={fileRef}
            id="scan-file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(Array.from(e.target.files ?? []))}
          />
          {previews.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {previews.map((src, i) => (
                <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-indigo-300" />
              ))}
            </div>
          )}
          {receipts.length > 1 && (
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">เพิ่มเข้าร้าน</label>
              <select
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white"
                value={receiptId}
                onChange={e => setReceiptId(e.target.value)}
              >
                {receipts.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleScan}
              disabled={files.length === 0}
              className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40"
            >
              ✨ วิเคราะห์ด้วย AI
            </button>
            <button onClick={onCancel} className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 rounded-lg text-sm">
              ยกเลิก
            </button>
          </div>
        </>
      )}

      {phase === 'scanning' && (
        <div className="text-center py-10">
          <Loader2 size={40} className="mx-auto text-indigo-400 animate-spin mb-3" />
          <p className="font-semibold dark:text-white">AI กำลังอ่านใบเสร็จ...</p>
          <p className="text-xs text-gray-400 mt-1">ไม่เกิน 15 วินาที</p>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm dark:text-white">✨ AI พบ {scannedItems.length} รายการ</p>
            <p className="text-xs text-gray-400">แก้ไขได้ก่อนเพิ่ม</p>
          </div>
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {scannedItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border-b border-gray-200 dark:border-slate-600 text-sm font-semibold dark:text-white bg-transparent focus:outline-none"
                    value={item.name}
                    onChange={e => updateItem(item.id, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="w-16 text-right border-b border-gray-200 dark:border-slate-600 text-sm font-bold text-indigo-600 bg-transparent focus:outline-none"
                      type="number"
                      value={item.price}
                      onChange={e => updateItem(item.id, 'price', e.target.value)}
                    />
                    <span className="text-xs text-gray-400">฿</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-400">ใครกิน?</p>
                  <button onClick={() => selectAllForItem(item.id)} className="text-xs text-indigo-500 flex items-center gap-1">
                    <Users size={10} /> ทุกคน
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => {
                    const active = item.assignedMemberIds.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMember(item.id, m.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border-2 transition-all ${
                          active
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-400'
                        }`}
                      >
                        {active ? '✓ ' : ''}{m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(scannedItems, receiptId)}
              className="flex-1 bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all"
            >
              <Check size={16} /> เพิ่มทั้งหมด
            </button>
            <button onClick={onCancel} className="px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 rounded-lg text-sm">
              <X size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
