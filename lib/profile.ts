import { supabase, isSupabaseConfigured } from './supabase';

export interface UserProfile {
  id: string;
  display_name: string | null;
  prompt_pay_initial: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; prompt_pay_initial?: string | null }
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    console.error('updateProfile', error);
    return false;
  }
  return true;
}
