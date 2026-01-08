
import React from 'react';
import { X, UserPlus, ShoppingBag, Receipt, CheckCircle2, Camera, ScanLine } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ zIndex: 100 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-scale-up transition-colors border border-white/10">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 transition-colors">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span className="bg-teal-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">?</span>
            วิธีใช้งาน HanTao
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 bg-transparent p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          
          {/* Step 1 */}
          <div className="relative flex gap-4">
            {/* Connector Line */}
            <div className="absolute left-[22px] top-10 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-slate-800"></div>
            
            <div className="flex-shrink-0 w-11 h-11 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm border-2 border-white dark:border-slate-900 z-10">
                <UserPlus size={20} />
            </div>
            <div className="pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">1. เพิ่มสมาชิก</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    ใส่ชื่อเพื่อนๆ ให้ครบทุกคน คนแรกจะเป็น "คนจ่ายหลัก" โดยอัตโนมัติ
                </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex gap-4">
            <div className="absolute left-[22px] top-10 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-slate-800"></div>
            
            <div className="flex-shrink-0 w-11 h-11 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border-2 border-white dark:border-slate-900 z-10">
                <ScanLine size={20} />
            </div>
            <div className="pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">2. เพิ่มรายการ</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    พิมพ์รายการเอง หรือกดปุ่ม <span className="font-bold text-indigo-500">กล้อง</span> เพื่อสแกนบิลด้วย AI
                </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex gap-4">
             <div className="absolute left-[22px] top-10 bottom-[-24px] w-0.5 bg-gray-100 dark:bg-slate-800"></div>
            
            <div className="flex-shrink-0 w-11 h-11 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm border-2 border-white dark:border-slate-900 z-10">
                <ShoppingBag size={20} />
            </div>
            <div className="pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">3. เลือกคนกิน</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    ติ๊กเลือกเพื่อนที่หารในแต่ละรายการ ถ้าหารเท่าทุกคนกดปุ่ม <span className="font-bold text-slate-700 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 px-1 rounded text-xs">All</span> ได้เลย
                </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative flex gap-4">
            
            <div className="flex-shrink-0 w-11 h-11 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border-2 border-white dark:border-slate-900 z-10">
                <Receipt size={20} />
            </div>
            <div className="pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">4. สรุปยอด</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    ดูยอดสุทธิที่ต้องจ่าย และใครต้องโอนให้ใคร พร้อมบันทึกรูปภาพสลิป
                </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-start gap-3">
            <CheckCircle2 className="text-teal-500 mt-0.5 flex-shrink-0" size={18} />
            <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Tip:</strong> ตั้งค่า Service Charge และ VAT แยกรายบิลได้ โดยกดที่ชื่อร้านค้า
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
          <button onClick={onClose} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-95">
            เริ่มใช้งานเลย
          </button>
        </div>
      </div>
    </div>
  );
};
