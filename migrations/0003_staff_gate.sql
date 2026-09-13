create table if not exists staff_gate (
  id text primary key,
  fail_count integer not null default 0,
  locked_until timestamptz
);
