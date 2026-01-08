
import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Utensils, Wallet, ArrowRightLeft, Share2, Sparkles, ChevronLeft } from 'lucide-react';
import { MemberSummary, Transfer, Member } from '../types';
import { formatCurrency } from '../utils/calculations';
import html2canvas from 'html2canvas';

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MemberSummary | null;
  transfers: Transfer[];
  members: Member[];
  billName: string;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  isOpen,
  onClose,
  summary,
  transfers,
  members,
  billName
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !summary) return null;

  const outgoingTransfers = transfers.filter(t => t.fromId === summary.memberId);
  const incomingTransfers = transfers.filter(t => t.toId === summary.memberId);

  const isDebtor = summary.netBalance < -0.01;
  const isCreditor = summary.netBalance > 0.01;

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: '#ffffff',
      scale: 3,
      logging: false,
      useCORS: true,
      windowWidth: 400,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
  };

  const handleSaveImage = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const blob = await generateImageBlob();
      if (blob) {
        const link = document.createElement('a');
        link.download = `Slip-${summary.memberName}-${billName}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert('ไม่สามารถบันทึกรูปภาพได้');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImageBlob();
      if (blob && navigator.share) {
        const file = new File([blob], `Slip-${summary.memberName}.png`, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: `สรุปยอดของ ${summary.memberName}`,
          text: `รายการสรุปค่าใช้จ่ายจากบิล ${billName}`,
        });
      } else {
        await handleSaveImage();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col font-sans bg-slate-950/95 backdrop-blur-xl animate-fade-in overflow-hidden">
      
      {/* Immersive Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border-b border-white/5 sticky top-0 z-10">
          <button 
              onClick={onClose} 
              className="flex items-center gap-2 text-white/70 hover:text-white transition-all active:scale-95"
          >
              <ChevronLeft size={24} />
              <span className="font-bold text-sm">กลับ</span>
          </button>
          <h3 className="text-white font-black text-sm tracking-widest uppercase opacity-50">Member Summary</h3>
          <button 
              onClick={onClose} 
              className="p-2 bg-white/5 rounded-full text-white/70"
          >
              <X size={20} />
          </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 flex flex-col items-center">
        
        <div className="w-full max-w-sm flex flex-col items-center gap-8 py-4">
            
            {/* Captured Slip Area */}
            <div 
                ref={cardRef} 
                className="w-full bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative animate-scale-up"
            >
                {/* Header Section */}
                <div className={`pt-10 pb-8 px-6 text-center text-white relative overflow-hidden ${
                    isCreditor ? 'bg-emerald-600' :
                    isDebtor ? 'bg-rose-600' :
                    'bg-slate-700'
                }`}>
                    {/* Pattern Overlay */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                            <Sparkles size={10} /> {billName}
                        </div>
                        <h2 className="text-3xl font-black mb-1 drop-shadow-sm">{summary.memberName}</h2>
                        
                        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-[1.5rem] py-4 px-8 inline-block min-w-[200px] border border-white/20">
                            <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">
                                {isCreditor ? 'ได้รับคืน (Receive)' : isDebtor ? 'ต้องโอนเพิ่ม (Pay)' : 'ยอดครบพอดี'}
                            </p>
                            <p className="text-4xl font-black tracking-tight leading-none">
                                {formatCurrency(Math.abs(summary.netBalance))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Perforated Divider */}
                <div className="h-0.5 w-full bg-white flex justify-around overflow-hidden">
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-black/10 -translate-y-1/2"></div>
                    ))}
                </div>

                <div className="p-7 space-y-8 bg-white">
                    
                    {/* Transfers Section */}
                    {(outgoingTransfers.length > 0 || incomingTransfers.length > 0) && (
                        <div className="space-y-4">
                            {outgoingTransfers.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Wallet size={14} className="text-rose-500" /> ต้องโอนให้ (Transfer To)
                                    </h4>
                                    {outgoingTransfers.map((t, idx) => {
                                        const receiver = members.find(m => m.id === t.toId);
                                        return (
                                            <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2 shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-black text-slate-800 text-base">{t.toName}</span>
                                                    <span className="font-black text-rose-600 text-xl">{formatCurrency(t.amount)}</span>
                                                </div>
                                                {receiver?.promptPayId && (
                                                    <div className="text-[11px] font-bold text-blue-600 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 self-start font-mono shadow-inner">
                                                        PromptPay: {receiver.promptPayId}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {incomingTransfers.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRightLeft size={14} className="text-emerald-500" /> รอรับจาก (Receive From)
                                    </h4>
                                    {incomingTransfers.map((t, idx) => (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                                            <span className="font-black text-slate-800 text-base">{t.fromName}</span>
                                            <span className="font-black text-emerald-600 text-xl">+{formatCurrency(t.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Consumption Details */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Utensils size={14} className="text-slate-400" /> รายการที่ทาน (Consumption)
                        </h4>
                        
                        <div className="space-y-2.5">
                            {summary.items.length === 0 ? (
                                <p className="text-xs text-slate-300 italic text-center py-4">ไม่มีข้อมูล</p>
                            ) : (
                                summary.items.map((item, i) => {
                                    const isDiscount = item.share < 0;
                                    return (
                                        <div key={i} className="flex justify-between items-start text-xs border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                                            <span className={`flex-1 pr-4 font-bold ${isDiscount ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {item.name}
                                            </span>
                                            <span className={`font-black whitespace-nowrap ${isDiscount ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                {formatCurrency(item.share)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="pt-5 border-t-2 border-slate-100 flex justify-between items-center text-[11px] font-black uppercase text-slate-400">
                            <span>ยอดรวมค่าอาหารสุทธิ</span>
                            <span className="text-slate-900 text-base font-black">{formatCurrency(summary.totalConsumption)}</span>
                        </div>
                    </div>

                    {/* Footer Brand */}
                    <div className="text-center pt-4 border-t border-dashed border-slate-100 opacity-30">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">HanTao Official</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons Group */}
            <div className="w-full flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleSaveImage}
                        disabled={isGenerating}
                        className="bg-white hover:bg-slate-50 text-slate-900 h-16 rounded-2xl font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/20 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                        ) : (
                            <><Download size={22} className="text-teal-600" /> บันทึกรูป</>
                        )}
                    </button>
                    <button 
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-2xl font-black shadow-2xl shadow-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Share2 size={22} /> ส่งให้เพื่อน
                    </button>
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-full h-16 rounded-2xl text-white font-black bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    ปิดหน้าต่างนี้
                </button>
            </div>
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
