import React, { useState, useRef } from 'react';
import { Plus, User, X, CreditCard } from 'lucide-react';
import { Member } from '../types';

const BANKS = [
  { id: 'kbank',  label: 'กสิกร',   short: 'KBank', color: 'bg-green-600',   text: 'text-white' },
  { id: 'scb',    label: 'ไทยพาณิชย์', short: 'SCB',  color: 'bg-purple-700', text: 'text-white' },
  { id: 'bbl',    label: 'กรุงเทพ',  short: 'BBL',   color: 'bg-blue-900',   text: 'text-white' },
  { id: 'ktb',    label: 'กรุงไทย', short: 'KTB',   color: 'bg-sky-500',    text: 'text-white' },
  { id: 'bay',    label: 'กรุงศรี',  short: 'BAY',   color: 'bg-yellow-500', text: 'text-white' },
  { id: 'ttb',    label: 'ทหารไทย', short: 'TTB',   color: 'bg-pink-500',   text: 'text-white' },
  { id: 'gsb',    label: 'ออมสิน',  short: 'GSB',   color: 'bg-fuchsia-600', text: 'text-white' },
  { id: 'baac',   label: 'ธ.ก.ส.',   short: 'BAAC',  color: 'bg-green-800',  text: 'text-white' },
  { id: 'uob',    label: 'UOB',      short: 'UOB',   color: 'bg-red-600',    text: 'text-white' },
  { id: 'cimb',   label: 'CIMB',     short: 'CIMB',  color: 'bg-red-800',    text: 'text-white' },
];

interface MemberSectionProps {
  members: Member[];
  onAddMember: (name: string, promptPay?: string, bank?: string) => void;
  onRemoveMember: (id: string) => void;
  compact?: boolean;
}

export const MemberSection: React.FC<MemberSectionProps> = ({
  members,
  onAddMember,
  onRemoveMember,
  compact = false,
}) => {
  const [name, setName] = useState('');
  const [promptPay, setPromptPay] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (name.trim()) {
      onAddMember(name, members.length === 0 ? promptPay : undefined, members.length === 0 ? selectedBank : undefined);
      setName('');
      setPromptPay('');
      setSelectedBank('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const wrapperClasses = compact 
    ? "bg-transparent w-full max-w-md mx-auto" 
    : "bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 transition-colors";

  return (
    <div className={wrapperClasses}>
      {!compact && (
        <h2 className="text-lg font-bold mb-4 flex items-center text-teal-800 dark:text-teal-400">
          <span className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-lg mr-3">
            <User className="text-teal-700 dark:text-teal-300" size={20} />
          </span>
          1. สมาชิก (Members)
        </h2>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-2">
            <div className={`flex-1 flex items-center bg-white dark:bg-slate-800 border-2 ${compact ? 'border-teal-400 ring-4 ring-teal-50 dark:ring-teal-900/20' : 'border-gray-200 dark:border-slate-700'} rounded-2xl px-4 transition-all focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-50 dark:focus-within:ring-teal-900/40`}>
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="ชื่อเพื่อน (เช่น นัท, บีม)..."
                    className="flex-1 py-3.5 text-base bg-transparent focus:outline-none placeholder:text-gray-300 dark:placeholder:slate-600 text-slate-900 dark:text-white"
                />
            </div>
            
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className={`px-5 rounded-2xl font-bold text-white transition-all shadow-md flex items-center justify-center min-w-[3.5rem] ${!name.trim() ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-50' : 'bg-teal-500 hover:bg-teal-600 active:scale-95 shadow-teal-200 dark:shadow-none'}`}
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
        
        {members.length === 0 && (
          <div className="text-sm text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in">
             <div className="flex items-center gap-2 mb-2 text-teal-700 dark:text-teal-400 font-bold text-base">
                <CreditCard size={20} /> คนแรกคือ "คนจ่ายหลัก"
             </div>
             <p className="text-xs text-gray-500 dark:text-slate-500 mb-4 leading-relaxed">
                 รายการที่เพิ่มใหม่จะถูกตั้งให้คนนี้จ่ายก่อน (แต่คุณสามารถเปลี่ยนคนจ่ายรายเมนูได้)
             </p>
             <input
                type="tel"
                value={promptPay}
                onChange={(e) => setPromptPay(e.target.value)}
                placeholder="เบอร์โทร / PromptPay (ไม่บังคับ)"
                className="w-full text-base px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-teal-500 transition-all placeholder:text-gray-400 dark:placeholder:slate-600 dark:text-white"
             />
             <div className="mt-3">
               <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">ธนาคาร (ไม่บังคับ)</p>
               <div className="flex flex-wrap gap-2">
                 {BANKS.map((bank) => (
                   <button
                     key={bank.id}
                     type="button"
                     onClick={() => setSelectedBank(selectedBank === bank.id ? '' : bank.id)}
                     className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
                       selectedBank === bank.id
                         ? `${bank.color} ${bank.text} border-transparent shadow-md scale-105`
                         : 'bg-transparent border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500'
                     }`}
                   >
                     {bank.short}
                   </button>
                 ))}
               </div>
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {members.map((member) => (
          <div
            key={member.id}
            className={`flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full border shadow-sm transition-all animate-scale-up ${
              member.isPayer
                ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 ring-2 ring-teal-100 dark:ring-teal-900/40 ring-offset-1 dark:ring-offset-slate-900'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300'
            }`}
          >
            <span className="font-semibold text-sm">
                {member.name} {member.isPayer && <span className="text-[10px] ml-1">👑</span>}
            </span>
            <button
              onClick={() => onRemoveMember(member.id)}
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ))}
        {members.length === 0 && compact && (
          <div className="w-full text-center py-8 opacity-50">
             <div className="inline-block p-4 bg-gray-100 dark:bg-slate-800 rounded-full mb-2 text-gray-400 dark:text-slate-600">
                <User size={32} />
             </div>
             <p className="text-gray-400 dark:text-slate-600 text-sm">ยังไม่มีสมาชิก...</p>
          </div>
        )}
      </div>
    </div>
  );
};