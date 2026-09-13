create table if not exists market_shelf (
  id text primary key,
  products jsonb not null,
  promos jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
