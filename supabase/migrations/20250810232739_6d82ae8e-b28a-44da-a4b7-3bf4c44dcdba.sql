-- Profiles table with approval
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Utility function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Function to identify master account by email
create or replace function public.is_master()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') = 'ouroferrero008@gmail.com', false);
$$;

-- Enable RLS
alter table public.profiles enable row level security;

-- RLS policies for profiles
create policy if not exists "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy if not exists "Master can view all profiles"
  on public.profiles for select
  using (public.is_master());

create policy if not exists "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy if not exists "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy if not exists "Master can update any profile"
  on public.profiles for update
  using (public.is_master());

-- Block non-master from changing approval status
create or replace function public.block_approval_change_by_non_admin()
returns trigger as $$
begin
  if (new.is_approved is distinct from old.is_approved) and not public.is_master() then
    raise exception 'Only the master account can change approval status';
  end if;
  return new;
end;
$$ language plpgsql;

-- Triggers for profiles
create or replace trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create or replace trigger trg_profiles_lock_approval
before update on public.profiles
for each row execute function public.block_approval_change_by_non_admin();

-- Invites table (managed only by master)
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  max_uses int,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- Triggers for invites
create or replace trigger trg_invites_updated_at
before update on public.invites
for each row execute function public.update_updated_at_column();

-- RLS: only master can manage invites
create policy if not exists "Master can select invites"
  on public.invites for select
  using (public.is_master());

create policy if not exists "Master can insert invites"
  on public.invites for insert
  with check (public.is_master());

create policy if not exists "Master can update invites"
  on public.invites for update
  using (public.is_master());

create policy if not exists "Master can delete invites"
  on public.invites for delete
  using (public.is_master());