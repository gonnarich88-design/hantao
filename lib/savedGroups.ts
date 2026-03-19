import { supabase, isSupabaseConfigured } from './supabase';
import type { Member } from '../types';

export interface SavedGroupRow {
  id: string;
  user_id: string;
  name: string;
  members: Member[];
  created_at?: string;
}

export async function fetchSavedGroups(userId: string): Promise<SavedGroupRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('saved_groups')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchSavedGroups', error);
    return [];
  }
  return (data ?? []) as SavedGroupRow[];
}

export async function createSavedGroup(
  userId: string,
  name: string,
  members: Member[]
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('saved_groups')
    .insert({ user_id: userId, name, members })
    .select('id')
    .single();
  if (error) {
    console.error('createSavedGroup', error);
    return null;
  }
  return data?.id ?? null;
}

export async function deleteSavedGroup(userId: string, groupId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('saved_groups')
    .delete()
    .eq('id', groupId)
    .eq('user_id', userId);
  if (error) {
    console.error('deleteSavedGroup', error);
    return false;
  }
  return true;
}
