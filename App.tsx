
import React, { useState, useEffect, useRef } from 'react';
import { Calculator, ChevronRight, HelpCircle, FileText, PenLine, ArrowLeft, Sun, Moon, LogIn, LogOut, History } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { MemberSection } from './components/MemberSection';
import { ItemSection } from './components/ItemSection';
import { SummarySection } from './components/SummarySection';
import { HelpModal } from './components/HelpModal';
import { TableSummary } from './components/TableSummary';
import { LandingPage } from './components/LandingPage';
import { HistoryView } from './components/HistoryView';
import { ManualWizard } from './components/ManualWizard';
import { AuthView } from './components/AuthView';
import { Member, Item, BillConfig, SavedBill, Receipt } from './types';
import { calculateSummary, formatCurrency } from './utils/calculations';
import { useAuth } from './context/AuthContext';
import { fetchBillHistory, saveBillToCloud, saveAllBillsToCloud, deleteBillFromCloud } from './lib/billHistory';
import { getProfile } from './lib/profile';
import { fetchSavedGroups, createSavedGroup, type SavedGroupRow } from './lib/savedGroups';
import { ProfileModal } from './components/ProfileModal';
import { SaveGroupModal } from './components/SaveGroupModal';

type AppView = 'landing' | 'calculator' | 'history' | 'wizard' | 'auth';

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

  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  // CHANGED: Default manual receipt starts with 0% VAT/SC
  const [receipts, setReceipts] = useState<Receipt[]>([
      { id: 'manual-default', name: 'บิล / ร้านค้า', scRate: 0, vatRate: 0 }
  ]);

  const [config, setConfig] = useState<BillConfig>({
    vatRate: 0, // Changed from 7 to 0 to match new philosophy
    serviceChargeRate: 0,
    finalBillTotal: null,
    roundingMethod: 'payer'
  });
  
  const [billName, setBillName] = useState(() => {
    const date = new Date();
    const dateStr = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `บิล ${dateStr} ${timeStr}`;
  });

  const [showHelp, setShowHelp] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSaveGroupModal, setShowSaveGroupModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState<SavedBill[]>([]);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; prompt_pay_initial: string | null } | null>(null);
  const [savedGroups, setSavedGroups] = useState<SavedGroupRow[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

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

  // Load user profile when logged in (for "use my profile" in bill)
  useEffect(() => {
    if (!auth?.user?.id) {
      setUserProfile(null);
      return;
    }
    getProfile(auth.user.id).then((p) => {
      setUserProfile(p ? { display_name: p.display_name ?? null, prompt_pay_initial: p.prompt_pay_initial ?? null } : null);
    });
  }, [auth?.user?.id]);

  // Load saved groups when logged in
  useEffect(() => {
    if (!auth?.user?.id) {
      setSavedGroups([]);
      return;
    }
    fetchSavedGroups(auth.user.id).then(setSavedGroups);
  }, [auth?.user?.id]);

  // Load cloud history when user logs in and merge with local
  useEffect(() => {
    if (!auth?.isConfigured || !auth.user?.id || cloudSyncDone.current) return;
    cloudSyncDone.current = true;
    fetchBillHistory(auth.user.id).then((cloudBills) => {
      if (cloudBills.length === 0) return;
      setHistory((prev) => {
        const byId = new Map(prev.map((b) => [b.id, b]));
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

  const handleSaveGroup = async (name: string) => {
    if (!auth?.user || members.length === 0) return;
    const id = await createSavedGroup(auth.user.id, name, members);
    if (id) setSavedGroups((prev) => [{ id, user_id: auth!.user!.id, name, members, created_at: new Date().toISOString() }, ...prev]);
  };

  const handleLoadGroup = (group: SavedGroupRow) => {
    const newMembers = group.members.map((m, i) => ({
      ...m,
      id: crypto.randomUUID(),
      isPayer: i === 0,
    }));
    setMembers(newMembers);
  };

  const handleStart = () => setView('wizard');
  const handleFinishWizard = () => setView('calculator');

  const handleSaveToHistory = () => {
    const { summaries } = calculateSummary(members, items, receipts, config);
    const total = summaries.reduce((acc, curr) => acc + curr.totalConsumption, 0);
    const newBill: SavedBill = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        name: billName,
        members,
        items,
        receipts,
        config,
        total
    };
    setHistory(prev => [newBill, ...prev]);
    if (auth?.user) void saveBillToCloud(auth.user.id, newBill);
  };

  const handleLoadBill = (bill: SavedBill) => {
      setBillName(bill.name);
      setMembers(bill.members);
      setItems(bill.items.map(i => ({ ...i, quantity: i.quantity || 1 })));
      setConfig(bill.config);
      setReceipts(bill.receipts && bill.receipts.length > 0 
        ? bill.receipts 
        : [{ id: 'manual-default', name: 'บิล / ร้านค้า', scRate: 0, vatRate: 0 }]
      );
      if (!bill.receipts) {
          setItems(prevItems => prevItems.map(i => ({ ...i, receiptId: 'manual-default' })));
      }
      setView('calculator');
  };

  const handleDeleteBill = (id: string) => {
    setHistory(prev => prev.filter(b => b.id !== id));
    if (auth?.user) void deleteBillFromCloud(auth.user.id, id);
  };

  const { summaries } = calculateSummary(members, items, receipts, config);
  const grandTotal = summaries.reduce((acc, curr) => acc + curr.totalConsumption, 0);

  const handleAddMember = (name: string, promptPay?: string, bank?: string) => {
    const newMember: Member = {
      id: crypto.randomUUID(),
      name,
      isPayer: members.length === 0,
      promptPayId: promptPay,
      bank,
    };
    setMembers([...members, newMember]);
  };

  const handleRemoveMember = (id: string) => {
    const isRemovingPayer = members.find(m => m.id === id)?.isPayer;
    let newMembers = members.filter((m) => m.id !== id);
    if (isRemovingPayer && newMembers.length > 0) {
        newMembers[0] = { ...newMembers[0], isPayer: true };
    }
    setMembers(newMembers);
    setItems(items.map(item => ({
      ...item,
      assignedMemberIds: item.assignedMemberIds.filter(mId => mId !== id),
      paidBy: item.paidBy === id ? (newMembers[0]?.id || '') : item.paidBy
    })));
  };

  const handleUpdatePayerPromptPay = (promptPayId: string) => {
    setMembers(members.map(m => m.isPayer ? { ...m, promptPayId } : m));
  };

  const handleAddItem = (name: string, price: number, quantity: number, paidBy: string, receiptId: string, description?: string, assignedMemberIds?: string[]) => {
    const newItem: Item = {
      id: crypto.randomUUID(),
      name,
      price,
      quantity,
      assignedMemberIds: assignedMemberIds || [],
      paidBy,
      description,
      receiptId
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => setItems(items.filter((item) => item.id !== id));

  const handleUpdateItem = (id: string, name: string, price: number, paidBy: string, description?: string, excludeServiceCharge?: boolean, excludeVat?: boolean) => {
    setItems(items.map(item => item.id === id ? { ...item, name, price, paidBy, description, excludeServiceCharge, excludeVat } : item));
  };
  
  const handleUpdateItemAdjustments = (itemId: string, memberId: string, amount: number) => {
      setItems(items.map(item => {
          if (item.id === itemId) {
              const prevDeductions = item.fixedDeductions || [];
              const otherDeductions = prevDeductions.filter(d => d.memberId !== memberId);
              if (amount > 0) {
                  return { ...item, fixedDeductions: [...otherDeductions, { memberId, amount }] };
              } else {
                  return { ...item, fixedDeductions: otherDeductions };
              }
          }
          return item;
      }));
  };
  
  const handleUpdateReceiptName = (id: string, name: string) => setReceipts(prev => prev.map(r => r.id === id ? { ...r, name } : r));
  const handleUpdateReceiptRates = (id: string, scRate: number, vatRate: number) => setReceipts(prev => prev.map(r => r.id === id ? { ...r, scRate, vatRate } : r));
  const handleUpdateReceiptDiscount = (id: string, type: 'percent' | 'amount', value: number) => setReceipts(prev => prev.map(r => r.id === id ? { ...r, discountType: type, discountValue: value } : r));
  
  const handleUpdateReceiptSettings = (id: string, excludeSC: boolean, excludeVat: boolean) => {
    setReceipts(prev => prev.map(r => {
      if (r.id === id) {
        // CHANGED: If enabling (exclude = false) and current rate is 0, auto-set to standard rates.
        // If disabling (exclude = true), just toggle the flag.
        const newScRate = (!excludeSC && r.scRate === 0) ? 10 : r.scRate;
        const newVatRate = (!excludeVat && r.vatRate === 0) ? 7 : r.vatRate;
        
        return { 
          ...r, 
          excludeServiceCharge: excludeSC, 
          excludeVat: excludeVat, 
          scRate: newScRate, 
          vatRate: newVatRate,
          manualTotal: null 
        };
      }
      return r;
    }));
  };
  
  const handleUpdateReceiptTotal = (id: string, total: number | null) => setReceipts(prev => prev.map(r => r.id === id ? { ...r, manualTotal: total } : r));

  const handleAddReceipt = (name: string) => {
    // CHANGED: New receipts start with 0 rates
    const newReceipt: Receipt = { id: crypto.randomUUID(), name, scRate: 0, vatRate: 0, discountType: 'percent', discountValue: 0 };
    setReceipts(prev => [...prev, newReceipt]);
    return newReceipt.id;
  };

  const handleRemoveReceipt = (id: string) => {
      setReceipts(prev => prev.filter(r => r.id !== id));
      setItems(prev => prev.filter(i => i.receiptId !== id));
  };

  const handleToggleAssignment = (itemId: string, memberId: string, operation: 'add' | 'remove') => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (operation === 'add') {
           // Allow adding more than quantity to enable "Sharing Mode"
           return { ...item, assignedMemberIds: [...item.assignedMemberIds, memberId] };
        } else {
          const idx = item.assignedMemberIds.lastIndexOf(memberId);
          if (idx !== -1) {
            const newList = [...item.assignedMemberIds];
            newList.splice(idx, 1);
            return { ...item, assignedMemberIds: newList };
          }
        }
      }
      return item;
    }));
  };

  const handleAssignAll = (itemId: string) => {
      // Assign ALL members to the item to trigger "Sharing Mode" (Split equally)
      setItems(items.map(item => {
          if (item.id === itemId) {
              const allMemberIds = members.map(m => m.id);
              return { ...item, assignedMemberIds: allMemberIds };
          }
          return item;
      }));
  }

  const handleLoadMockData = () => {
    // 1. Create Members
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const id3 = crypto.randomUUID();
    const id4 = crypto.randomUUID();
    const id5 = crypto.randomUUID();

    const newMembers: Member[] = [
        { id: id1, name: 'นัท (คนจ่าย)', isPayer: true, promptPayId: '081-234-5678' },
        { id: id2, name: 'บีม', isPayer: false },
        { id: id3, name: 'เอก', isPayer: false },
        { id: id4, name: 'จอย', isPayer: false },
        { id: id5, name: 'ไหม', isPayer: false },
    ];

    // 2. Create Receipts (3 Scenarios)
    const r1 = crypto.randomUUID();
    const r2 = crypto.randomUUID();
    const r3 = crypto.randomUUID();

    const newReceipts: Receipt[] = [
        { id: r1, name: 'MK Suki (SC 10% + VAT 7%)', scRate: 10, vatRate: 7 },
        { id: r2, name: 'After You (No SC, จอยจ่าย)', scRate: 0, vatRate: 7 }, // No SC
        { id: r3, name: 'Rooftop Bar (ลด 10%)', scRate: 10, vatRate: 7, discountType: 'percent', discountValue: 10 } // Has discount
    ];

    // 3. Create Items
    const newItems: Item[] = [
        // Receipt 1: MK (Paid by Default/Nut)
        { id: crypto.randomUUID(), name: 'ชุดผักรวม', price: 450, quantity: 1, assignedMemberIds: [id1, id2, id3, id4, id5], paidBy: id1, receiptId: r1 },
        { id: crypto.randomUUID(), name: 'เป็ดย่างจานใหญ่', price: 350, quantity: 1, assignedMemberIds: [id1, id2, id3], paidBy: id1, receiptId: r1 },
        { id: crypto.randomUUID(), name: 'บะหมี่หยก', price: 50, quantity: 4, assignedMemberIds: [id1, id2, id3, id4], paidBy: id1, receiptId: r1 }, // 4 bowls
        
        // Receipt 2: Cafe (Paid by Joy)
        { id: crypto.randomUUID(), name: 'Shibuya Honey Toast', price: 285, quantity: 1, assignedMemberIds: [id4, id5], paidBy: id4, receiptId: r2 },
        { id: crypto.randomUUID(), name: 'Strawberry Kakigori', price: 325, quantity: 1, assignedMemberIds: [id1, id2, id3], paidBy: id4, receiptId: r2 },
        { id: crypto.randomUUID(), name: 'น้ำแร่', price: 40, quantity: 1, assignedMemberIds: [id1, id2, id3, id4, id5], paidBy: id4, receiptId: r2 },

        // Receipt 3: Bar (Discounted, Paid by Nut)
        { id: crypto.randomUUID(), name: 'Signature Cocktail', price: 380, quantity: 2, assignedMemberIds: [id2, id5], paidBy: id1, receiptId: r3 }, // 2 glasses
        { id: crypto.randomUUID(), name: 'Craft Beer Tower', price: 1200, quantity: 1, assignedMemberIds: [id1, id3, id4], paidBy: id1, receiptId: r3 },
        { id: crypto.randomUUID(), name: 'French Fries', price: 150, quantity: 1, assignedMemberIds: [id1, id2, id3, id4, id5], paidBy: id1, receiptId: r3 },
    ];

    setMembers(newMembers);
    setReceipts(newReceipts);
    setItems(newItems);
    setBillName('ปาร์ตี้วันเกิดเอก 🎂');
    setView('calculator');
  };

  const handleScanReceipts = async (files: File[], overridePayerId?: string) => {
    console.log('[Scan] Starting scan, files:', files.length);
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setScanError('API Key ไม่ถูกต้อง กรุณาตั้งค่า GEMINI_API_KEY ใหม่');
      return;
    }
    setIsScanning(true);
    setScanError(null);
    let targetPayerId = overridePayerId || members.find(m => m.isPayer)?.id || members[0]?.id || '';
    try {
      const ai = new GoogleGenAI({ apiKey });
      const allNewItems: Item[] = [];
      const newReceipts: Receipt[] = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const receiptId = crypto.randomUUID();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: { 
              parts: [
                { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } }, 
                { text: "Extract food items with quantity and price. \n\nIMPORTANT RULES for PRICE:\n1. The receipt usually shows the LINE TOTAL (Quantity * Unit Price) on the far right.\n2. You must return the **UNIT PRICE** (Price for 1 item).\n3. If the receipt shows Quantity: 2 and Amount: 100, the Unit Price is 50. Return 50.\n4. Do NOT return the Line Total as the price.\n\nIMPORTANT rules for VAT/Service Charge:\n1. CHECK THE FOOTER CAREFULLY. If the receipt says 'NET PRICE', 'NO VAT', 'VAT 0%', or 'TOTAL' is the same as 'SUBTOTAL', then vatRate MUST be 0.\n2. If not explicitly 0% or Net Price, default to 7 for VAT. Return exact numbers." }
              ] 
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        price: { type: Type.NUMBER, description: "UNIT PRICE per item. Do not return the line total." },
                        quantity: { type: Type.NUMBER }
                      }
                    }
                  },
                  grandTotal: { type: Type.NUMBER },
                  vatRate: { type: Type.NUMBER, description: "Percentage of VAT. 0 if Net Price or not found." },
                  serviceChargeRate: { type: Type.NUMBER, description: "Percentage of Service Charge. 0 if not found." }
                }
              }
            }
          });
          console.log('[Scan] Raw response:', response.text?.slice(0, 200));
          const data = JSON.parse(response.text || '{}');
          
          // Use AI detected rates, default to standard if missing but not explicitly 0 (though AI should return 0 for Net)
          const detectedVat = data.vatRate !== undefined ? data.vatRate : 7;
          const detectedSc = data.serviceChargeRate !== undefined ? data.serviceChargeRate : 0;
          
          newReceipts.push({ 
            id: receiptId, 
            name: `Scan ${i+1}`, 
            scRate: detectedSc, 
            vatRate: detectedVat, 
            excludeVat: detectedVat === 0,
            excludeServiceCharge: detectedSc === 0,
            manualTotal: data.grandTotal 
          });

          if (Array.isArray(data.items)) {
            // Filter out items with 0 price (noise)
            const validItems = data.items.filter((item: any) => item.price > 0);
            
            allNewItems.push(...validItems.map((item: any) => ({
              id: crypto.randomUUID(),
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              assignedMemberIds: [],
              paidBy: targetPayerId,
              receiptId: receiptId
            })));
          }
      }
      setReceipts(prev => {
        // If the only receipt is the default one AND it has no items, replace it with the new scans.
        if (prev.length === 1 && prev[0].id === 'manual-default' && items.length === 0) {
            return [...newReceipts];
        }
        return [...prev, ...newReceipts];
      });
      setItems(prev => [...prev, ...allNewItems]);
    } catch (error) {
      console.error('[Scan] Error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Scan] Error message:', msg);
      const isKeyError = msg.includes('API_KEY') || msg.includes('401') || msg.includes('403') || msg.includes('api key') || msg.includes('API key') || msg.includes('authentication');
      setScanError(isKeyError
        ? 'API Key ไม่ถูกต้อง กรุณาตั้งค่า GEMINI_API_KEY ใหม่'
        : `สแกนไม่สำเร็จ: ${msg.slice(0, 100)}`);
    } finally { setIsScanning(false); }
  };

  const scrollToSummary = () => document.getElementById('summary-section')?.scrollIntoView({ behavior: 'smooth' });

  if (auth?.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400 font-medium">กำลังโหลด...</div>
      </div>
    );
  }

  if (view === 'auth' && auth?.isConfigured) return <AuthView key={authInitialMode} initialMode={authInitialMode} onBack={() => setView('landing')} onSuccess={() => setView('landing')} signIn={auth.signIn} signUp={auth.signUp} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />;
  if (view === 'landing') return <><LandingPage onStart={handleStart} onShowHelp={() => setShowHelp(true)} onOpenLogin={auth?.isConfigured ? () => { setAuthInitialMode('login'); setView('auth'); } : undefined} onOpenRegister={auth?.isConfigured ? () => { setAuthInitialMode('register'); setView('auth'); } : undefined} authUser={auth?.user ?? null} onSignOut={auth?.signOut} onOpenProfile={auth?.user ? () => setShowProfileModal(true) : undefined} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} /><HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} /><ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onSaved={() => auth?.user?.id && getProfile(auth.user.id).then((p) => p && setUserProfile({ display_name: p.display_name ?? null, prompt_pay_initial: p.prompt_pay_initial ?? null }))} userId={auth?.user?.id ?? ''} isDarkMode={isDarkMode} /></>;
  if (view === 'history') return <HistoryView history={history} onBack={() => setView(members.length > 0 ? 'calculator' : 'landing')} onLoadBill={handleLoadBill} onDeleteBill={handleDeleteBill} onImportFromDevice={auth?.user ? handleImportFromDevice : undefined} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />;
  if (view === 'wizard') return <ManualWizard onFinish={handleFinishWizard} onBack={() => setView('landing')} billName={billName} setBillName={setBillName} members={members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} userProfile={userProfile} savedGroups={savedGroups} onLoadGroup={handleLoadGroup} items={items} receipts={receipts} config={config} onAddItem={handleAddItem} onRemoveItem={handleRemoveItem} onUpdateItem={handleUpdateItem} onUpdateReceiptName={handleUpdateReceiptName} onUpdateReceiptSettings={handleUpdateReceiptSettings} onUpdateReceiptRates={handleUpdateReceiptRates} onUpdateReceiptDiscount={handleUpdateReceiptDiscount} onUpdateReceiptTotal={handleUpdateReceiptTotal} onRemoveReceipt={handleRemoveReceipt} onUpdatePayerPromptPay={handleUpdatePayerPromptPay} onAddReceipt={handleAddReceipt} onToggleAssignment={handleToggleAssignment} onAssignAll={handleAssignAll} onScanReceipt={handleScanReceipts} isScanning={isScanning} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 pb-40">
      <header className="bg-teal-700 dark:bg-teal-900 text-white p-4 shadow-md sticky top-0 z-20 transition-colors">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('landing')} className="p-1 hover:bg-teal-600 dark:hover:bg-teal-800 rounded-lg transition-colors -ml-2"><ArrowLeft size={24} /></button>
            <h1 className="text-xl font-bold tracking-tight text-white">HanTao</h1>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setView('history')} className="p-2 text-teal-100 hover:text-white bg-teal-800/40 rounded-full transition-all" title="ประวัติบิล"><History size={20} /></button>
            {auth?.user && (
              <>
                <button onClick={() => setShowProfileModal(true)} className="text-teal-100 text-sm max-w-[120px] truncate hover:text-white" title={auth.user.email ?? ''}>{auth.user.email}</button>
              </>
            )}
            <button onClick={toggleTheme} className="p-2 text-teal-100 hover:text-white bg-teal-800/40 rounded-full transition-all">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
            <button onClick={() => setShowHelp(true)} className="p-1.5 text-teal-100 hover:text-white"><HelpCircle size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        <section className="animate-fade-in-up"><div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex items-center gap-3 transition-colors"><div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-xl text-orange-600 dark:text-orange-400 shadow-sm"><FileText size={22} /></div><div className="flex-1 relative group"><label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mb-0.5">ชื่อบิล</label><input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} className="w-full font-bold text-gray-800 dark:text-white text-lg bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-slate-700 focus:border-teal-500 focus:outline-none py-0.5 transition-all" placeholder="ตั้งชื่อบิล..." /></div></div></section>
        <section className="animate-fade-in-up">
          <MemberSection members={members} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />
          {auth?.user && members.length > 0 && (
            <button type="button" onClick={() => setShowSaveGroupModal(true)} className="mt-3 text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline">
              บันทึกกลุ่มเพื่อน ({members.length} คน)
            </button>
          )}
        </section>
        <section className="animate-fade-in-up"><ItemSection items={items} members={members} receipts={receipts} config={config} onAddItem={handleAddItem} onRemoveItem={handleRemoveItem} onUpdateItem={handleUpdateItem} onUpdateReceiptName={handleUpdateReceiptName} onUpdateReceiptSettings={handleUpdateReceiptSettings} onUpdateReceiptRates={handleUpdateReceiptRates} onUpdateReceiptDiscount={handleUpdateReceiptDiscount} onUpdateReceiptTotal={handleUpdateReceiptTotal} onRemoveReceipt={handleRemoveReceipt} onAddReceipt={handleAddReceipt} onToggleAssignment={handleToggleAssignment} onAssignAll={handleAssignAll} onScanReceipt={handleScanReceipts} isScanning={isScanning} onUpdateItemAdjustments={handleUpdateItemAdjustments} /></section>
        <section id="summary-section" className="animate-fade-in-up"><SummarySection members={members} items={items} receipts={receipts} config={config} setConfig={setConfig} billName={billName} onViewTable={() => setShowTable(true)} onUpdatePromptPay={handleUpdatePayerPromptPay} onSaveHistory={handleSaveToHistory} /></section>
      </main>
      {scanError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3 animate-fade-in-up">
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="ml-2 text-red-200 hover:text-white">✕</button>
        </div>
      )}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onSaved={() => auth?.user?.id && getProfile(auth.user.id).then((p) => p && setUserProfile({ display_name: p.display_name ?? null, prompt_pay_initial: p.prompt_pay_initial ?? null }))} userId={auth?.user?.id ?? ''} isDarkMode={isDarkMode} />
      <SaveGroupModal isOpen={showSaveGroupModal} onClose={() => setShowSaveGroupModal(false)} onSave={handleSaveGroup} memberCount={members.length} isDarkMode={isDarkMode} />
      <TableSummary isOpen={showTable} onClose={() => setShowTable(false)} members={members} items={items} config={config} billName={billName} receipts={receipts} />
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 p-5 z-30 pb-safe transition-all"><div className="max-w-2xl mx-auto flex justify-between items-center gap-4"><div><p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1">ยอดรวมทั้งหมด</p><p className="text-3xl font-black text-teal-400 leading-none">{formatCurrency(grandTotal)}</p></div><button onClick={scrollToSummary} className="bg-teal-600 hover:bg-teal-500 px-7 py-4 rounded-[1.25rem] font-black text-xl active:scale-90 transition-all flex items-center gap-2">ดูสรุป <ChevronRight size={22} strokeWidth={3} /></button></div></div>
    </div>
  );
};

export default App;
