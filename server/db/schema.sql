-- Oliskey Lab database. Every business record carries org_id; the server checks membership on every request.
-- The history (audit_log) is append-only: a trigger refuses updates and deletes.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'trial' check (plan in ('trial','starter','growth','scale')),
  focus_done text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references organisations(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','viewer')),
  primary key (user_id, org_id)
);

create table if not exists discovery (
  org_id uuid primary key references organisations(id) on delete cascade,
  answers jsonb not null default '{}',
  step int not null default 0,
  completed_at timestamptz,
  strategy jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','awaiting_approval','published')),
  draft_version_id uuid,
  live_version_id uuid,
  updated_at timestamptz not null default now()
);
create index if not exists sites_org on sites(org_id);

create table if not exists site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  number int not null,
  note text not null default '',
  content jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (site_id, number)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  type text not null check (type in ('website','pwa','android','ios')),
  name text not null,
  url text not null,
  origin text not null check (origin in ('built','connected')),
  levels text[] not null default '{public}',
  site_id uuid references sites(id) on delete set null,
  domain_token text,
  domain_verified_at timestamptz,
  health_score int,
  health_checked_at timestamptz,
  last_report jsonb,
  created_at timestamptz not null default now()
);
create index if not exists products_org on products(org_id);

create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  permission text not null,
  granted_by text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organisations(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  message text not null,
  source text not null,
  status text not null default 'new' check (status in ('new','contacted','won','lost')),
  created_at timestamptz not null default now()
);
create index if not exists leads_org on leads(org_id, created_at desc);

create table if not exists social_accounts (
  org_id uuid not null references organisations(id) on delete cascade,
  platform text not null,
  status text not null default 'not_connected',
  handle text,
  primary key (org_id, platform)
);

create table if not exists audit_log (
  id bigserial primary key,
  org_id uuid not null references organisations(id) on delete cascade,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target text not null,
  detail text
);
create index if not exists audit_org on audit_log(org_id, at desc);
create or replace function audit_log_append_only() returns trigger language plpgsql as $$
begin raise exception 'The history cannot be changed or deleted.'; end $$;
drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log for each row execute function audit_log_append_only();
