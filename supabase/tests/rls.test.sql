-- Assertions for the migrated schema. Run after supabase_stub.sql and all
-- migrations (see run.sh). Any failure raises an exception and stops psql.

\set ON_ERROR_STOP on
\set QUIET on
-- Hide result rows; PASS notices and \echo still print
\o /dev/null

-- Fails unless the statement raises an error
create function pg_temp.expect_error(stmt text, label text) returns void
  language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL: % (statement unexpectedly succeeded)', label;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  raise notice 'PASS: %', label;
end $$;

create function pg_temp.expect_count(query text, expected bigint, label text) returns void
  language plpgsql as $$
declare actual bigint;
begin
  execute 'select count(*) from (' || query || ') q' into actual;
  if actual <> expected then
    raise exception 'FAIL: % (expected %, got %)', label, expected, actual;
  end if;
  raise notice 'PASS: %', label;
end $$;

grant execute on function pg_temp.expect_error(text, text) to anon, authenticated;
grant execute on function pg_temp.expect_count(text, bigint, text) to anon, authenticated;

-- Two users
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

-- ---------------------------------------------------------------------------
-- Schema shape
-- ---------------------------------------------------------------------------
select pg_temp.expect_count(
  $q$ select 1 from pg_indexes where schemaname = 'public' and indexname = 'tasks_user_contest_uniq' $q$,
  0, 'duplicate contest index removed');

select pg_temp.expect_count(
  $q$ select 1 from pg_indexes where schemaname = 'public' and indexname = 'tasks_user_id_idx' $q$,
  1, 'tasks.user_id is indexed');

select pg_temp.expect_count(
  $q$ select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tasks' $q$,
  1, 'tasks is published for realtime');

-- ---------------------------------------------------------------------------
-- User A
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

-- user_id defaults to the signed-in user
insert into public.tasks (name, factor) values ('A task', 'Urgent');
insert into public.tasks (name, cf_contest_id) values ('A contest', 2000);
insert into public.profiles (id) values ('00000000-0000-0000-0000-00000000000a');

select pg_temp.expect_count($q$ select 1 from public.tasks $q$, 2, 'A sees own tasks');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, user_id) values ('spoof', '00000000-0000-0000-0000-00000000000b') $q$,
  'A cannot insert a task for B');

select pg_temp.expect_error(
  $q$ insert into public.profiles (id) values ('00000000-0000-0000-0000-00000000000b') $q$,
  'A cannot create B''s profile');

select pg_temp.expect_error(
  $q$ update public.tasks set user_id = '00000000-0000-0000-0000-00000000000b' where name = 'A task' $q$,
  'A cannot hand a task to B');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, factor) values ('bad', 'Bogus') $q$,
  'unknown factor rejected');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, recurrence) values ('bad', 'yearly') $q$,
  'unknown recurrence rejected');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, cf_contest_id) values ('dup', 2000) $q$,
  'duplicate contest rejected');

-- Undo after delete: the app re-inserts the deleted row with its original id
insert into public.tasks (name, tags) values ('undo me', '["keep"]');

create temp table undo_snapshot as
  select * from public.tasks where name = 'undo me';
grant select on undo_snapshot to authenticated;

delete from public.tasks where name = 'undo me';

insert into public.tasks
  select * from undo_snapshot;

select pg_temp.expect_count(
  $q$ select 1 from public.tasks t join undo_snapshot s using (id)
      where t.name = 'undo me' and t.tags = '["keep"]'::jsonb $q$,
  1, 'deleted task can be restored with its original id');

-- New tasks still get fresh ids after a restore
insert into public.tasks (name) values ('after undo');

select pg_temp.expect_count(
  $q$ select 1 from public.tasks a, undo_snapshot s
      where a.name = 'after undo' and a.id <> s.id $q$,
  1, 'identity keeps issuing new ids after a restore');

-- ---------------------------------------------------------------------------
-- User B
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

insert into public.tasks (name) values ('B task');
-- B may have its own task for the same contest
insert into public.tasks (name, cf_contest_id) values ('B contest', 2000);

select pg_temp.expect_count($q$ select 1 from public.tasks $q$, 2, 'B sees only own tasks');
select pg_temp.expect_count($q$ select 1 from public.profiles $q$, 0, 'B cannot see A''s profile');

update public.tasks set name = 'hijacked' where name = 'A task';
delete from public.tasks where name = 'A contest';

-- ---------------------------------------------------------------------------
-- Not signed in
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;

select pg_temp.expect_count($q$ select 1 from public.tasks $q$, 0, 'anon sees no tasks');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name) values ('anon task') $q$,
  'anon cannot insert tasks');

-- ---------------------------------------------------------------------------
-- As admin: B's update/delete attempts on A's rows had no effect,
-- and deleting a user removes their tasks
-- ---------------------------------------------------------------------------
reset role;

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'A task' $q$, 1, 'B could not rename A''s task');
select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'A contest' $q$, 1, 'B could not delete A''s task');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, user_id) values ('orphan', null) $q$,
  'tasks require an owner');

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where user_id = '00000000-0000-0000-0000-00000000000a' $q$,
  0, 'deleting a user deletes their tasks');

-- ---------------------------------------------------------------------------
-- Date columns (seeded legacy rows: tests/seed/20261124000200_convert_task_dates.sql)
-- ---------------------------------------------------------------------------
select pg_temp.expect_count(
  $q$ select 1 from information_schema.columns
      where table_name = 'tasks'
        and ((column_name = 'last_date' and data_type = 'date')
          or (column_name = 'completion_date' and data_type = 'timestamp with time zone')) $q$,
  2, 'last_date is date, completion_date is timestamptz');

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'legacy dated'
        and last_date = date '2026-11-24'
        and completion_date = timestamptz '2026-11-24T10:15:30.123Z' $q$,
  1, 'legacy ISO values converted exactly');

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'legacy blank'
        and last_date is null and completion_date is null $q$,
  1, 'legacy empty strings became NULL');

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'legacy padded'
        and last_date = date '2026-01-05'
        and completion_date = timestamptz '2026-01-05T00:00:00Z' $q$,
  1, 'legacy padded / date-only values converted');

-- The app compares last_date as a 'YYYY-MM-DD' string, so the API format matters
select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'legacy dated'
        and to_jsonb(last_date) = '"2026-11-24"'::jsonb $q$,
  1, 'last_date is serialised as YYYY-MM-DD');

select pg_temp.expect_error(
  $q$ insert into public.tasks (name, user_id, last_date)
      values ('bad date', '00000000-0000-0000-0000-00000000000b', '2026-02-30') $q$,
  'impossible dates rejected');

insert into public.tasks (name, user_id, last_date, completion_date)
  values ('app write', '00000000-0000-0000-0000-00000000000b', '2026-11-24', '2026-11-24T18:45:00.000Z');

select pg_temp.expect_count(
  $q$ select 1 from public.tasks where name = 'app write'
        and completion_date = timestamptz '2026-11-24T18:45:00Z' $q$,
  1, 'app''s ISO writes accepted');

\echo 'All database tests passed'
