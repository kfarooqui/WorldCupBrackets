-- Add real schedule fields to matches (date, kickoff label, venue, city).
alter table public.matches add column if not exists match_date text;
alter table public.matches add column if not exists kickoff    text;
alter table public.matches add column if not exists venue      text;
alter table public.matches add column if not exists city       text;
