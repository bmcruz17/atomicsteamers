-- ============================================================
--  Atomic Steamers — backend schema
--  Pipeline (kanban) + customer intake + billing + Hawaii GET
--  Paste this whole file into the Supabase SQL Editor and Run.
--  Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
-- ============================================================

-- ---------- Enumerated types ----------
do $$ begin
  create type service_type as enum ('bed_bug','sanitizing','inspection','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type property_type as enum ('home','condo','apartment','rental','hotel','commercial','other');
exception when duplicate_object then null; end $$;

-- Kanban columns, in pipeline order
do $$ begin
  create type job_status as enum (
    'new_lead','contacted_quoted','scheduled','in_progress',
    'completed','invoiced','paid','recurring','lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('draft','sent','paid','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash','card','check','venmo','zelle','other');
exception when duplicate_object then null; end $$;

-- ---------- Customers ----------
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  phone         text,
  email         text,
  address       text,
  town          text,                       -- e.g. Honolulu, Kailua, Waikiki
  property_type property_type,
  source        text,                        -- how they heard about us
  notes         text
);

-- ---------- Jobs (each card on the kanban board) ----------
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  customer_id     uuid references customers(id) on delete cascade,
  service_type    service_type not null default 'bed_bug',
  status          job_status   not null default 'new_lead',
  severity        text,                       -- light / moderate / severe
  description     text,
  inspection_date date,
  scheduled_date  timestamptz,
  completed_date  timestamptz,
  crew            text,
  quote_amount    numeric(10,2),
  final_amount    numeric(10,2),
  tags            text[] default '{}',
  notes           text
);
create index if not exists jobs_status_idx   on jobs (status);
create index if not exists jobs_customer_idx on jobs (customer_id);

-- keep updated_at fresh
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at before update on jobs
  for each row execute function set_updated_at();

-- ---------- Invoices (billing + Hawaii GET) ----------
-- Oahu GET: 4.5% base; up to 4.712% may be passed to the customer
-- because the GET reimbursement is itself taxable. Adjust get_rate per
-- your tax preparer's guidance.
create sequence if not exists invoice_seq start 1001;

create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  job_id         uuid references jobs(id) on delete cascade,
  invoice_number text unique default ('AS-' || lpad(nextval('invoice_seq')::text, 5, '0')),
  subtotal       numeric(10,2) not null default 0,
  get_rate       numeric(6,5)  not null default 0.04712,
  get_amount     numeric(10,2) generated always as (round(subtotal * get_rate, 2)) stored,
  total          numeric(10,2) generated always as (round(subtotal * (1 + get_rate), 2)) stored,
  status         invoice_status not null default 'draft',
  issued_date    date,
  due_date       date,
  paid_date      date,
  payment_method payment_method,
  notes          text
);
create index if not exists invoices_job_idx    on invoices (job_id);
create index if not exists invoices_status_idx  on invoices (status);

-- ---------- Public intake (website "Free Inspection" form) ----------
-- The website inserts here anonymously. Staff review and convert to a
-- customer + job. Anon can ONLY insert; it can never read this table.
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  phone         text,
  email         text,
  town          text,
  service_type  text,
  property_type text,
  message       text,
  source        text default 'website',
  processed     boolean not null default false
);
create index if not exists leads_processed_idx on leads (processed, created_at);

-- ---------- GET (General Excise Tax) owed, rolled up by filing period ----------
-- GET is generally owed on income when received (cash basis = paid invoices).
-- File Form G-45 each period and Form G-49 annually with Hawaii DOTAX.
create or replace view get_tax_by_period as
select
  date_trunc('month', coalesce(paid_date, issued_date))::date as period_month,
  count(*)                       as invoice_count,
  sum(subtotal)                  as gross_income,
  sum(get_amount)                as get_collected
from invoices
where status = 'paid'
group by 1
order by 1 desc;

-- Quick board view: every job with its customer, ordered by pipeline stage
create or replace view kanban_board as
select
  j.id, j.status, j.service_type, j.scheduled_date, j.quote_amount, j.final_amount,
  j.tags, j.updated_at,
  c.name as customer_name, c.phone, c.town
from jobs j
left join customers c on c.id = j.customer_id
order by array_position(enum_range(null::job_status), j.status), j.updated_at desc;

-- ============================================================
--  Row Level Security
-- ============================================================
alter table customers enable row level security;
alter table jobs      enable row level security;
alter table invoices  enable row level security;
alter table leads     enable row level security;

-- Website visitors (anon) may ONLY submit a lead — nothing else.
drop policy if exists "anon can submit leads" on leads;
create policy "anon can submit leads" on leads
  for insert to anon, authenticated with check (true);

-- Your staff (logged in via Supabase Auth) get full access to everything.
drop policy if exists "staff manage leads" on leads;
create policy "staff manage leads" on leads
  for all to authenticated using (true) with check (true);

drop policy if exists "staff manage customers" on customers;
create policy "staff manage customers" on customers
  for all to authenticated using (true) with check (true);

drop policy if exists "staff manage jobs" on jobs;
create policy "staff manage jobs" on jobs
  for all to authenticated using (true) with check (true);

drop policy if exists "staff manage invoices" on invoices;
create policy "staff manage invoices" on invoices
  for all to authenticated using (true) with check (true);

-- Done. Create a staff login under Authentication → Users, then sign in
-- to manage the board. The website only needs the anon/publishable key.
