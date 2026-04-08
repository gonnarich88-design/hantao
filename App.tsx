
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { HelpModal } from './components/HelpModal';
import { LandingPage } from './components/LandingPage';
import { HistoryView } from './components/HistoryView';
import { AuthView } from './components/AuthView';
import { WizardView } from './components/WizardView';
import { MainTabView } from './components/MainTabView';
import { ScannedItem } from './components/tabs/ScanReviewSheet';
import { ProfileModal } from './components/ProfileModal';
import { Member, Item, Receipt, SavedBill, RoundingMethod } from './types';
import { calculateSummary } from './utils/calculations';
import { useAuth } from './context/AuthContext';
import { fetchBillHistory, saveBillToCloud, saveAllBillsToCloud, deleteBillFromCloud } from './lib/billHistory';
import { getProfile } from './lib/profile';

type AppView = 'landing' | 'wizard' | 'calculator' | 'history' | 'auth';

const App: React.FC = () => {
  const auth = useAuth();
  const [view, setView] = useState<AppView>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const cloudSyncDone = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('easySplit_theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('easySplit_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('easySplit_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Core session state
  const [payerId, setPayerId] = useState<string>('');
  const [roundingMethod] = useState<RoundingMethod>('payer');
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([
    { id: 'default', name: 'บิล', scRate: 0, vatRate: 0 }
  ]);
  const [billName, setBillName] = useState(() => {
    const date = new Date();
    return `บิล ${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
  });

  const [showHelp, setShowHelp] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; prompt_pay_initial: string | null } | null>(null);

  // Persist history to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('easySplit_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error("Failed to parse history"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('easySplit_history', JSON.stringify(history));
  }, [history]);

  // Reset cloud sync flag when user logs out
  useEffect(() => {
    if (!auth?.user) cloudSyncDone.current = false;
  }, [auth?.user]);

  // Load user profile when logged in
  useEffect(() => {
    if (!auth?.user?.id) { setUserProfile(null); return; }
    getProfile(auth.user.id).then((p) => {
      setUserProfile(p ? { display_name: p.display_name ?? null, prompt_pay_initial: p.prompt_pay_initial ?? null } : null);
    });
  }, [auth?.user?.id]);

  // Load cloud history when user logs in and merge with local
  useEffect(() => {
    if (!auth?.isConfigured || !auth.user?.id || cloudSyncDone.current) return;
    cloudSyncDone.current = true;
    fetchBillHistory(auth.user.id).then((cloudBills) => {
      if (cloudBills.length === 0) return;
      setHistory((prev) => {
        const byId = new Map<string, SavedBill>(prev.map((b) => [b.id, b]));
        cloudBills.forEach((b) => byId.set(b.id, b));
        return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
      });
    });
  }, [auth?.isConfigured, auth?.user?.id]);

  const handleImportFromDevice = async () => {
    if (!auth?.user) return;
    await saveAllBillsToCloud(auth.user.id, history);
    const cloud = await fetchBillHistory(auth.user.id);
    setHistory(cloud);
  };

  // Wizard complete: set members, payer, reset items/receipts
  const handleWizardComplete = (newMembers: Member[], newPayerId: string) => {
    setMembers(newMembers);
    setPayerId(newPayerId);
    setItems([]);
    setReceipts([{ id: crypto.randomUUID(), name: 'บิล', scRate: 0, vatRate: 0 }]);
    setBillName(`บิล ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`);
    setView('calculator');
  };

  // Item handlers
  const handleAddItem = (name: string, price: number, quantity: number, assignedMemberIds: string[], receiptId: string) => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), name, price, quantity, assignedMemberIds, receiptId }]);
  };

  const handleAddScannedItems = (scannedItems: ScannedItem[], receiptId: string) => {
    const newItems: Item[] = scannedItems.map(si => ({
      id: crypto.randomUUID(),
      name: si.name,
      price: si.price,
      quantity: si.quantity,
      assignedMemberIds: si.assignedMemberIds,
      receiptId,
    }));
    setItems(prev => [...prev, ...newItems]);
  };

  const handleUpdateItem = (id: string, updates: Partial<Item>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // Receipt handlers
  const handleAddReceipt = (name: string) => {
    setReceipts(prev => [...prev, { id: crypto.randomUUID(), name, scRate: 0, vatRate: 0 }]);
  };

  const handleUpdateReceipt = (id: string, updates: Partial<Receipt>) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleRemoveReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
    setItems(prev => prev.filter(i => i.receiptId !== id));
  };

  // Save to history
  const handleSaveToHistory = () => {
    const { summaries } = calculateSummary(members, items, receipts, payerId, roundingMethod);
    const total = summaries.reduce((acc, s) => acc + s.totalConsumption, 0);
    const newBill: SavedBill = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name: billName,
      payerId,
      roundingMethod,
      members,
      items,
      receipts,
      total,
    };
    setHistory(prev => [newBill, ...prev]);
    if (auth?.user) void saveBillToCloud(auth.user.id, newBill);
  };

  const handleLoadBill = (bill: SavedBill) => {
    setBillName(bill.name);
    setMembers(bill.members);
    setItems(bill.items.map(i => ({ ...i, quantity: i.quantity || 1 })));
    setReceipts(bill.receipts && bill.receipts.length > 0
      ? bill.receipts
      : [{ id: 'default', name: 'บิล', scRate: 0, vatRate: 0 }]
    );
    setPayerId(bill.payerId ?? bill.members[0]?.id ?? '');
    setView('calculator');
  };

  const handleDeleteBill = (id: string) => {
    setHistory(prev => prev.filter(b => b.id !== id));
    if (auth?.user) void deleteBillFromCloud(auth.user.id, id);
  };

  // Gemini scan
  const handleScanFiles = async (files: File[]): Promise<ScannedItem[]> => {
    const apiKey = (window as any).__APP_CONFIG__?.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return [];
    setIsScanning(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const allItems: ScannedItem[] = [];
      for (const file of files) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } },
              { text: "Extract food items with quantity and UNIT price (not line total). Return JSON with items array (name, price, quantity), vatRate, serviceChargeRate." }
            ]
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      price: { type: Type.NUMBER },
                      quantity: { type: Type.NUMBER }
                    }
                  }
                },
                vatRate: { type: Type.NUMBER },
                serviceChargeRate: { type: Type.NUMBER }
              }
            }
          }
        });
        const data = JSON.parse(response.text || '{}');
        if (Array.isArray(data.items)) {
          allItems.push(...data.items
            .filter((i: any) => i.price > 0)
            .map((i: any) => ({
              id: crypto.randomUUID(),
              name: i.name,
              price: i.price,
              quantity: i.quantity || 1,
              assignedMemberIds: [],
            }))
          );
        }
      }
      return allItems;
    } catch (err) {
      console.error('[Scan] Error:', err);
      return [];
    } finally {
      setIsScanning(false);
    }
  };

  if (auth?.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400 font-medium">กำลังโหลด...</div>
      </div>
    );
  }

  if (view === 'auth' && auth?.isConfigured) {
    return <AuthView key={authInitialMode} initialMode={authInitialMode} onBack={() => setView('landing')} onSuccess={() => setView('landing')} signIn={auth.signIn} signUp={auth.signUp} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />;
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onStart={() => setView('wizard')}
          onShowHelp={() => setShowHelp(true)}
          onOpenLogin={auth?.isConfigured ? () => { setAuthInitialMode('login'); setView('auth'); } : undefined}
          onOpenRegister={auth?.isConfigured ? () => { setAuthInitialMode('register'); setView('auth'); } : undefined}
          authUser={auth?.user ?? null}
          onSignOut={auth?.signOut}
          onOpenProfile={auth?.user ? () => setShowProfileModal(true) : undefined}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSaved={() => auth?.user?.id && getProfile(auth.user.id).then((p) => p && setUserProfile({ display_name: p.display_name ?? null, prompt_pay_initial: p.prompt_pay_initial ?? null }))}
          userId={auth?.user?.id ?? ''}
          isDarkMode={isDarkMode}
        />
      </>
    );
  }

  if (view === 'history') {
    return (
      <HistoryView
        history={history}
        onBack={() => setView(members.length > 0 ? 'calculator' : 'landing')}
        onLoadBill={handleLoadBill}
        onDeleteBill={handleDeleteBill}
        onImportFromDevice={auth?.user ? handleImportFromDevice : undefined}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (view === 'wizard') {
    return <WizardView onComplete={handleWizardComplete} />;
  }

  if (view === 'calculator') {
    return (
      <MainTabView
        members={members}
        items={items}
        receipts={receipts}
        payerId={payerId}
        roundingMethod={roundingMethod}
        billName={billName}
        onChangePayerId={setPayerId}
        onAddItem={handleAddItem}
        onAddScannedItems={handleAddScannedItems}
        onRemoveItem={handleRemoveItem}
        onUpdateItem={handleUpdateItem}
        onAddReceipt={handleAddReceipt}
        onUpdateReceipt={handleUpdateReceipt}
        onRemoveReceipt={handleRemoveReceipt}
        onScanFiles={handleScanFiles}
        onSave={handleSaveToHistory}
        isScanning={isScanning}
      />
    );
  }

  return null;
};

export default App;
