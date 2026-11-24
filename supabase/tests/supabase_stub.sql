-- Minimal stand-ins for the parts of Supabase the migrations depend on, so
-- they can be applied and tested on plain Postgres (CI, local Docker).
-- Never run this against a real Supabase project.

-- Roles are cluster-wide, so tolerate them existing from an earlier run
do $$
begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;

do $$
begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;

create schema auth;

create table auth.users (
  id uuid primary key
);

-- Supabase reads the user id from the request JWT; tests set it with
--   select set_config('request.jwt.claim.sub', '<uuid>', false);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

-- (silences the wal_level warning on plain Postgres; realtime isn't exercised)
set client_min_messages = error;
create publication supabase_realtime;
reset client_min_messages;

-- Supabase grants table access to these roles and relies on RLS to restrict it
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
