create table if not exists store_settings (
  id text primary key,
  door_hash text,
  updated_at timestamptz not null default now()
);

insert into store_settings (id, door_hash)
values ('main', null)
on conflict (id) do nothing;

create table if not exists store_orders (
  id text primary key,
  number text not null,
  created_at timestamptz not null,
  walk_in boolean not null default false,
  status text not null,
  total_cents integer not null default 0,
  cost_cents integer not null default 0,
  profit_cents integer not null default 0,
  payload jsonb not null
);

create index if not exists store_orders_created_idx on store_orders (created_at desc);
create unique index if not exists store_orders_number_idx on store_orders (number);
