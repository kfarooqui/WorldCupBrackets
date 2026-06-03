-- Track how many times each user has successfully signed in.
-- Supabase auth exposes last_sign_in_at but no login *count*, so we keep our own.
alter table public.profiles add column if not exists sign_in_count int not null default 0;

-- Called from the magic-link callback after a successful session exchange.
-- security definer so it can update the row regardless of the caller's RLS;
-- it only ever touches the calling user's own row (auth.uid()).
create or replace function public.record_sign_in()
returns void language sql security definer set search_path = public as $$
  update public.profiles set sign_in_count = sign_in_count + 1 where id = auth.uid();
$$;

grant execute on function public.record_sign_in() to authenticated;
