import { supabase, isSupabaseConfigured } from './supabase';
import type { SavedBill } from '../types';

export async function fetchBillHistory(userId: string): Promise<SavedBill[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('bill_history')
    .select('payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchBillHistory', error);
    return [];
  }
  return (data ?? []).map((row) => row.payload as SavedBill);
}

export async function saveBillToCloud(userId: string, bill: SavedBill): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('bill_history').upsert(
    {
      user_id: userId,
      bill_id: bill.id,
      name: bill.name,
      total: bill.total,
      payload: bill,
    },
    { onConflict: 'user_id,bill_id' }
  );
  if (error) {
    console.error('saveBillToCloud', error);
    return false;
  }
  return true;
}

export async function saveAllBillsToCloud(userId: string, bills: SavedBill[]): Promise<boolean> {
  if (!isSupabaseConfigured() || bills.length === 0) return true;
  const rows = bills.map((bill) => ({
    user_id: userId,
    bill_id: bill.id,
    name: bill.name,
    total: bill.total,
    payload: bill,
  }));
  const { error } = await supabase.from('bill_history').upsert(rows, {
    onConflict: 'user_id,bill_id',
  });
  if (error) {
    console.error('saveAllBillsToCloud', error);
    return false;
  }
  return true;
}

export async function deleteBillFromCloud(userId: string, billId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('bill_history')
    .delete()
    .eq('user_id', userId)
    .eq('bill_id', billId);
  if (error) {
    console.error('deleteBillFromCloud', error);
    return false;
  }
  return true;
}
