
export interface Member {
  id: string;
  name: string;
  isPayer: boolean; // Acts as "Default Payer"
  promptPayId?: string;
}

export interface Receipt {
  id: string;
  name: string;
  scRate?: number; 
  vatRate?: number; 
  excludeServiceCharge?: boolean; 
  excludeVat?: boolean; 
  manualTotal?: number | null; 
  discountType?: 'percent' | 'amount';
  discountValue?: number;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  quantity: number; // New: Total units of this item
  assignedMemberIds: string[]; // This will store member IDs for each unit (length = quantity assigned)
  paidBy: string; 
  description?: string;
  excludeServiceCharge?: boolean; 
  excludeVat?: boolean; 
  receiptId?: string;
  // NEW: Store fixed amount deductions (e.g., "I'll pay 100 baht")
  fixedDeductions?: { memberId: string; amount: number }[]; 
}

export type RoundingMethod = 'payer' | 'split';

export interface BillConfig {
  vatRate: number;
  serviceChargeRate: number;
  manualServiceChargeAmount?: number | null;
  manualVatAmount?: number | null;
  finalBillTotal?: number | null;
  roundingMethod?: RoundingMethod;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  baseConsumption: number;
  serviceChargeShare: number;
  vatShare: number;
  totalConsumption: number;
  totalPaid: number;
  netBalance: number;
  items: { name: string; share: number }[];
}

export interface SavedBill {
  id: string;
  timestamp: number;
  name: string;
  members: Member[];
  items: Item[];
  receipts: Receipt[];
  config: BillConfig;
  total: number;
}
