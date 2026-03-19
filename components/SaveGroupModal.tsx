import React, { useState } from 'react';
import { X, Users } from 'lucide-react';

interface SaveGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
  memberCount: number;
  isDarkMode?: boolean;
}

export const SaveGroupModal: React.FC<SaveGroupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  memberCount,
  isDarkMode,
}) => {
  const dark = isDarkMode !== false;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      setName('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm rounded-2xl shadow-xl ${dark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
          <h2 className={`text-lg font-bold flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-800'}`}>
            <Users size={20} /> บันทึกกลุ่มเพื่อน
          </h2>
          <button onClick={onClose} className={`p-2 rounded-full ${dark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            บันทึกสมาชิกปัจจุบัน ({memberCount} คน) เป็นกลุ่มไว้ใช้ในบิลถัดไป
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อกลุ่ม (เช่น เพื่อนออฟฟิศ)"
            className={`w-full px-4 py-2.5 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-slate-600 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50 transition-all"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกกลุ่ม'}
          </button>
        </form>
      </div>
    </div>
  );
};
