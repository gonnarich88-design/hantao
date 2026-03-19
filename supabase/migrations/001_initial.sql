-- HanTao: profiles (Phase 2), bill_history (Phase 1), saved_groups (Phase 3)
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

-- Profiles: display name and default PromptPay per user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  prompt_pay_initial text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Bill history: one row per saved bill, payload = full SavedBill JSON
create table if not exists public.bill_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id text not null,
  name text,
  total numeric,
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists bill_history_user_id_idx on public.bill_history(user_id);
create index if not exists bill_history_created_at_idx on public.bill_history(created_at desc);
create unique index if not exists bill_history_user_bill_idx on public.bill_history(user_id, bill_id);

alter table public.bill_history enable row level security;

create policy "Users can read own bill history"
  on public.bill_history for select using (auth.uid() = user_id);
create policy "Users can insert own bill history"
  on public.bill_history for insert with check (auth.uid() = user_id);
create policy "Users can update own bill history"
  on public.bill_history for update using (auth.uid() = user_id);
create policy "Users can delete own bill history"
  on public.bill_history for delete using (auth.uid() = user_id);

-- Saved groups: named list of bill members for quick reuse (Phase 3)
create table if not exists public.saved_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  members jsonb not null default '[]',
  created_at timestamptz default now()
);

create index if not exists saved_groups_user_id_idx on public.saved_groups(user_id);

alter table public.saved_groups enable row level security;

create policy "Users can read own saved groups"
  on public.saved_groups for select using (auth.uid() = user_id);
create policy "Users can insert own saved groups"
  on public.saved_groups for insert with check (auth.uid() = user_id);
create policy "Users can update own saved groups"
  on public.saved_groups for update using (auth.uid() = user_id);
create policy "Users can delete own saved groups"
  on public.saved_groups for delete using (auth.uid() = user_id);

-- Trigger to create profile on signup (optional; app can also insert on first signUp)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
