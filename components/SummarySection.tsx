import React, { useState, useEffect } from 'react';
import { Receipt, Table, ArrowRightLeft, Wallet, Check, Grid, ChevronRight, Calculator, AlertTriangle, Coins, RefreshCw } from 'lucide-react';
import { Member, Item, BillConfig, MemberSummary, Receipt as ReceiptType } from '../types';
import { calculateSummary, formatCurrency } from '../utils/calculations';
import { SummaryModal } from './SummaryModal';
import { MemberCardModal } from './MemberCardModal';

interface SummarySectionProps {
  members: Member[];
  items: Item[];
  receipts: ReceiptType[]; 
  config: BillConfig;
  setConfig: React.Dispatch<React.SetStateAction<BillConfig>>;
  billName: string;
  onViewTable: () => void;
  onUpdatePromptPay: (id: string) => void;
  onSaveHistory: () => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  members,
  items,
  receipts,
  config,
  setConfig,
  billName,
  onViewTable,
  onUpdatePromptPay,
  onSaveHistory
}) => {
  const { summaries, transfers } = calculateSummary(members, items, receipts, config);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedMemberSummary, setSelectedMemberSummary] = useState<MemberSummary | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  
  const handleSaveClick = () => {
    onSaveHistory();
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-6 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold flex items-center text-emerald-800 dark:text-emerald-400">
            <span className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg mr-3">
                <Receipt className="text-emerald-700 dark:text-emerald-300" size={20} />
            </span>
            3. สรุปยอด (Summary)
        </h2>
        
        <button 
            onClick={handleSaveClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                hasSaved 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
        >
            {hasSaved ? <Check size={14} /> : <Receipt size={14} />}
            {hasSaved ? 'บันทึกแล้ว' : 'บันทึกบิล'}
        </button>
      </div>

      <div className="space-y-3 mb-6">
        {summaries.map((summary) => {
            const isCreditor = summary.netBalance > 0.01;
            const isDebtor = summary.netBalance < -0.01;
            const hasPaid = summary.totalPaid > 0.01;
            
            return (
                <div 
                    key={summary.memberId} 
                    onClick={() => setSelectedMemberSummary(summary)}
                    className="border border-gray-100 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm cursor-pointer transition-all active:scale-[0.98] group"
                >
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="font-bold text-gray-800 dark:text-slate-200 text-sm truncate flex items-center gap-1">
                            {summary.memberName}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                            กินไป {formatCurrency(summary.totalConsumption)}
                        </div>
                        {hasPaid && (
                             <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 flex items-center gap-1">
                                <Wallet size={12} /> จ่ายสำรอง {formatCurrency(summary.totalPaid)}
                             </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                         {isCreditor && (
                             <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1.5 rounded-lg border border-green-100 dark:border-green-800 block text-center min-w-[80px]">
                                 รับ {formatCurrency(summary.netBalance)}
                             </span>
                        )}
                        {isDebtor && (
                             <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-800 block text-center min-w-[80px]">
                                 จ่าย {formatCurrency(Math.abs(summary.netBalance))}
                             </span>
                        )}
                        {!isCreditor && !isDebtor && (
                            <span className="text-xs font-bold text-gray-400 dark:text-slate-600 bg-gray-100 dark:bg-slate-800 px-2 py-1.5 rounded-lg min-w-[60px] text-center">
                                ครบ
                            </span>
                        )}
                        <ChevronRight size={16} className="text-gray-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors" />
                    </div>
                </div>
            );
        })}
      </div>

      <div className="pt-2 grid grid-cols-2 gap-3">
          <button onClick={onViewTable} className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 shadow-sm h-20">
            <Grid size={22} className="text-gray-400 dark:text-slate-600" />
            <span className="font-bold text-sm">ดูตาราง</span>
          </button>
          <button onClick={() => setShowSummaryModal(true)} className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-200 dark:shadow-none h-20">
            <Receipt size={22} />
            <span className="font-bold text-sm">ใครโอนให้ใคร</span>
          </button>
      </div>

      <SummaryModal isOpen={showSummaryModal} onClose={() => setShowSummaryModal(false)} transfers={transfers} summaries={summaries} billName={billName} members={members} />
      <MemberCardModal isOpen={!!selectedMemberSummary} onClose={() => setSelectedMemberSummary(null)} summary={selectedMemberSummary} transfers={transfers} members={members} billName={billName} />
    </div>
  );
};