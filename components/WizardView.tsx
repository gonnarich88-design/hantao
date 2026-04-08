import React, { useState } from 'react'
import { Plus, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { Member } from '../types'

const BANK_OPTIONS = [
  'กสิกรไทย', 'กรุงไทย', 'กรุงเทพ', 'ไทยพาณิชย์',
  'กรุงศรีอยุธยา', 'ทหารไทยธนชาต', 'ออมสิน', 'PromptPay'
]

interface WizardViewProps {
  onComplete: (members: Member[], payerId: string) => void
}

export const WizardView: React.FC<WizardViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [members, setMembers] = useState<Member[]>([])
  const [name, setName] = useState('')
  const [bank, setBank] = useState('')
  const [account, setAccount] = useState('')
  const [selectedPayerId, setSelectedPayerId] = useState('')
  const [nameError, setNameError] = useState('')

  const handleAddMember = () => {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('กรุณากรอกชื่อ'); return }
    if (members.find(m => m.name === trimmed)) { setNameError('ชื่อซ้ำ'); return }
    setNameError('')
    const newMember: Member = {
      id: crypto.randomUUID(),
      name: trimmed,
      bank: bank || undefined,
      promptPayId: account.trim() || undefined,
    }
    setMembers(prev => [...prev, newMember])
    setName('')
    setBank('')
    setAccount('')
  }

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    if (selectedPayerId === id) setSelectedPayerId('')
  }

  const handleGoToStep2 = () => {
    if (members.length < 2) return
    if (!selectedPayerId && members.length > 0) setSelectedPayerId(members[0].id)
    setStep(2)
  }

  const handleFinish = () => {
    const payerId = selectedPayerId || members[0].id
    onComplete(members, payerId)
  }

  const progress = step === 1 ? 'w-1/2' : 'w-full'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mb-6">
          <div className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${progress}`} />
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-2xl font-bold mb-1 dark:text-white">ใครไปด้วยกัน? 👥</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">เพิ่มชื่อคนที่ร่วมหารบิลนี้</p>

            {/* Add form */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-4 space-y-2">
              <input
                className="w-full border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="ชื่อ *"
                value={name}
                onChange={e => { setName(e.target.value); setNameError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
              />
              {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-400 focus:outline-none"
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                >
                  <option value="">🏦 ธนาคาร (ไม่บังคับ)</option>
                  {BANK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <input
                  className="flex-[2] border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm dark:bg-slate-900 dark:text-white focus:outline-none"
                  placeholder="เลขบัญชี / พร้อมเพย์"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddMember}
                className="w-full bg-indigo-500 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1 hover:bg-indigo-600 active:scale-95 transition-all"
              >
                <Plus size={16} /> เพิ่ม
              </button>
            </div>

            {/* Member list */}
            <div className="space-y-2 mb-6">
              {members.map(m => (
                <div key={m.id} className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-indigo-800 dark:text-indigo-300">{m.name}</p>
                    {(m.bank || m.promptPayId) && (
                      <p className="text-xs text-indigo-400 mt-0.5">
                        {m.bank && `💳 ${m.bank}`}{m.bank && m.promptPayId && ' · '}{m.promptPayId}
                      </p>
                    )}
                    {!m.bank && !m.promptPayId && (
                      <p className="text-xs text-gray-400">ไม่มีข้อมูลรับโอน</p>
                    )}
                  </div>
                  <button onClick={() => handleRemoveMember(m.id)} className="text-indigo-300 hover:text-red-400 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleGoToStep2}
              disabled={members.length < 2}
              className="w-full bg-indigo-500 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ถัดไป <ChevronRight size={18} />
            </button>
            {members.length < 2 && (
              <p className="text-center text-xs text-gray-400 mt-2">ต้องมีอย่างน้อย 2 คน</p>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 mb-4 hover:text-gray-600">
              <ChevronLeft size={16} /> ย้อนกลับ
            </button>
            <h1 className="text-2xl font-bold mb-1 dark:text-white">ใครออกเงินจ่ายก่อน? 💳</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">คนที่ควักเงินจ่ายให้ร้าน — คนอื่นจะโอนเงินคืนให้เขา</p>

            <div className="space-y-2 mb-6">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedPayerId(m.id)}
                  className={`w-full text-left border-2 rounded-xl px-4 py-3 flex items-center justify-between transition-all ${
                    selectedPayerId === m.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-100 dark:border-slate-700 hover:border-indigo-200'
                  }`}
                >
                  <div>
                    <p className={`font-semibold text-sm ${selectedPayerId === m.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-300'}`}>{m.name}</p>
                    {(m.bank || m.promptPayId) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.bank && `💳 ${m.bank}`}{m.bank && m.promptPayId && ' · '}{m.promptPayId}
                      </p>
                    )}
                    {!m.bank && !m.promptPayId && <p className="text-xs text-gray-300">ไม่มีข้อมูลรับโอน</p>}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPayerId === m.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-200 dark:border-slate-600'
                  }`}>
                    {selectedPayerId === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={!selectedPayerId}
              className="w-full bg-indigo-500 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              เริ่มใส่รายการ 🚀
            </button>
          </>
        )}
      </div>
    </div>
  )
}
