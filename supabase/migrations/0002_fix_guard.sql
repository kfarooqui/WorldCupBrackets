-- Patch: allow admin/service-role updates to change profile status & role.
-- The original guard reverted status/role whenever the caller wasn't an admin,
-- which also blocked legitimate service-role admin approvals (no auth.uid()).

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role   := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;
