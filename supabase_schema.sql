-- Messianic Movement — Supabase / Postgres schema
-- Run this ONCE in the Supabase SQL editor (or psql) before using the
-- Supabase or Postgres backend driver.
--
-- One table per collection. The full record is stored in `data` (jsonb) so the
-- flexible shape of registrations/orders/expenses is preserved; `id` and
-- `created_at` are promoted to columns for indexing.

create table if not exists registrations (
  id          text primary key,
  created_at  timestamptz not null default now(),
  data        jsonb not null
);

create table if not exists orders (
  id          text primary key,
  created_at  timestamptz not null default now(),
  data        jsonb not null
);

create table if not exists expenses (
  id          text primary key,
  created_at  timestamptz not null default now(),
  data        jsonb not null
);

-- Helpful indexes for the admin dashboard (sorting/filtering by date & status).
create index if not exists registrations_created_idx on registrations (created_at desc);
create index if not exists orders_created_idx        on orders (created_at desc);
create index if not exists expenses_created_idx      on expenses (created_at desc);
create index if not exists orders_status_idx         on orders ((data->>'status'));
create index if not exists orders_type_idx           on orders ((data->>'type'));

-- IMPORTANT (Supabase): the server connects with the SERVICE ROLE key, which
-- bypasses Row Level Security. Keep that key secret (server-side only). If you
-- enable RLS on these tables, the service role still has full access.
-- Do NOT expose the service role key in any browser/frontend code.
