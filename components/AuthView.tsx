import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, Sun, Moon } from 'lucide-react';
import type { AuthError } from '@supabase/supabase-js';

type AuthMode = 'login' | 'register';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  onBack: () => void;
  onSuccess: () => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onBack,
  onSuccess,
  signIn,
  signUp,
  isDarkMode,
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dark = isDarkMode !== false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : err.message);
          return;
        }
      } else {
        const { error: err } = await signUp(email, password, displayName || undefined);
        if (err) {
          setError(err.message.includes('already registered') ? 'อีเมลนี้ถูกใช้แล้ว' : err.message);
          return;
        }
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col p-6 transition-colors duration-500 ${dark ? 'bg-[#0f172a]' : 'bg-gradient-to-b from-slate-50 to-teal-50/50'}`}>
      <div className="max-w-sm w-full mx-auto flex flex-col flex-1 justify-center">
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border transition-all ${dark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-700'}`}
          >
            <ArrowLeft size={22} />
          </button>
          {onToggleTheme && (
            <button onClick={onToggleTheme} className={`p-2 rounded-xl border transition-all ${dark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/80 border-slate-200 text-slate-700'}`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
        </div>

        <h1 className={`text-2xl font-bold mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>
          {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </h1>
        <p className={`text-sm mb-6 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          {mode === 'login' ? 'ล็อกอินเพื่อซิงค์ประวัติบิลข้ามเครื่อง' : 'สร้างบัญชีเพื่อเก็บประวัติบิลในคลาวด์'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>ชื่อแสดง</label>
              <div className="relative">
                <User size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-white/20 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
                />
              </div>
            </div>
          )}
          <div>
            <label className={`block text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>อีเมล</label>
            <div className="relative">
              <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-white/20 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
              />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>รหัสผ่าน</label>
            <div className="relative">
              <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === 'register' ? 'อย่างน้อย 6 ตัว' : ''}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-teal-500 ${dark ? 'border-white/20 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold disabled:opacity-50 transition-all"
          >
            {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          className={`mt-6 text-sm ${dark ? 'text-teal-400 hover:text-teal-300' : 'text-teal-600 hover:text-teal-700'}`}
        >
          {mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>
      </div>
    </div>
  );
};
