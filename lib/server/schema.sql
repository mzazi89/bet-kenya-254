create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Guest',
  email text unique,
  phone text,
  dob date,
  password_hash text,
  is_guest boolean not null default false,
  kyc_status text not null default 'unverified',
  kyc_ref text,
  id_number text,
  self_excluded_until timestamptz,
  two_factor boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mode text not null check (mode in ('demo', 'account')),
  balance numeric(14, 2) not null default 0,
  deposited_today numeric(14, 2) not null default 0,
  staked_today numeric(14, 2) not null default 0,
  won_today numeric(14, 2) not null default 0,
  day_key date not null default current_date,
  unique (user_id, mode)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  label text not null,
  amount numeric(14, 2) not null,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists transactions_wallet_idx on transactions(wallet_id, created_at desc);

create table if not exists aviator_bets (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  round_id integer not null,
  stake numeric(14, 2) not null,
  cashout numeric(10, 2),
  payout numeric(14, 2),
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  created_at timestamptz not null default now()
);
create index if not exists aviator_wallet_idx on aviator_bets(wallet_id, created_at desc);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references wallets(id) on delete cascade,
  stake numeric(14, 2) not null,
  odds numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'won', 'lost')),
  payout numeric(14, 2) not null default 0,
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists tickets_wallet_idx on tickets(wallet_id, placed_at desc);

create table if not exists ticket_legs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  match text not null,
  market text not null,
  pick text not null,
  odds numeric(10, 2) not null
);
create index if not exists legs_ticket_idx on ticket_legs(ticket_id);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  wallet_id uuid not null references wallets(id) on delete cascade,
  amount numeric(14, 2) not null,
  method text not null,
  destination text not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);
create index if not exists withdrawals_user_idx on withdrawals(user_id, created_at desc);

create table if not exists limits (
  user_id uuid primary key references users(id) on delete cascade,
  daily_deposit numeric(14, 2) not null default 10000,
  daily_loss numeric(14, 2) not null default 5000,
  reality_check_min integer not null default 30
);
