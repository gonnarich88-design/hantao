
import React, { useRef, useState } from 'react';
import { X, Receipt, ArrowRight, Wallet, Download, Copy, Check } from 'lucide-react';
import { MemberSummary, Transfer, Member } from '../types';
import { formatCurrency } from '../utils/calculations';
import html2canvas from 'html2canvas';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: Transfer[];
  summaries: MemberSummary[];
  billName: string;
  members: Member[];
}

interface TransferGroup {
  receiverId: string;
  receiverName: string;
  items: Transfer[];
  totalReceive: number;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  transfers,
  summaries,
  billName,
  members
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveImage = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const isDarkMode = document.documentElement.classList.contains('dark');
        const bgColor = isDarkMode ? '#0f172a' : '#ffffff';

        const canvas = await html2canvas(contentRef.current, {
            backgroundColor: bgColor,
            scale: 2,
            logging: false,
            useCORS: true,
            onclone: (clonedDoc) => {
                if (isDarkMode) {
                    clonedDoc.documentElement.classList.add('dark');
                }
            }
        });
        
        const link = document.createElement('a');
        link.download = `Settlement-${billName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('Error generating image:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
    } finally {
        setIsGenerating(false);
    }
  };

  const totalBill = summaries.reduce((acc, curr) => acc + curr.totalConsumption, 0);

  // Group transfers by Receiver
  const transfersByReceiver = transfers.reduce((acc, t) => {
    if (!acc[t.toId]) {
      acc[t.toId] = {
        receiverId: t.toId,
        receiverName: t.toName,
        items: [],
        totalReceive: 0
      };
    }
    acc[t.toId].items.push(t);
    acc[t.toId].totalReceive += t.amount;
    return acc;
  }, {} as Record<string, TransferGroup>);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-sans">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Container with max-height constraint */}
      <div className="relative bg-gray-100 dark:bg-slate-950 rounded-2xl w-full max-w-md shadow-2xl flex flex-col h-auto max-h-[90vh] animate-scale-up transition-colors overflow-hidden">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-4 flex justify-between items-center bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 z-10 transition-colors">
             <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Receipt className="text-emerald-600 dark:text-emerald-400" size={20} />
                สรุปยอดโอน (Settlement)
             </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100 dark:bg-slate-950 transition-colors">
            {/* 
               IMPORTANT: Use mx-auto for centering instead of flex justify-center on the parent.
               This ensures scrolling works correctly when content overflows vertically.
            */}
            <div 
                ref={contentRef} 
                className="mx-auto bg-white dark:bg-slate-900 w-full max-w-sm shadow-sm border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden relative transition-colors"
            >
                {/* Receipt Header */}
                <div className="bg-emerald-600 dark:bg-emerald-700 p-6 text-white text-center relative overflow-hidden transition-colors">
                    <div className="absolute top-0 left-0 w-full h-2 bg-black/10"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold tracking-tight mb-1">HanTao</h2>
                        <p className="text-emerald-100 text-sm font-medium">{billName}</p>
                        <p className="text-emerald-200 text-xs mt-2 opacity-80">
                            {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                        </p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-white/10 rounded-full"></div>
                    <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full"></div>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* 1. Who pays whom (Grouped) */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                             <ArrowRight size={14}/> รายการโอน (Transfers)
                        </h4>
                        
                        {Object.keys(transfersByReceiver).length > 0 ? (
                            <div className="space-y-4">
                                {Object.values(transfersByReceiver).map((group: TransferGroup) => {
                                    const receiver = members.find(m => m.id === group.receiverId);
                                    return (
                                        <div key={group.receiverId} className="bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                                            {/* Receiver Header */}
                                            <div className="bg-gray-100 dark:bg-slate-800/80 p-3 flex justify-between items-center border-b border-gray-100 dark:border-slate-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-slate-400 font-bold">โอนให้</span>
                                                    <span className="font-bold text-slate-800 dark:text-white">{group.receiverName}</span>
                                                </div>
                                                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                                                    รับรวม {formatCurrency(group.totalReceive)}
                                                </span>
                                            </div>

                                            {/* Transfer Items */}
                                            <div className="p-3 space-y-2 bg-white dark:bg-slate-900">
                                                {group.items.map((t, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                                                            <span>{t.fromName}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                                            {formatCurrency(t.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* PromptPay Footer (Once per receiver) */}
                                            {receiver?.promptPayId && (
                                                <div className="bg-blue-50 dark:bg-blue-900/10 p-2.5 flex justify-between items-center border-t border-blue-100 dark:border-blue-900/30">
                                                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 min-w-0">
                                                        <Wallet size={14} className="flex-shrink-0" />
                                                        <span className="text-xs font-bold whitespace-nowrap">PromptPay</span>
                                                        <span className="text-xs font-mono truncate">{receiver.promptPayId}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleCopy(receiver.promptPayId!, receiver.id)}
                                                        className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                        title="Copy PromptPay"
                                                    >
                                                        {copiedId === receiver.id ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800 text-green-700 dark:text-green-400 font-medium text-sm transition-colors">
                                ✅ เคลียร์ยอดครบทุกคนแล้ว
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-gray-200 dark:border-slate-700 transition-colors"></div>

                    {/* 2. Member Summary Table */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                            รายละเอียด (Details)
                        </h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 dark:text-slate-500 text-xs border-b border-gray-100 dark:border-slate-800">
                                    <th className="text-left pb-2 font-medium">ชื่อ</th>
                                    <th className="text-right pb-2 font-medium">กิน</th>
                                    <th className="text-right pb-2 font-medium">จ่ายก่อน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                {summaries.map(s => (
                                    <tr key={s.memberId}>
                                        <td className="py-2 text-gray-700 dark:text-slate-200 font-medium">{s.memberName}</td>
                                        <td className="py-2 text-right text-gray-500 dark:text-slate-400">{formatCurrency(s.totalConsumption)}</td>
                                        <td className="py-2 text-right text-gray-500 dark:text-slate-400">{s.totalPaid > 0 ? formatCurrency(s.totalPaid) : '-'}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 dark:bg-slate-800 font-bold text-gray-800 dark:text-white transition-colors">
                                    <td className="py-2 pl-2 rounded-l-lg">รวม (Total)</td>
                                    <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totalBill)}</td>
                                    <td className="py-2 pr-2 text-right rounded-r-lg">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* Footer Brand */}
                <div className="bg-gray-50 dark:bg-slate-800 p-3 text-center border-t border-gray-100 dark:border-slate-700 transition-colors">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500">Generated by HanTao App</p>
                </div>
            </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 z-20 transition-colors">
             <button 
                onClick={handleSaveImage}
                disabled={isGenerating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-emerald-200 dark:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
                {isGenerating ? (
                    'กำลังบันทึก...'
                ) : (
                    <>
                        <Download size={20} /> บันทึกรูปภาพ (Save)
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
