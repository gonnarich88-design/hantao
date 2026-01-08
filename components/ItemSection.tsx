
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, ShoppingBag, Trash2, Users, AlertTriangle, Check, Edit2, Save, X, Loader2, Wallet, Images, Store, PenLine, ChevronDown, ChevronUp, Delete, PlusCircle, Tag, User, Percent, Receipt as ReceiptIcon, Settings2, Info, ChevronRight, Sparkles, Sliders, Camera, Hash, Image as ImageIcon, Coins } from 'lucide-react';
import { Item, Member, Receipt, BillConfig } from '../types';
import { formatCurrency } from '../utils/calculations';

interface ItemSectionProps {
  items: Item[];
  members: Member[];
  receipts: Receipt[];
  config: BillConfig; 
  onAddItem: (name: string, price: number, quantity: number, paidBy: string, receiptId: string, description?: string, assignedMemberIds?: string[]) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, name: string, price: number, paidBy: string, description?: string, excludeServiceCharge?: boolean, excludeVat?: boolean) => void;
  onUpdateReceiptName: (id: string, name: string) => void;
  onUpdateReceiptSettings?: (id: string, excludeSC: boolean, excludeVat: boolean) => void;
  onUpdateReceiptRates?: (id: string, scRate: number, vatRate: number) => void;
  onUpdateReceiptDiscount?: (id: string, type: 'percent' | 'amount', value: number) => void;
  onUpdateReceiptTotal?: (id: string, total: number | null) => void;
  onRemoveReceipt: (id: string) => void;
  onAddReceipt?: (name: string) => string;
  onToggleAssignment: (itemId: string, memberId: string, operation: 'add' | 'remove') => void;
  onAssignAll: (itemId: string) => void;
  onScanReceipt?: (files: File[]) => void;
  isScanning?: boolean;
  compact?: boolean;
  onUpdateItemAdjustments?: (itemId: string, memberId: string, amount: number) => void;
}

const RECEIPT_THEMES = [
  { id: 'indigo', border: 'border-indigo-100', bg: 'bg-indigo-50/20', text: 'text-indigo-600', iconBg: 'bg-indigo-500', pill: 'bg-indigo-100 text-indigo-700', itemPrice: 'text-indigo-600' },
  { id: 'teal', border: 'border-teal-100', bg: 'bg-teal-50/20', text: 'text-teal-600', iconBg: 'bg-teal-500', pill: 'bg-teal-100 text-teal-700', itemPrice: 'text-teal-600' },
  { id: 'violet', border: 'border-violet-100', bg: 'bg-violet-50/20', text: 'text-violet-600', iconBg: 'bg-violet-500', pill: 'bg-violet-100 text-violet-700', itemPrice: 'text-violet-600' },
];

export const ItemSection: React.FC<ItemSectionProps> = ({
  items,
  members,
  receipts,
  config,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateReceiptName,
  onUpdateReceiptSettings,
  onUpdateReceiptRates,
  onUpdateReceiptDiscount,
  onUpdateReceiptTotal,
  onRemoveReceipt,
  onAddReceipt,
  onToggleAssignment,
  onAssignAll,
  onScanReceipt,
  isScanning = false,
  compact = false,
  onUpdateItemAdjustments
}) => {
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPayer, setItemPayer] = useState('');
  const [targetReceiptId, setTargetReceiptId] = useState(''); 
  
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false);
  const [isPayerDropdownOpen, setIsPayerDropdownOpen] = useState(false);
  const [activeSettingsReceiptId, setActiveSettingsReceiptId] = useState<string | null>(null);
  const [collapsedReceipts, setCollapsedReceipts] = useState<Set<string>>(new Set());
  const [allocationItemId, setAllocationItemId] = useState<string | null>(null);
  
  // State for Add Receipt Modal
  const [isAddingReceipt, setIsAddingReceipt] = useState(false);
  const [newReceiptName, setNewReceiptName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (members.length > 0 && !itemPayer) setItemPayer(members.find(m => m.isPayer)?.id || members[0].id);
  }, [members]);

  useEffect(() => {
    if (receipts.length > 0) {
        // If target receipt no longer exists (e.g. deleted), switch to first available
        if (!targetReceiptId || !receipts.find(r => r.id === targetReceiptId)) {
            setTargetReceiptId(receipts[0].id);
        }
    } else {
        setTargetReceiptId('');
    }
  }, [receipts, targetReceiptId]);

  const handleAddItem = () => {
    const price = parseFloat(itemPrice);
    const qty = parseInt(itemQuantity) || 1;
    if (itemName.trim() && !isNaN(price) && price > 0 && itemPayer && targetReceiptId) {
      // Pass price as Unit Price. Calculations will handle the rest.
      onAddItem(itemName, price, qty, itemPayer, targetReceiptId, itemDesc.trim());
      setItemName(''); setItemPrice(''); setItemQuantity('1'); setItemDesc('');
    }
  };

  const handleDeleteReceipt = (id: string) => {
      if (window.confirm('คุณต้องการลบบิลนี้และรายการอาหารทั้งหมดในบิลใช่หรือไม่?')) {
          onRemoveReceipt(id);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onScanReceipt) {
        onScanReceipt(Array.from(e.target.files));
    }
  };

  const calculateReceiptDisplayTotal = (receipt: Receipt, receiptItems: Item[]) => {
      // Sum of (Unit Price * Quantity)
      let subtotal = receiptItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      let sc = subtotal * ((receipt.scRate || 0) / 100);
      // CHANGED: Use || 0 to respect the 0 default, don't fallback to 7 in display
      let vat = (subtotal + sc) * ((receipt.vatRate || 0) / 100);
      let total = subtotal + sc + vat;
      
      if (receipt.discountValue) {
          if (receipt.discountType === 'percent') total -= (subtotal * (receipt.discountValue / 100));
          else total -= receipt.discountValue;
      }
      return receipt.manualTotal != null ? receipt.manualTotal : total;
  };

  const handleToggleAssignmentOverride = (itemId: string, memberId: string, operation: 'add' | 'remove') => {
      onToggleAssignment(itemId, memberId, operation);
  }

  const handleAssignAllOverride = (itemId: string) => {
    onAssignAll(itemId);
  }

  // --- ADD RECEIPT MODAL LOGIC ---
  const openAddReceiptModal = () => {
    setIsReceiptDropdownOpen(false);
    setNewReceiptName('');
    setIsAddingReceipt(true);
  };

  const confirmAddReceipt = () => {
    if (newReceiptName.trim() && onAddReceipt) {
        const newId = onAddReceipt(newReceiptName.trim());
        setTargetReceiptId(newId);
        setIsAddingReceipt(false);
    }
  };

  const renderAddReceiptModal = () => {
    if (!isAddingReceipt) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsAddingReceipt(false)}></div>
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-xs sm:max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up space-y-6 border border-white/10">
                <div className="text-center">
                    <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4 shadow-sm">
                        <Store size={28} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">เพิ่มร้านค้าใหม่</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ตั้งชื่อร้านค้าเพื่อแยกรายการอาหาร</p>
                </div>
                
                <input 
                    autoFocus
                    type="text" 
                    value={newReceiptName}
                    onChange={(e) => setNewReceiptName(e.target.value)}
                    placeholder="ชื่อร้าน (เช่น MK, 7-11)..."
                    className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold text-lg text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white border border-gray-100 dark:border-slate-700"
                    onKeyDown={(e) => e.key === 'Enter' && confirmAddReceipt()}
                />

                <div className="flex gap-3">
                    <button onClick={() => setIsAddingReceipt(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
                    <button onClick={confirmAddReceipt} disabled={!newReceiptName.trim()} className="flex-[2] h-12 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95">เพิ่มเลย</button>
                </div>
            </div>
        </div>,
        document.body
    );
  };

  const renderAllocationSheet = () => {
    const allocationItem = items.find(i => i.id === allocationItemId);
    if (!allocationItemId || !allocationItem) return null;
    
    const currentTotalAllocated = allocationItem.assignedMemberIds.length;
    const isSharedMode = currentTotalAllocated > allocationItem.quantity;
    const hasFixedDeductions = (allocationItem.fixedDeductions?.length || 0) > 0;
    
    // Toggle state for row input method (managed locally for UI)
    // We'll infer mode: if fixedDeduction exists for member, show input. Else show counter.

    return createPortal(
      <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setAllocationItemId(null)}></div>
        <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-[2.5rem] px-6 pt-4 pb-safe max-w-lg mx-auto w-full shadow-2xl animate-slide-up border-t border-gray-100 dark:border-slate-800">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">{allocationItem.name}</h3>
                    <p className={`text-xs font-bold mt-1 flex items-center gap-1.5 ${isSharedMode || hasFixedDeductions ? 'text-indigo-500' : 'text-teal-600'}`}>
                        {isSharedMode || hasFixedDeductions ? (
                           <><Users size={14} /> หารตามสัดส่วน (Shares)</>
                        ) : (
                           <><ShoppingBag size={14} /> เลือกแล้ว {currentTotalAllocated} / {allocationItem.quantity} ชิ้น</>
                        )}
                    </p>
                </div>
                <button onClick={() => setAllocationItemId(null)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-slate-400"><X size={20}/></button>
            </div>

            <div className="space-y-3 mb-8 max-h-[50vh] overflow-y-auto no-scrollbar py-2">
                {members.map(member => {
                    const count = allocationItem.assignedMemberIds.filter(id => id === member.id).length;
                    const fixedAmount = allocationItem.fixedDeductions?.find(d => d.memberId === member.id)?.amount;
                    const isFixedMode = fixedAmount !== undefined;

                    return (
                        <div key={member.id} className="flex items-center justify-between p-3 pl-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-700 dark:text-slate-200">{member.name}</span>
                                <button 
                                    onClick={() => {
                                        if (isFixedMode) {
                                            // Switch to Share Mode: Clear fixed amount
                                            onUpdateItemAdjustments?.(allocationItem.id, member.id, 0);
                                        } else {
                                            // Switch to Fixed Mode: Init with 0 if not set, user will type
                                            // We'll rely on the input to set the value. 
                                            // Initial click just toggles UI state effectively by seeing if value > 0?
                                            // Actually, we need a way to enter "Fixed Mode" with 0 value.
                                            // Let's toggle: If currently no fixed deduction, add one with 0 (or null logic, but our type is number).
                                            // To handle "0" value input, let's treat 0 as "no deduction" in calculation but "active" in UI?
                                            // Simpler: Just focus input.
                                            // Let's make the button toggle:
                                            // Toggle ON: set amount to 0 (and remove any shares?). No, mixed mode is hard.
                                            // Let's strictly separate: If you set fixed amount, you don't get shares.
                                            // So if switching to Fixed, remove shares.
                                            const currentShares = allocationItem.assignedMemberIds.filter(id => id === member.id).length;
                                            for(let i=0; i<currentShares; i++) handleToggleAssignmentOverride(allocationItem.id, member.id, 'remove');
                                            onUpdateItemAdjustments?.(allocationItem.id, member.id, 1); // Start with 1 baht so it registers? or allow 0 input.
                                        }
                                    }}
                                    className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5 hover:text-indigo-500"
                                >
                                    {isFixedMode ? <><Users size={10} /> เปลี่ยนเป็นหารส่วน</> : <><Coins size={10} /> ระบุยอดเงินเอง</>}
                                </button>
                            </div>

                            {isFixedMode ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-24 h-10 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900 text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={fixedAmount || ''}
                                            placeholder="0"
                                            onChange={(e) => onUpdateItemAdjustments?.(allocationItem.id, member.id, parseFloat(e.target.value) || 0)}
                                            autoFocus
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">฿</span>
                                    </div>
                                    <button onClick={() => onUpdateItemAdjustments?.(allocationItem.id, member.id, 0)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500"><X size={18} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => handleToggleAssignmentOverride(allocationItem.id, member.id, 'remove')} 
                                        disabled={count === 0}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${count > 0 ? 'bg-white text-rose-500 shadow-sm border border-rose-100 active:scale-90' : 'text-gray-300 cursor-not-allowed'}`}
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <div className="flex flex-col items-center w-8">
                                        <span className={`font-black text-xl leading-none ${count > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-300'}`}>{count}</span>
                                        {(isSharedMode || hasFixedDeductions) && count > 0 && <span className="text-[9px] font-bold text-slate-400">ส่วน</span>}
                                    </div>
                                    <button 
                                        onClick={() => handleToggleAssignmentOverride(allocationItem.id, member.id, 'add')} 
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-teal-600 text-white shadow-lg active:scale-90`}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4">
                <button onClick={() => handleAssignAllOverride(allocationItem.id)} className="h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center gap-2">หารเท่ากันทุกคน</button>
                <button onClick={() => setAllocationItemId(null)} className="h-16 rounded-2xl bg-teal-600 text-white font-black text-lg shadow-xl shadow-teal-200 dark:shadow-none flex items-center justify-center gap-2">เรียบร้อย</button>
            </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderSettingsSheet = () => {
    if (!activeSettingsReceiptId) return null;
    const receipt = receipts.find(r => r.id === activeSettingsReceiptId);
    if (!receipt) return null;

    const handleVatToggle = () => onUpdateReceiptSettings?.(receipt.id, !!receipt.excludeServiceCharge, !receipt.excludeVat);
    const handleSCToggle = () => onUpdateReceiptSettings?.(receipt.id, !receipt.excludeServiceCharge, !!receipt.excludeVat);

    return createPortal(
      <div className="fixed inset-0 z-[10000] flex flex-col justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setActiveSettingsReceiptId(null)}></div>
        
        {/* Modal Content */}
        <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-[2rem] shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
             {/* Header */}
             <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center z-20">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">ตั้งค่าบิล</h3>
                    <p className="text-sm text-slate-400">{receipt.name}</p>
                </div>
                <button onClick={() => setActiveSettingsReceiptId(null)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
             </div>

             <div className="p-6 space-y-8 pb-12">
                {/* 0. Name Edit (New) */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">ชื่อร้าน / ชื่อบิล</h4>
                    <input 
                        type="text" 
                        value={receipt.name} 
                        onChange={(e) => onUpdateReceiptName(receipt.id, e.target.value)}
                        className="w-full h-14 px-4 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-white"
                        placeholder="ตั้งชื่อบิล..."
                    />
                </div>

                {/* 1. VAT & SC Toggles - UPDATED TO BE FULLY CLICKABLE AND DYNAMIC TEXT */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">ภาษีและค่าบริการ</h4>
                    
                    <div 
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={handleVatToggle}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!receipt.excludeVat ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                                <Percent size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">
                                    {/* CHANGED: Do not fallback to 7 in display if rate is 0 */}
                                    {receipt.excludeVat ? 'VAT 0% (ปิด)' : `VAT ${receipt.vatRate || 0}%`}
                                </div>
                                <div className="text-xs text-slate-400">ภาษีมูลค่าเพิ่ม</div>
                            </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full relative transition-colors border-2 ${!receipt.excludeVat ? 'bg-emerald-500 border-emerald-500' : 'bg-gray-200 dark:bg-slate-700 border-transparent'}`}>
                            <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${!receipt.excludeVat ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    <div 
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={handleSCToggle}
                    >
                         <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!receipt.excludeServiceCharge ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-700 dark:text-slate-200">
                                    {/* CHANGED: Do not fallback to 10 in display if rate is 0 */}
                                    {receipt.excludeServiceCharge ? 'Service 0% (ปิด)' : `Service ${receipt.scRate || 0}%`}
                                </div>
                                <div className="text-xs text-slate-400">ค่าบริการ</div>
                            </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full relative transition-colors border-2 ${!receipt.excludeServiceCharge ? 'bg-indigo-500 border-indigo-500' : 'bg-gray-200 dark:bg-slate-700 border-transparent'}`}>
                            <div className={`absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full transition-transform shadow-sm ${!receipt.excludeServiceCharge ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Discount */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">ส่วนลด (Discount)</h4>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onUpdateReceiptDiscount?.(receipt.id, 'percent', receipt.discountValue || 0)}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${receipt.discountType === 'percent' ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-gray-100 text-gray-400'}`}
                        >
                            เปอร์เซ็นต์ (%)
                        </button>
                        <button 
                            onClick={() => onUpdateReceiptDiscount?.(receipt.id, 'amount', receipt.discountValue || 0)}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 ${receipt.discountType === 'amount' ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-gray-100 text-gray-400'}`}
                        >
                            บาท (฿)
                        </button>
                    </div>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={receipt.discountValue || ''} 
                            onChange={(e) => onUpdateReceiptDiscount?.(receipt.id, receipt.discountType || 'percent', parseFloat(e.target.value))}
                            placeholder="0"
                            className="w-full h-14 pl-4 pr-12 bg-gray-50 dark:bg-slate-800 rounded-2xl font-bold text-xl outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                        />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                            {receipt.discountType === 'percent' ? '%' : '฿'}
                         </div>
                    </div>
                </div>

                {/* 3. Manual Total (Rounding) */}
                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">ปรับยอดสุทธิตามจริง (Rounding)</h4>
                    <p className="text-xs text-slate-500">หากยอดคำนวณไม่ตรงกับบิลจริง ให้ใส่ยอดที่ต้องจ่ายจริงที่นี่ ระบบจะเฉลี่ยส่วนต่างให้ทุกคน</p>
                    <div className="relative">
                        <input 
                            type="number"
                            value={receipt.manualTotal ?? ''}
                            onChange={(e) => onUpdateReceiptTotal?.(receipt.id, e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="ปล่อยว่างหากไม่ต้องปรับ"
                            className="w-full h-14 pl-4 pr-12 bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 rounded-2xl font-bold text-xl outline-none focus:border-amber-500 transition-all text-amber-700 dark:text-amber-400 placeholder:text-amber-300"
                        />
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-amber-400">฿</div>
                    </div>
                 </div>

             </div>
             
             <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe">
                <button onClick={() => setActiveSettingsReceiptId(null)} className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg shadow-xl">
                    เสร็จสิ้น
                </button>
             </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={compact ? "w-full max-w-md mx-auto" : "bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors"}>
      {!compact && (
        <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-xl font-black flex items-center text-slate-800 dark:text-slate-200">
                <span className="bg-indigo-600 p-2.5 rounded-2xl mr-4 shadow-lg shadow-indigo-200 dark:shadow-none"><ShoppingBag className="text-white" size={20} /></span>
                2. จัดการรายการอาหาร
            </h2>
        </div>
      )}

      {/* Main Form Area */}
      <div className={`p-6 mb-8 rounded-[2.5rem] border shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all ${compact ? 'bg-white dark:bg-slate-800 border-indigo-50/50 dark:border-slate-700 ring-[8px] ring-indigo-50/30 dark:ring-indigo-900/10' : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'}`}>
        <div className="space-y-4">
            
            {/* Store and Scan - UPDATED LAYOUT FIX */}
            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    <button onClick={() => setIsReceiptDropdownOpen(!isReceiptDropdownOpen)} className="w-full h-14 pl-4 pr-3 flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm border border-gray-100 dark:border-slate-700 transition-all active:scale-[0.98] shadow-sm group">
                        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                            <Store size={18} className="text-indigo-500 flex-shrink-0" /> 
                            <span className="truncate">{receipts.find(r => r.id === targetReceiptId)?.name || 'เลือกบิล / ร้านค้า'}</span>
                        </div>
                        <ChevronDown size={18} className="text-slate-300 flex-shrink-0 ml-1 group-hover:text-slate-500" />
                    </button>
                    {isReceiptDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-0 animate-scale-up">
                            <div className="max-h-52 overflow-y-auto no-scrollbar py-2">
                                {receipts.map(r => (
                                    <button key={r.id} onClick={() => { setTargetReceiptId(r.id); setIsReceiptDropdownOpen(false); }} className={`w-full px-6 py-4 text-left text-sm font-bold ${targetReceiptId === r.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 dark:text-slate-300'}`}>{r.name}</button>
                                ))}
                            </div>
                            {/* ADD NEW RECEIPT BUTTON REPLACED WITH MODAL TRIGGER */}
                            <button 
                                onClick={openAddReceiptModal}
                                className="w-full px-6 py-3 text-left text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-900/30 flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            >
                                <PlusCircle size={18} /> เพิ่มร้านค้าใหม่
                            </button>
                        </div>
                    )}
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isScanning}
                  className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 shadow-sm active:scale-95 transition-all relative group"
                >
                    {isScanning ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                    {!isScanning && <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>}
                </button>
            </div>

            {/* Item Name */}
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="ชื่อรายการ..." className="w-full h-14 px-6 bg-white dark:bg-slate-900 rounded-2xl font-bold border border-gray-100 dark:border-slate-700 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-gray-300" />
            
            {/* Price and Qty RESIZED TO NORMAL */}
            <div className="flex gap-3">
                <div className="relative flex-[2.5]">
                    <input type="number" inputMode="decimal" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} placeholder="ราคาต่อชิ้น" className="w-full h-14 px-4 pl-8 bg-white dark:bg-slate-900 rounded-2xl font-bold text-xl text-slate-700 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-gray-300" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm">฿</span>
                </div>
                <div className="relative flex-1">
                    <label className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 bg-white dark:bg-slate-800 text-[10px] font-black text-indigo-500 uppercase tracking-widest pointer-events-none z-10">Qty</label>
                    <input type="number" inputMode="numeric" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} placeholder="1" className="w-full h-14 bg-white dark:bg-slate-900 rounded-2xl font-bold text-xl text-center text-slate-800 dark:text-white border border-gray-100 dark:border-slate-700 focus:border-indigo-500 outline-none transition-all shadow-sm" />
                </div>
            </div>

            {/* Payer and Note */}
            <div className="flex gap-2">
                <button onClick={() => setIsPayerDropdownOpen(!isPayerDropdownOpen)} className="flex-1 h-14 px-4 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 text-xs font-bold text-slate-500 truncate shadow-sm">
                    <Wallet size={16} className="text-gray-300 flex-shrink-0" /> 
                    <span className="truncate">{members.find(m => m.id === itemPayer)?.name || 'เลือกคนจ่าย'}</span>
                </button>
                <input type="text" value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} placeholder="โน้ต..." className="flex-1 h-14 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 text-xs font-medium outline-none shadow-sm placeholder:text-gray-300" />
            </div>

            {/* Add Button */}
            <button onClick={handleAddItem} disabled={!itemName.trim() || !itemPrice || members.length === 0 || !targetReceiptId} className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3"><Plus size={24} strokeWidth={3} /> เพิ่มเข้ารายการ</button>
        </div>
      </div>

      {/* Item List per Receipt - 3 ROWS HEADER */}
      <div className="space-y-12">
        {receipts.map((receipt, index) => {
          const receiptItems = items.filter(i => i.receiptId === receipt.id);
          if (compact && receiptItems.length === 0) return null;
          const theme = RECEIPT_THEMES[index % RECEIPT_THEMES.length];
          const isCollapsed = collapsedReceipts.has(receipt.id);
          const totalAmount = calculateReceiptDisplayTotal(receipt, receiptItems);

          return (
            <div key={receipt.id} className={`rounded-[2.5rem] overflow-hidden border-2 shadow-xl transition-all ${theme.border} bg-white dark:bg-slate-900`}>
                {/* RECEIPT HEADER */}
                <div className={`p-6 flex flex-col gap-5 border-b ${theme.bg} ${theme.border}`}>
                    
                    {/* Row 1: Identity & Actions */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl text-white shadow-md shadow-${theme.id}-200/50 ${theme.iconBg}`}>
                                <Store size={22} strokeWidth={2.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className={`text-lg font-black text-slate-800 dark:text-white leading-tight break-words`}>{receipt.name}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Receipt #{index + 1}</p>
                            </div>
                        </div>
                        
                        {/* UNIFORM ACTION BUTTONS */}
                        <div className="flex-shrink-0 flex items-center gap-1 bg-white dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
                             <button type="button" onClick={() => setActiveSettingsReceiptId(receipt.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer">
                                <Sliders size={18} />
                             </button>
                             <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-0.5"></div>
                             <button type="button" onClick={() => handleDeleteReceipt(receipt.id)} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all cursor-pointer">
                                <Trash2 size={18} />
                             </button>
                             <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-0.5"></div>
                             <button type="button" onClick={() => setCollapsedReceipts(prev => { const next = new Set(prev); if(next.has(receipt.id)) next.delete(receipt.id); else next.add(receipt.id); return next; })} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer ${isCollapsed ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                             </button>
                        </div>
                    </div>

                    {/* Row 2: Main Info */}
                    <div className="flex justify-between items-end px-1">
                        <div className="pb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">จำนวนรายการ</p>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-2xl text-slate-800 dark:text-slate-200">{receiptItems.length}</span>
                                <span className="text-xs font-bold text-slate-400">รายการ</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ยอดรวมสุทธิ</p>
                            <p className={`text-3xl font-black ${theme.itemPrice} leading-none tracking-tight`}>{formatCurrency(totalAmount)}</p>
                        </div>
                    </div>

                    {/* Row 3: Metadata Tags */}
                    <div className="flex flex-wrap gap-2 px-1">
                        {receipt.scRate !== 0 && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">SC {receipt.scRate}%</div>
                        )}
                        {receipt.vatRate !== 0 && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">VAT {receipt.vatRate}%</div>
                        )}
                        {receipt.discountValue !== 0 && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-[10px] font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">ลด {receipt.discountType === 'percent' ? `${receipt.discountValue}%` : formatCurrency(receipt.discountValue || 0)}</div>
                        )}
                        {receipt.manualTotal != null && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">ปรับยอดปัดเศษ</div>
                        )}
                    </div>
                </div>

                {/* ITEM CARDS */}
                {!isCollapsed && (
                    <div className="p-4 space-y-4">
                        {receiptItems.length === 0 ? (
                            <div className="text-center py-10 opacity-20"><ShoppingBag size={50} className="mx-auto mb-2" /><p className="text-xs font-bold uppercase tracking-widest">ยังไม่มีรายการ</p></div>
                        ) : receiptItems.map((item) => {
                            const currentAssigned = item.assignedMemberIds.length;
                            const hasFixed = (item.fixedDeductions?.length || 0) > 0;
                            const isSharedMode = currentAssigned > item.quantity || hasFixed;
                            const isMissingUnits = !isSharedMode && currentAssigned < item.quantity;
                            const isFullyAssigned = currentAssigned === item.quantity && !hasFixed;

                            // Calculate Line Total for Display
                            const lineTotal = item.price * item.quantity;

                            return (
                                <div key={item.id} className={`rounded-[1.75rem] p-5 border transition-all ${isMissingUnits ? 'border-amber-100 bg-amber-50/20' : isSharedMode ? 'border-indigo-100 bg-indigo-50/20' : 'bg-white dark:bg-slate-800/50 border-slate-50 dark:border-slate-800 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">
                                                    {item.name}
                                                </h4>
                                                {item.quantity > 1 && (
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-black rounded-md">x{item.quantity}</span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-1.5 text-slate-400 font-bold text-[11px]">
                                                {isMissingUnits && (
                                                    <><AlertTriangle size={12} className="text-amber-500" /> ยังแบ่งไม่ครบ ({currentAssigned}/{item.quantity})</>
                                                )}
                                                {isFullyAssigned && (
                                                    <span className="text-emerald-500 flex items-center gap-1"><Check size={12}/> ครบจำนวน ({item.quantity})</span>
                                                )}
                                                {isSharedMode && (
                                                    <span className="text-indigo-500 flex items-center gap-1"><Users size={12}/> {hasFixed ? 'มีคนจ่ายแบบระบุยอด + หารส่วน' : `หารเฉลี่ย (${currentAssigned} ส่วน)`}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {/* DISPLAY LINE TOTAL TO MATCH RECEIPT */}
                                            <p className={`font-black text-xl text-indigo-600 dark:text-indigo-400 leading-none mb-1`}>{formatCurrency(lineTotal)}</p>
                                            {item.quantity > 1 && (
                                                <p className="text-[10px] text-slate-400 font-bold">({formatCurrency(item.price)}/ชิ้น)</p>
                                            )}
                                            <button onClick={() => confirm(`ลบ "${item.name}"?`) && onRemoveItem(item.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors mt-1"><Trash2 size={16}/></button>
                                        </div>
                                    </div>

                                    {/* QUICK SELECT ROW - UPDATED TO WRAP */}
                                    <div className="flex flex-wrap items-center gap-2 mt-3">
                                        {/* ALL Button - Now Assigns Everyone */}
                                        <button 
                                            onClick={() => handleAssignAllOverride(item.id)} 
                                            className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs shadow-md active:scale-95 transition-all"
                                        >
                                            All
                                        </button>

                                        {/* Member Pills - CLEANED UP (No Avatar Circle) */}
                                        {members.map(member => {
                                            const isAssigned = item.assignedMemberIds.includes(member.id);
                                            const fixedAmount = item.fixedDeductions?.find(d => d.memberId === member.id)?.amount;
                                            
                                            return (
                                                <button
                                                    key={member.id}
                                                    onClick={() => handleToggleAssignmentOverride(item.id, member.id, isAssigned ? 'remove' : 'add')}
                                                    className={`h-10 px-4 rounded-xl font-bold text-xs border flex items-center justify-center transition-all active:scale-90 ${
                                                        fixedAmount
                                                        ? 'bg-amber-100 border-amber-200 text-amber-700 shadow-sm'
                                                        : isAssigned 
                                                        ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-none' 
                                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-teal-300 hover:text-teal-500'
                                                    }`}
                                                >
                                                    {member.name} {fixedAmount ? `(฿${fixedAmount})` : ''}
                                                </button>
                                            );
                                        })}
                                        
                                        {/* Settings Button - Pushed to right of the last line */}
                                        <button 
                                            onClick={() => setAllocationItemId(item.id)}
                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:bg-indigo-50 hover:text-indigo-500 transition-all border border-transparent hover:border-indigo-200 ml-auto"
                                        >
                                            <Settings2 size={18} />
                                        </button>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          );
        })}
      </div>
      {renderAllocationSheet()}
      {renderSettingsSheet()}
      {renderAddReceiptModal()}
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        .animate-slide-up { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
