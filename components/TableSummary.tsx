
import React, { useRef, useState, useEffect } from 'react';
import { X, ImageIcon, Table as TableIcon, Store, Tag, LayoutList, Grid3X3, Wallet, Calculator, Info } from 'lucide-react';
import { Member, Item, BillConfig, Receipt } from '../types';
import { calculateSummary, formatCurrency } from '../utils/calculations';
import html2canvas from 'html2canvas';

interface TableSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  items: Item[];
  config: BillConfig;
  billName: string;
  receipts: Receipt[];
}

export const TableSummary: React.FC<TableSummaryProps> = ({
  isOpen,
  onClose,
  members,
  items,
  config,
  billName,
  receipts
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Default to 'table' view always to prevent user confusion
  const [viewMode, setViewMode] = useState<'table' | 'list'>('table');

  if (!isOpen) return null;

  const defaultPayerId = members.find(m => m.isPayer)?.id || members[0]?.id;

  const calculateReceiptStats = (groupItems: Item[], receiptId?: string) => {
      const stats = new Map<string, { base: number, sc: number, vat: number, consumption: number, rounding: number, discount: number }>();
      members.forEach(m => stats.set(m.id, { base: 0, sc: 0, vat: 0, consumption: 0, rounding: 0, discount: 0 }));
      
      let totalBase = 0, totalSC = 0, totalVAT = 0;
      const receipt = receipts.find(r => r.id === receiptId);
      const scRate = receipt?.scRate ?? 0, vatRate = receipt?.vatRate ?? 7;

      groupItems.forEach(item => {
          const assignedCount = item.assignedMemberIds.length;
          
          const lineTotalBase = item.price * item.quantity;
          const itemScRate = item.excludeServiceCharge ? 0 : scRate;
          const itemVatRate = item.excludeVat ? 0 : vatRate;
          
          const itemSc = lineTotalBase * (itemScRate / 100);
          const itemBaseForVat = lineTotalBase + itemSc;
          const itemVat = itemBaseForVat * (itemVatRate / 100);
          const totalItemCost = lineTotalBase + itemSc + itemVat;

          totalBase += lineTotalBase; 
          totalSC += itemSc; 
          totalVAT += itemVat;
          
          const unitTotalCost = totalItemCost / item.quantity;
          const unitBase = item.price;
          const unitSc = (item.price * itemScRate / 100);
          const unitVat = (item.price + unitSc) * itemVatRate / 100;

          if (assignedCount > 0) {
              if (assignedCount > item.quantity) {
                  // Sharing Mode
                  item.assignedMemberIds.forEach(mid => {
                      const s = stats.get(mid);
                      if (s) { 
                          s.base += lineTotalBase / assignedCount; 
                          s.sc += itemSc / assignedCount; 
                          s.vat += itemVat / assignedCount; 
                          s.consumption += totalItemCost / assignedCount; 
                      }
                  });
              } else {
                  // Unit Mode
                  item.assignedMemberIds.forEach(mid => {
                      const s = stats.get(mid);
                      if (s) { 
                          s.base += unitBase;
                          s.sc += unitSc;
                          s.vat += unitVat;
                          s.consumption += unitTotalCost;
                      }
                  });
                  // Remainder
                  const remainingUnits = item.quantity - assignedCount;
                  if (remainingUnits > 0) {
                      const payerId = item.paidBy || defaultPayerId;
                      const s = stats.get(payerId);
                      if (s) {
                          s.base += unitBase * remainingUnits;
                          s.sc += unitSc * remainingUnits;
                          s.vat += unitVat * remainingUnits;
                          s.consumption += unitTotalCost * remainingUnits;
                      }
                  }
              }
          } else {
              // Unassigned -> Payer
              const payerId = item.paidBy || defaultPayerId;
              const s = stats.get(payerId);
              if (s) {
                  s.base += lineTotalBase;
                  s.sc += itemSc;
                  s.vat += itemVat;
                  s.consumption += totalItemCost;
              }
          }
      });

      let totalDiscount = 0;
      if (receipt?.discountValue) {
          let discountBaseAmount = receipt.discountType === 'percent' ? totalBase * (receipt.discountValue / 100) : receipt.discountValue;
          const savingSC = discountBaseAmount * (scRate / 100), savingVAT = (discountBaseAmount + savingSC) * (vatRate / 100);
          totalDiscount = discountBaseAmount + savingSC + savingVAT;
          let totalReceiptConsumption = 0;
          stats.forEach(s => totalReceiptConsumption += s.consumption);
          if (totalReceiptConsumption > 0) stats.forEach(s => s.discount = totalDiscount * (s.consumption / totalReceiptConsumption));
      }

      let receiptRoundingTotal = 0;
      if (receipt?.manualTotal != null) {
          const calculatedNet = (totalBase + totalSC + totalVAT) - totalDiscount;
          const diff = receipt.manualTotal - calculatedNet;
          if (Math.abs(diff) > 0.0001) {
              receiptRoundingTotal = diff;
              let activeMembersCount = 0;
              stats.forEach(s => { if(s.consumption > 0) activeMembersCount++; });
              const share = activeMembersCount > 0 ? diff / activeMembersCount : 0;
              stats.forEach(s => { if (s.consumption > 0) s.rounding = share; });
          }
      }
      return { stats, totalBase, totalSC, totalVAT, totalDiscount, receiptRoundingTotal };
  };

  const { summaries } = calculateSummary(members, items, receipts, config);
  const memberGrandTotals = members.map(m => ({ id: m.id, net: summaries.find(sum => sum.memberId === m.id)?.totalConsumption || 0 }));
  const finalGrandTotal = memberGrandTotals.reduce((a,b) => a + b.net, 0);
  
  const handleSaveImage = async () => {
    if (!tableRef.current) return;
    setIsGenerating(true);
    try {
        await new Promise(resolve => setTimeout(resolve, 300));
        const canvas = await html2canvas(tableRef.current, { backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', scale: 2, logging: false, useCORS: true });
        const link = document.createElement('a');
        link.download = `Settlement-${billName}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    } catch (error) { alert('เกิดข้อผิดพลาด'); } finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 sm:rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[95vh] overflow-hidden animate-scale-up transition-colors">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-20 transition-colors">
             <div className="flex items-center gap-3">
                 <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><TableIcon size={20} className="text-teal-600"/> ตารางสรุป</h3>
                 <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
                     <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}>
                        <LayoutList size={16} /> รายการ
                     </button>
                     <button onClick={() => setViewMode('table')} className={`p-1.5 px-3 rounded-md flex items-center gap-1.5 text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}>
                        <Grid3X3 size={16} /> ตาราง
                     </button>
                 </div>
             </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-950">
            <div id="export-container" ref={tableRef} className={`bg-white dark:bg-slate-900 w-full ${viewMode === 'table' ? 'min-w-max' : 'min-w-0'} p-4 sm:p-6 transition-colors`}> 
                <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-teal-800 dark:text-teal-400">HanTao Summary</h2>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{billName}</p>
                </div>
                {viewMode === 'table' ? (
                  <table className="w-full border-collapse text-xs dark:text-slate-300">
                      <thead>
                          <tr className="bg-teal-50 dark:bg-teal-900/30 border-b-2 border-teal-100 dark:border-teal-800">
                              <th className="p-3 text-left min-w-[150px] font-bold border-r dark:border-slate-800 sticky left-0 bg-teal-50 dark:bg-teal-900/30 z-10 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)]">รายการ</th>
                              {members.map(m => <th key={m.id} className="p-3 text-center border-r dark:border-slate-800 font-bold min-w-[80px]">{m.name}</th>)}
                              <th className="p-3 text-right font-bold min-w-[90px]">รวม</th>
                          </tr>
                      </thead>
                      <tbody>
                          {receipts.map(receipt => {
                              const groupItems = items.filter(i => i.receiptId === receipt.id);
                              if (groupItems.length === 0) return null;
                              const { stats, totalBase, totalSC, totalVAT, totalDiscount, receiptRoundingTotal } = calculateReceiptStats(groupItems, receipt.id);
                              
                              const showSC = Math.abs(totalSC) > 0.01;
                              const showVAT = Math.abs(totalVAT) > 0.01;
                              const showDiscount = Math.abs(totalDiscount) > 0.01;
                              const showRounding = Math.abs(receiptRoundingTotal) > 0.01;

                              return (
                                <React.Fragment key={receipt.id}>
                                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-y dark:border-slate-800 font-black">
                                    <td colSpan={members.length + 2} className="p-2 pl-3 text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10">
                                        <Store size={14} className="text-teal-500" /> {receipt.name}
                                    </td>
                                  </tr>
                                  {groupItems.map(item => {
                                    const lineTotal = item.price * item.quantity;
                                    const totalAssigned = item.assignedMemberIds.length;
                                    // For table display logic:
                                    // If unassigned (totalAssigned == 0), the loop below won't trigger for anyone except maybe we need to force it?
                                    // No, we need to iterate members and check logic.
                                    
                                    return (
                                        <tr key={item.id} className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-2 border-r dark:border-slate-800 font-medium pl-6 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 z-10 drop-shadow-[2px_0_2px_rgba(0,0,0,0.02)]">
                                            {item.name}
                                            {item.quantity > 1 && <span className="text-xs text-gray-400 dark:text-slate-500 ml-1 font-normal">(x{item.quantity})</span>}
                                        </td>
                                        {members.map(m => {
                                            const memberAssignCount = item.assignedMemberIds.filter(id => id === m.id).length;
                                            let share = 0;
                                            
                                            // MATCH LOGIC WITH CALCULATIONS.TS
                                            if (totalAssigned > 0) {
                                                if (totalAssigned > item.quantity) {
                                                    // Sharing Mode
                                                    share = (lineTotal * memberAssignCount) / totalAssigned;
                                                } else {
                                                    // Unit Mode
                                                    const unitCost = item.price; // Base cost for table display
                                                    share = unitCost * memberAssignCount;
                                                    
                                                    // Remainder handling
                                                    const remainingUnits = item.quantity - totalAssigned;
                                                    const payerId = item.paidBy || defaultPayerId;
                                                    if (remainingUnits > 0 && m.id === payerId) {
                                                        share += unitCost * remainingUnits;
                                                    }
                                                }
                                            } else {
                                                // Unassigned -> Payer
                                                const payerId = item.paidBy || defaultPayerId;
                                                if (m.id === payerId) {
                                                    share = lineTotal;
                                                }
                                            }

                                            return <td key={m.id} className="p-2 text-center border-r dark:border-slate-800">{share > 0 ? formatCurrency(share).replace('฿','') : '-'}</td>;
                                        })}
                                        <td className="p-2 text-right font-bold">{formatCurrency(lineTotal).replace('฿','')}</td>
                                        </tr>
                                    );
                                  })}

                                  {/* --- Configuration Rows per Bill --- */}
                                  {showSC && (
                                    <tr className="border-b dark:border-slate-800 text-[10px] text-indigo-600 bg-indigo-50/10">
                                      <td className="p-2 border-r dark:border-slate-800 italic pl-8 sticky left-0 bg-white dark:bg-slate-900 z-10">+ Service Charge ({receipt.scRate}%)</td>
                                      {members.map(m => {
                                          const s = stats.get(m.id);
                                          return <td key={m.id} className="p-2 text-center border-r dark:border-slate-800">{(s?.sc||0) > 0 ? formatCurrency(s!.sc).replace('฿','') : '-'}</td>;
                                      })}
                                      <td className="p-2 text-right font-medium">{formatCurrency(totalSC).replace('฿','')}</td>
                                    </tr>
                                  )}

                                  {showVAT && (
                                    <tr className="border-b dark:border-slate-800 text-[10px] text-emerald-600 bg-emerald-50/10">
                                      <td className="p-2 border-r dark:border-slate-800 italic pl-8 sticky left-0 bg-white dark:bg-slate-900 z-10">+ VAT ({receipt.vatRate}%)</td>
                                      {members.map(m => {
                                          const s = stats.get(m.id);
                                          return <td key={m.id} className="p-2 text-center border-r dark:border-slate-800">{(s?.vat||0) > 0 ? formatCurrency(s!.vat).replace('฿','') : '-'}</td>;
                                      })}
                                      <td className="p-2 text-right font-medium">{formatCurrency(totalVAT).replace('฿','')}</td>
                                    </tr>
                                  )}

                                  {showDiscount && (
                                    <tr className="border-b dark:border-slate-800 text-[10px] text-rose-600 bg-rose-50/10">
                                      <td className="p-2 border-r dark:border-slate-800 italic pl-8 sticky left-0 bg-white dark:bg-slate-900 z-10">- ส่วนลด (Discount)</td>
                                      {members.map(m => {
                                          const s = stats.get(m.id);
                                          return <td key={m.id} className="p-2 text-center border-r dark:border-slate-800">{(s?.discount||0) > 0 ? `-${formatCurrency(s!.discount).replace('฿','')}` : '-'}</td>;
                                      })}
                                      <td className="p-2 text-right font-medium">-{formatCurrency(totalDiscount).replace('฿','')}</td>
                                    </tr>
                                  )}

                                  {showRounding && (
                                    <tr className="border-b dark:border-slate-800 text-[10px] text-slate-500 bg-slate-50/10">
                                      <td className="p-2 border-r dark:border-slate-800 italic pl-8 sticky left-0 bg-white dark:bg-slate-900 z-10">&plusmn; ปรับเศษ (Rounding)</td>
                                      {members.map(m => {
                                          const s = stats.get(m.id);
                                          return <td key={m.id} className="p-2 text-center border-r dark:border-slate-800">{Math.abs(s?.rounding||0) > 0 ? formatCurrency(s!.rounding).replace('฿','') : '-'}</td>;
                                      })}
                                      <td className="p-2 text-right font-medium">{formatCurrency(receiptRoundingTotal).replace('฿','')}</td>
                                    </tr>
                                  )}

                                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700 font-black">
                                    <td className="p-2 border-r dark:border-slate-700 pl-4 uppercase text-[10px] sticky left-0 bg-slate-100 dark:bg-slate-800 z-10">ยอดสุทธิ {receipt.name}</td>
                                    {members.map(m => {
                                      const s = stats.get(m.id);
                                      const net = (s?.base||0) + (s?.sc||0) + (s?.vat||0) + (s?.rounding||0) - (s?.discount||0);
                                      return <td key={m.id} className="p-2 text-center border-r dark:border-slate-700 text-teal-600 dark:text-teal-400">
                                          {net > 0 ? formatCurrency(net).replace('฿','') : '-'}
                                      </td>;
                                    })}
                                    <td className="p-2 text-right text-teal-700 dark:text-teal-300">
                                        {formatCurrency((totalBase+totalSC+totalVAT+receiptRoundingTotal)-totalDiscount).replace('฿','')}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                          })}

                          {/* --- GRAND TOTAL SUMMARY --- */}
                          <tr className="bg-teal-700 dark:bg-teal-900 text-white font-black text-sm">
                              <td className="p-4 pl-3 uppercase tracking-widest border-r border-white/10 flex items-center gap-2 sticky left-0 bg-teal-700 dark:bg-teal-900 z-10 drop-shadow-[2px_0_2px_rgba(0,0,0,0.2)]">
                                  <Calculator size={18} /> สรุปรวมทุกบิล
                              </td>
                              {members.map(m => {
                                  const total = summaries.find(s => s.memberId === m.id)?.totalConsumption || 0;
                                  return (
                                    <td key={m.id} className="p-4 text-center border-r border-white/10 bg-teal-800/40">
                                        {formatCurrency(total).replace('฿','')}
                                    </td>
                                  );
                              })}
                              <td className="p-4 text-right bg-emerald-500 shadow-inner">
                                  {formatCurrency(finalGrandTotal)}
                              </td>
                          </tr>
                      </tbody>
                  </table>
                ) : (
                  <div className="space-y-4 max-w-lg mx-auto">
                      {memberGrandTotals.map(m => {
                          const mem = members.find(mem => mem.id === m.id);
                          return (
                              <div key={m.id} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 flex justify-between items-center transition-colors">
                                  <span className="font-bold text-gray-800 dark:text-slate-200">{mem?.name}</span>
                                  <span className="text-xl font-black text-teal-600 dark:text-teal-400">{formatCurrency(m.net)}</span>
                              </div>
                          )
                      })}
                      <div className="bg-teal-600 text-white p-6 rounded-2xl text-center shadow-lg">
                          <p className="text-teal-100 text-sm mb-1 uppercase tracking-widest font-bold">ยอดรวมทั้งหมด</p>
                          <p className="text-4xl font-black">{formatCurrency(finalGrandTotal)}</p>
                      </div>
                  </div>
                )}
                
                {/* Export Footer Metadata */}
                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-600">
                    <div className="flex items-center gap-2">
                        <Info size={12} /> ข้อมูลนี้คำนวณจากรายการที่มี SC, VAT และ ส่วนลด แยกตามรายบิล
                    </div>
                    <div>HanTao App v1.3.0</div>
                </div>
            </div>
        </div>
        <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3 transition-colors">
            <button onClick={onClose} className="flex-1 px-6 py-3 rounded-xl border dark:border-slate-700 text-gray-600 dark:text-slate-400 font-bold active:scale-95 transition-all">ปิด</button>
            <button onClick={handleSaveImage} disabled={isGenerating} className="flex-[2] px-6 py-3 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10 hover:bg-teal-700 active:scale-95 transition-all">
                {isGenerating ? (
                    'กำลังสร้าง...'
                ) : (
                    <><ImageIcon size={20} /> บันทึกรูปภาพสรุป</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
