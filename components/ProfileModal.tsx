import React, { useState, useEffect } from 'react';
import { X, User, CreditCard } from 'lucide-react';
import { getProfile, updateProfile, type UserProfile } from '../lib/profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  userId: string;
  isDarkMode?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  userId,
  isDarkMode,
}) => {
  const dark = isDarkMode !== false;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [promptPay, setPromptPay] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    getProfile(userId).then((p) => {
      setProfile(p);
      setDisplayName(p?.display_name ?? '');
      setPromptPay(p?.prompt_pay_initial ?? '');
    });
  }, [isOpen, userId]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateProfile(userId, {
      display_name: displayName || null,
      prompt_pay_initial: promptPay || null,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved?.();
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-2xl shadow-xl ${dark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>โปรไฟล์ของฉัน</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>ชื่อแสดง</label>
            <div className="relative">
              <User size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ชื่อที่ใช้แสดง"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-slate-600 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>PromptPay (ใช้เป็นคนจ่ายเริ่มต้น)</label>
            <div className="relative">
              <CreditCard size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={promptPay}
                onChange={(e) => setPromptPay(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-slate-600 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50 transition-all"
          >
            {saved ? 'บันทึกแล้ว' : saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
};
