-- RoyalDeck V21: run once in the private Supabase project's SQL Editor.
-- This table contains private account data including salted password hashes.
-- Do not grant public access or add anonymous/authenticated policies.
begin;
create table if not exists public.royaldeck_state (
  id text primary key check (id = 'main'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);
alter table public.royaldeck_state enable row level security;
revoke all on table public.royaldeck_state from public, anon, authenticated;
grant select, insert, update on table public.royaldeck_state to service_role;
commit;
