
import React, { useState, useRef } from 'react';
import { ArrowLeft, Check, ChevronRight, UserPlus, ShoppingBag, Receipt, User, HelpCircle, FileText, Sparkles, Calculator, Sun, Moon, Camera, PenLine, ScanLine } from 'lucide-react';
import { Member, Item, Receipt as ReceiptType, BillConfig } from '../types';
import { MemberSection } from './MemberSection';
import { ItemSection } from './ItemSection';

interface ManualWizardProps {
  onFinish: () => void;
  onBack: () => void;
  billName: string;
  setBillName: (name: string) => void;
  members: Member[];
  onAddMember: (name: string, promptPay?: string) => void;
  onRemoveMember: (id: string) => void;
  items: Item[];
  receipts: ReceiptType[];
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
  onUpdatePayerPromptPay: (id: string) => void;
  onAddReceipt: (name: string) => string;
  onToggleAssignment: (itemId: string, memberId: string, operation: 'add' | 'remove') => void;
  onAssignAll: (itemId: string) => void;
  onScanReceipt?: (files: File[]) => void;
  isScanning?: boolean;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const ManualWizard: React.FC<ManualWizardProps> = ({
  onFinish,
  onBack,
  billName,
  setBillName,
  members,
  onAddMember,
  onRemoveMember,
  items,
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
  onUpdatePayerPromptPay,
  onAddReceipt,
  onToggleAssignment,
  onAssignAll,
  onScanReceipt,
  isScanning,
  isDarkMode,
  onToggleTheme
}) => {
  const [step, setStep] = useState(0); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adjusted steps:
  // 0: Intro
  // 1: Name
  // 2: Members
  // 3: Choose Method (Scan vs Manual) - NEW
  // 4: Item Section (Was 3)

  const handleNext = () => {
    // Validate Members before proceeding past step 2
    if (step === 2 && members.length === 0) {
        alert("กรุณาเพิ่มสมาชิกอย่างน้อย 1 คน");
        return;
    }
    
    if (step === 4) {
        onFinish();
    } else {
        setStep(prev => prev + 1);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onScanReceipt) {
        onScanReceipt(Array.from(e.target.files));
        setStep(4); // Jump straight to items (Step 4) after scan
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div key="step0" className="flex flex-col items-center text-center space-y-8 px-4 pt-10 animate-fade-in-up pb-32">
            <div className="relative">
                <div className="absolute inset-0 bg-teal-200 dark:bg-teal-900/30 blur-xl opacity-30 rounded-full"></div>
                <div className="relative w-24 h-24 bg-gradient-to-tr from-teal-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-3xl flex items-center justify-center text-teal-600 shadow-xl border border-teal-100 dark:border-slate-700 rotate-3 transition-colors">
                    <Sparkles size={48} className="text-teal-500" />
                </div>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">พร้อมหารหรือยัง?</h2>
                <p className="text-slate-500 dark:text-slate-400">เริ่มสร้างบิลใหม่กันเลย</p>
            </div>
            <div className="space-y-4 w-full max-w-sm mx-auto">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 text-left transition-all hover:scale-[1.02] cursor-pointer group" onClick={() => setStep(1)}>
                    <div className="bg-teal-100 dark:bg-teal-900/30 p-3 rounded-2xl text-teal-600 dark:text-teal-400"><PenLine size={24}/></div>
                    <div className="flex-1">
                        <div className="font-black text-slate-800 dark:text-white text-lg">เริ่มจดบิล</div>
                        <div className="text-xs text-slate-400 font-medium">ค่อยๆ ใส่ชื่อเพื่อนและรายการอาหาร</div>
                    </div>
                    <ChevronRight className="text-slate-200 dark:text-slate-700 group-hover:text-teal-500" size={20} />
                </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div key="step1" className="flex flex-col items-center space-y-6 px-4 pt-10 animate-fade-in-up pb-32">
             <div className="text-center">
                <div className="inline-flex p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500 mb-4 shadow-sm border border-orange-100 dark:border-orange-900/30"><FileText size={40} /></div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">ตั้งชื่อบิล</h2>
             </div>
             <div className="w-full max-w-sm mt-8">
                <input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="พิมพ์ชื่อบิล..." className="w-full text-center text-2xl font-bold text-slate-900 dark:text-white border-b-2 border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:outline-none py-4 bg-transparent transition-all placeholder:text-slate-300 dark:placeholder:slate-800" />
             </div>
          </div>
        );
      case 2:
        return (
          <div key="step2" className="flex flex-col h-full animate-fade-in-up">
             <div className="px-6 pt-2 pb-4 text-center">
                <div className="inline-flex p-3 bg-teal-50 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400 mb-3 border border-teal-100 dark:border-teal-900/30"><UserPlus size={28} /></div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">เพิ่มสมาชิก</h2>
             </div>
             <div className="flex-1 overflow-y-auto px-4 pb-32">
                <MemberSection members={members} onAddMember={onAddMember} onRemoveMember={onRemoveMember} compact={true} onUpdatePayerPromptPay={onUpdatePayerPromptPay} />
             </div>
          </div>
        );
      case 3:
        return (
          <div key="step3" className="flex flex-col items-center text-center space-y-8 px-4 pt-10 animate-fade-in-up pb-32">
            <div className="text-center">
                <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-500 mb-4 shadow-sm border border-indigo-100 dark:border-indigo-900/30"><ShoppingBag size={40} /></div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">เพิ่มรายการอาหาร</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">เลือกวิธีที่คุณสะดวก</p>
            </div>
            
            <div className="space-y-4 w-full max-w-sm mx-auto">
                {/* SCAN BUTTON */}
                <div className="bg-indigo-600 p-5 rounded-3xl shadow-xl flex items-center gap-4 text-left transition-all hover:scale-[1.02] cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                    <div className="bg-white/20 p-3 rounded-2xl text-white"><ScanLine size={24}/></div>
                    <div className="flex-1">
                        <div className="font-black text-white text-lg">สแกนบิลด้วย AI</div>
                        <div className="text-xs text-indigo-100 font-medium opacity-80">ถ่ายรูปบิลแล้วให้ AI จัดการให้</div>
                    </div>
                    <ChevronRight className="text-white/40 group-hover:text-white" size={20} />
                </div>

                {/* MANUAL BUTTON */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 text-left transition-all hover:scale-[1.02] cursor-pointer group" onClick={() => setStep(4)}>
                    <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-2xl text-gray-600 dark:text-slate-300"><PenLine size={24}/></div>
                    <div className="flex-1">
                        <div className="font-black text-slate-800 dark:text-white text-lg">จดรายการเอง</div>
                        <div className="text-xs text-slate-400 font-medium">พิมพ์รายการและราคาด้วยตัวเอง</div>
                    </div>
                    <ChevronRight className="text-slate-200 dark:text-slate-700 group-hover:text-indigo-500" size={20} />
                </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div key="step4" className="flex flex-col h-full animate-fade-in-up">
             <div className="px-6 pt-2 pb-4 text-center">
                <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 mb-3 border border-indigo-100 dark:border-indigo-900/30"><ShoppingBag size={28} /></div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">รายการอาหาร</h2>
             </div>
             {/* Added pb-32 to ensure content isn't hidden behind fixed footer */}
             <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
                <ItemSection items={items} members={members} receipts={receipts} config={config} onAddItem={onAddItem} onRemoveItem={onRemoveItem} onUpdateItem={onUpdateItem} onUpdateReceiptName={onUpdateReceiptName} onUpdateReceiptSettings={onUpdateReceiptSettings} onUpdateReceiptRates={onUpdateReceiptRates} onUpdateReceiptDiscount={onUpdateReceiptDiscount} onUpdateReceiptTotal={onUpdateReceiptTotal} onRemoveReceipt={onRemoveReceipt} onAddReceipt={onAddReceipt} onToggleAssignment={onToggleAssignment} onAssignAll={onAssignAll} onScanReceipt={onScanReceipt} isScanning={isScanning} compact={true} onUpdateItemAdjustments={() => {}} />
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col transition-colors relative">
      <div className="bg-white dark:bg-slate-900 px-4 py-3 flex justify-between items-center z-10 sticky top-0 border-b dark:border-slate-800 transition-colors">
         <button onClick={step === 0 ? onBack : () => setStep(prev => prev - 1)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors"><ArrowLeft size={24} /></button>
         <div className="flex gap-2 items-center">
             {[0, 1, 2, 3, 4].map(i => <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-teal-500' : i < step ? 'w-2 bg-teal-200 dark:bg-teal-900' : 'w-2 bg-slate-100 dark:bg-slate-800'}`} />)}
         </div>
         {onToggleTheme ? (
           <button onClick={onToggleTheme} className="p-2 text-slate-400 hover:text-slate-600 bg-gray-50 dark:bg-slate-800 rounded-full transition-all">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
         ) : <div className="w-10"></div>}
      </div>
      <div className="flex-1 flex flex-col w-full max-w-lg mx-auto relative">{renderStepContent()}</div>
      
      {/* Changed to FIXED position to ensure it's always visible and clickable */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 pb-safe pt-2 border-t border-gray-50 dark:border-slate-800 z-50 transition-colors shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-none">
         <div className="max-w-lg mx-auto w-full">
            {step !== 0 && step !== 3 ? (
                <button onClick={handleNext} className={`w-full py-4 rounded-[1.5rem] font-bold text-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-white ${step === 4 ? 'bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-500' : 'bg-gradient-to-r from-teal-500 to-teal-600 shadow-teal-200 dark:shadow-none'}`}>
                    {step === 4 && <Calculator size={20} />} {step === 4 ? "สรุปยอดรวม" : "ถัดไป"} {step !== 4 && <ChevronRight size={20} />}
                </button>
            ) : (
                <div className="h-14"></div> /* Spacer when button is hidden on choice screens */
            )}
         </div>
      </div>
      <style>{`.pb-safe { padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 12px); }`}</style>
    </div>
  );
};
