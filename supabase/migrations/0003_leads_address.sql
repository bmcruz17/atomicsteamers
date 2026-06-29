-- Add service address to website leads so staff can route/quote jobs.
alter table leads add column if not exists address text;
