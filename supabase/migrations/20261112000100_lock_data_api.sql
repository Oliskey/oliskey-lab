-- Supabase exposes the public schema through its Data API (PostgREST) to anyone holding the anon key.
-- Oliskey Lab never uses that API: only the Lab server reads and writes, over a direct database connection as the
-- table owner. Turning on Row Level Security with no policies closes the Data API completely for these tables,
-- while the owner connection keeps working. Safe to run more than once.
alter table users enable row level security;
alter table organisations enable row level security;
alter table memberships enable row level security;
alter table discovery enable row level security;
alter table sites enable row level security;
alter table site_versions enable row level security;
alter table products enable row level security;
alter table grants enable row level security;
alter table leads enable row level security;
alter table social_accounts enable row level security;
alter table audit_log enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon, authenticated;
  end if;
end $$;
