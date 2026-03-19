
import React from 'react';
import { Users, Receipt, ArrowRight, HelpCircle, Sun, Moon, LogIn, UserPlus, LogOut } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface LandingPageProps {
  onStart: () => void;
  onShowHelp: () => void;
  onLoadDemo?: () => void;
  onOpenAuth?: () => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  authUser?: User | null;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStart,
  onShowHelp,
  onLoadDemo,
  onOpenAuth,
  onOpenLogin,
  onOpenRegister,
  authUser,
  onSignOut,
  onOpenProfile,
  isDarkMode,
  onToggleTheme
}) => {
  const dark = isDarkMode !== false;
  const showAuthButtons = !authUser && (onOpenLogin ?? onOpenRegister ?? onOpenAuth);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-5 py-6 relative overflow-hidden transition-colors duration-500 pb-safe ${dark ? 'bg-[#0f172a]' : 'bg-gradient-to-b from-slate-50 to-teal-50/50'}`}>
      {/* Gradient background */}
      {dark ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-teal-950/40 to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(20,184,166,0.25),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,rgba(16,185,129,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_20%_90%,rgba(6,182,212,0.1),transparent)]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,rgba(16,185,129,0.08),transparent)]" />
        </>
      )}

      {/* Header: compact */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 pt-4 pb-2 safe-area-inset-top">
        <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>HanTao</h2>
        <div className="flex items-center gap-2">
          {authUser && (
            <>
              {onOpenProfile && (
                <button onClick={onOpenProfile} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium min-h-[44px] ${dark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-white/80 border-slate-200 text-slate-600'}`} title="โปรไฟล์">
                  โปรไฟล์
                </button>
              )}
              {onSignOut && (
                <button onClick={onSignOut} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium min-h-[44px] ${dark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-white/80 border-slate-200 text-slate-600'}`} title={authUser.email ?? ''}>
                  <LogOut size={16} /> ออกจากระบบ
                </button>
              )}
            </>
          )}
          {onToggleTheme && (
            <button onClick={onToggleTheme} className={`p-2.5 rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center ${dark ? 'bg-white/5 border-white/10 text-white/80' : 'bg-white/80 border-slate-200 text-slate-600'}`} title={isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด'}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center pt-4">
        {/* Hero: short */}
        <div className="mb-6" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
          <div className="relative inline-flex mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-xl -rotate-3">
              <Receipt size={40} className="text-white" strokeWidth={2} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center rotate-6 ${dark ? 'ring-2 ring-slate-900/20' : 'ring-2 ring-white/50'}`}>
              <Users size={22} className="text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className={`text-3xl font-black tracking-tight mb-1 ${dark ? 'text-white' : 'text-slate-800'}`}>HanTao</h1>
          <p className={`text-sm ${dark ? 'text-teal-200/90' : 'text-teal-700/90'}`}>หารค่าอาหาร... ง่ายนิดเดียว</p>
        </div>

        {/* CTA block: Guest + Login + Register */}
        <div className="w-full space-y-3 max-w-sm">
          {/* 1. Guest - primary */}
          <button
            onClick={onStart}
            className={`w-full group flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 active:scale-[0.98] min-h-[52px] ${dark ? 'bg-teal-500/20 hover:bg-teal-500/30 border-teal-400/40' : 'bg-white hover:bg-teal-50 border-teal-200 shadow-lg shadow-slate-200/50'}`}
            style={{ animation: 'fadeInUp 0.5s ease-out 0.1s both' }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Receipt size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-lg ${dark ? 'text-white' : 'text-slate-800'}`}>Guest</div>
              <div className={`text-xs mt-0.5 ${dark ? 'text-teal-200/90' : 'text-slate-500'}`}>ไม่ต้องสมัคร</div>
            </div>
            <ArrowRight size={20} className={`flex-shrink-0 ${dark ? 'text-teal-300' : 'text-teal-600'}`} />
          </button>

          {/* 2. เข้าสู่ระบบ - secondary */}
          {showAuthButtons && (onOpenLogin ?? onOpenAuth) && (
            <button
              onClick={onOpenLogin ?? onOpenAuth}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border min-h-[48px] font-medium text-sm transition-all active:scale-[0.98] ${dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'}`}
              style={{ animation: 'fadeInUp 0.5s ease-out 0.15s both' }}
            >
              <LogIn size={18} /> เข้าสู่ระบบ
            </button>
          )}

          {/* 3. สมัครสมาชิก - secondary */}
          {showAuthButtons && onOpenRegister && (
            <button
              onClick={onOpenRegister}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border min-h-[48px] font-medium text-sm transition-all active:scale-[0.98] ${dark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'}`}
              style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}
            >
              <UserPlus size={18} /> สมัครสมาชิก
            </button>
          )}
        </div>

        {/* Help link */}
        <button
          onClick={onShowHelp}
          className={`inline-flex items-center gap-2 text-sm font-medium py-3 mt-6 transition-colors ${dark ? 'text-teal-300/80 hover:text-teal-200' : 'text-teal-600 hover:text-teal-700'}`}
          style={{ animation: 'fadeInUp 0.5s ease-out 0.25s both' }}
        >
          <HelpCircle size={16} />
          วิธีใช้งาน
        </button>

        <p className={`text-[10px] mt-6 font-medium tracking-wide ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          v1.3.0 • HanTao Team
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
        .safe-area-inset-top { padding-top: env(safe-area-inset-top); }
      `}</style>
    </div>
  );
};
