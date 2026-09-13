alter table market_shelf
  add column if not exists shop jsonb not null default '{}'::jsonb;

alter table staff_gate
  add column if not exists pin_hash text;
