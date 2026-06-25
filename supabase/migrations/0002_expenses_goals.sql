-- Atomic Steamers — expenses + goals (run after 0001_init.sql)
-- Paste into the Supabase SQL Editor and Run. Safe to re-run.

-- Expenses
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date       date not null default current_date,
  label      text not null,
  category   text,
  type       text not null default 'one_time',   -- one_time / monthly / yearly
  amount     numeric(10,2) not null default 0,
  notes      text
);
create index if not exists expenses_date_idx on expenses (date);
alter table expenses enable row level security;
drop policy if exists "staff manage expenses" on expenses;
create policy "staff manage expenses" on expenses for all to authenticated using (true) with check (true);

-- Goals / settings (single row, id is always true)
create table if not exists settings (
  id                   boolean primary key default true,
  monthly_revenue_goal numeric(10,2) default 0,
  avg_job_value        numeric(10,2) default 0,
  get_rate             numeric(6,5)  default 0.04712,
  updated_at           timestamptz default now(),
  constraint settings_singleton check (id)
);
insert into settings (id) values (true) on conflict (id) do nothing;
alter table settings enable row level security;
drop policy if exists "staff manage settings" on settings;
create policy "staff manage settings" on settings for all to authenticated using (true) with check (true);
