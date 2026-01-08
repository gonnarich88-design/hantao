import React from 'react';
import { ArrowLeft, Clock, Trash2, FileText, ChevronRight, Sun, Moon } from 'lucide-react';
import { SavedBill } from '../types';
import { formatCurrency } from '../utils/calculations';

interface HistoryViewProps {
  history: SavedBill[];
  onBack: () => void;
  onLoadBill: (bill: SavedBill) => void;
  onDeleteBill: (id: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ 
  history, 
  onBack, 
  onLoadBill,
  onDeleteBill,
  isDarkMode,
  onToggleTheme
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <header className="bg-white dark:bg-slate-900 p-4 shadow-sm sticky top-0 z-10 border-b dark:border-slate-800 transition-colors">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-600 dark:text-slate-400">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">ประวัติบิล (History)</h1>
          </div>
          {onToggleTheme && (
            <button onClick={onToggleTheme} className="p-2 text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 rounded-full transition-all">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full p-4 flex-1">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-slate-600">
            <div className="bg-gray-100 dark:bg-slate-900 p-4 rounded-full mb-4">
                <Clock size={40} className="text-gray-300 dark:text-slate-700" />
            </div>
            <p className="font-medium">ยังไม่มีประวัติการคำนวณ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.sort((a, b) => b.timestamp - a.timestamp).map((bill) => (
              <div key={bill.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.99]">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400 flex-shrink-0">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-800 dark:text-slate-200 truncate">{bill.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-500">{new Date(bill.timestamp).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                    <button onClick={() => confirm('ลบใช่หรือไม่?') && onDeleteBill(bill.id)} className="p-2 text-gray-300 dark:text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                </div>
                <div className="flex justify-between items-end mt-2 pl-12">
                    <div className="text-xs text-gray-500 dark:text-slate-500">{bill.members.length} คน &bull; {bill.items.length} รายการ</div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-teal-700 dark:text-teal-400 text-lg">{formatCurrency(bill.total)}</span>
                        <button onClick={() => onLoadBill(bill)} className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-lg text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center gap-1">ดูบิล <ChevronRight size={14} /></button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};