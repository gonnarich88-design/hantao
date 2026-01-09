
import React from 'react';
import { Calculator, Users, Receipt, ArrowRight, Sparkles, HelpCircle, Beaker, Sun, Moon, Percent, Split, Coins } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onShowHelp: () => void;
  onLoadDemo: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onStart, 
  onShowHelp, 
  onLoadDemo,
  isDarkMode,
  onToggleTheme
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 dark:from-slate-900 dark:via-slate-950 dark:to-teal-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Top Header Actions */}
      <div className="absolute top-6 right-6 z-20 flex gap-2">
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme}
            className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 text-white transition-all active:scale-95 shadow-lg"
            title={isDarkMode ? "เปิดโหมดสว่าง" : "เปิดโหมดมืด"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-8 animate-fade-in-up">
        
        {/* Logo Section - NEW DESIGN */}
        <div className="relative mb-4">
            {/* Main App Icon Shape */}
            <div className="bg-white dark:bg-slate-800 p-7 rounded-[2.5rem] shadow-2xl shadow-teal-900/40 transform -rotate-3 border-[6px] border-white/20 backdrop-blur-sm relative z-10">
                <Receipt size={64} className="text-teal-600 dark:text-teal-400" strokeWidth={2} />
            </div>
            
            {/* Floating Badge (Users/Split) */}
            <div className="absolute -bottom-4 -right-4 bg-emerald-500 text-white p-3.5 rounded-2xl shadow-lg border-4 border-emerald-600/30 transform rotate-6 z-20">
                <Users size={28} strokeWidth={2.5} />
            </div>

            {/* Decorative Sparkle */}
            <div className="absolute -top-6 -right-6 text-yellow-300 animate-pulse z-0 opacity-80">
                <Sparkles size={40} />
            </div>
        </div>
        
        <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 drop-shadow-sm">
                HanTao
            </h1>
            <p className="text-teal-100 dark:text-teal-400 text-lg font-medium">
                หารค่าอาหาร... ง่ายนิดเดียว
            </p>
        </div>

        {/* Action Cards */}
        <div className="w-full space-y-4">
            
            {/* Single Main Start Button */}
            <button 
                onClick={onStart}
                className="w-full bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 text-teal-900 dark:text-white p-2 rounded-[2rem] shadow-2xl transition-all active:scale-95 flex items-center pr-6 group border-4 border-teal-50/20 dark:border-slate-800/50 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-teal-100/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="bg-gradient-to-br from-teal-400 to-teal-600 w-20 h-20 rounded-[1.5rem] flex items-center justify-center mr-5 shadow-lg group-hover:scale-105 transition-transform">
                    <Sparkles size={36} className="text-white" />
                </div>
                
                <div className="flex-1 text-left py-2">
                    <div className="font-black text-xl text-slate-800 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        เริ่มจดบิลใหม่
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                        รองรับพิมพ์เอง & สแกนบิล
                    </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-full group-hover:bg-teal-200 dark:group-hover:bg-teal-900 group-hover:text-teal-800 dark:group-hover:text-teal-300 transition-colors shadow-sm">
                    <ArrowRight size={20} className="text-gray-400 group-hover:text-teal-800 dark:group-hover:text-teal-300" />
                </div>
            </button>

        </div>

        {/* Links */}
        <div className="flex flex-col items-center gap-4">
            <button 
                onClick={onShowHelp}
                className="flex items-center gap-2 text-teal-100/80 hover:text-white text-sm font-medium transition-colors py-2"
            >
                <HelpCircle size={16} />
                วิธีใช้งาน
            </button>
        </div>

        {/* Footer Features */}
        <div className="grid grid-cols-3 gap-4 w-full pt-8 border-t border-white/10">
            <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors">
                <Receipt size={22} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">คำนวณเป๊ะ</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors">
                <Users size={22} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">หารได้ยกแก๊ง</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-teal-100/80 hover:text-white transition-colors">
                <Percent size={22} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">รองรับ VAT & SC</span>
            </div>
        </div>

        <div className="text-[10px] text-teal-200/50 mt-4 tracking-wide font-medium">
            v1.3.0 • Crafted by HanTao Team
        </div>
      </div>
    </div>
  );
};
