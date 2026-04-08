import React, { useState } from 'react'
import { Item, Member, Receipt } from '../types'
import { ItemsTab } from './tabs/ItemsTab'
import { BillsTab } from './tabs/BillsTab'
import { SummaryTab } from './tabs/SummaryTab'
import { ScannedItem } from './tabs/ScanReviewSheet'

type TabId = 'items' | 'bills' | 'summary'

interface MainTabViewProps {
  members: Member[]
  items: Item[]
  receipts: Receipt[]
  payerId: string
  roundingMethod: 'payer' | 'split'
  billName: string
  onChangePayerId: (id: string) => void
  onAddItem: (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => void
  onAddScannedItems: (items: ScannedItem[], receiptId: string) => void
  onRemoveItem: (id: string) => void
  onUpdateItem: (id: string, updates: Partial<Item>) => void
  onAddReceipt: (name: string) => void
  onUpdateReceipt: (id: string, updates: Partial<Receipt>) => void
  onRemoveReceipt: (id: string) => void
  onScanFiles: (files: File[]) => Promise<ScannedItem[]>
  onSave: () => void
  isScanning: boolean
}

export const MainTabView: React.FC<MainTabViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabId>('items')
  const [showPayerPicker, setShowPayerPicker] = useState(false)

  const payer = props.members.find(m => m.id === props.payerId)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'items', label: '🧾 รายการ' },
    { id: 'bills', label: '🏪 บิล/ร้าน' },
    { id: 'summary', label: '💰 สรุป' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 dark:bg-indigo-900 px-4 py-3 flex items-center justify-between shadow-md">
        <span className="font-bold text-white text-base">HanTao 🍜</span>
        <div className="relative">
          <button
            onClick={() => setShowPayerPicker(!showPayerPicker)}
            className="bg-white/20 text-white text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-white/30 transition-colors"
          >
            💳 {payer?.name ?? '—'} จ่าย
          </button>
          {showPayerPicker && (
            <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 min-w-40 overflow-hidden">
              {props.members.map(m => (
                <button
                  key={m.id}
                  onClick={() => { props.onChangePayerId(m.id); setShowPayerPicker(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors ${m.id === props.payerId ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'dark:text-white'}`}
                >
                  {m.id === props.payerId ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                : 'text-gray-400 dark:text-slate-500 border-transparent hover:text-gray-600 dark:hover:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'items' && (
          <ItemsTab
            items={props.items}
            members={props.members}
            receipts={props.receipts}
            onAddItem={props.onAddItem}
            onAddScannedItems={props.onAddScannedItems}
            onRemoveItem={props.onRemoveItem}
            onUpdateItem={props.onUpdateItem}
            onScanFiles={props.onScanFiles}
            isScanning={props.isScanning}
          />
        )}
        {activeTab === 'bills' && (
          <BillsTab
            receipts={props.receipts}
            items={props.items}
            onAddReceipt={props.onAddReceipt}
            onUpdateReceipt={props.onUpdateReceipt}
            onRemoveReceipt={props.onRemoveReceipt}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryTab
            members={props.members}
            items={props.items}
            receipts={props.receipts}
            payerId={props.payerId}
            roundingMethod={props.roundingMethod}
            billName={props.billName}
            onSave={props.onSave}
          />
        )}
      </div>
    </div>
  )
}
