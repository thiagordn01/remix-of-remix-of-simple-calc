-- Harden functions by setting search_path
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_master()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select coalesce((auth.jwt() ->> 'email') = 'ouroferrero008@gmail.com', false);
$$;

create or replace function public.block_approval_change_by_non_admin()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if (new.is_approved is distinct from old.is_approved) and not public.is_master() then
    raise exception 'Only the master account can change approval status';
  end if;
  return new;
end;
$$;