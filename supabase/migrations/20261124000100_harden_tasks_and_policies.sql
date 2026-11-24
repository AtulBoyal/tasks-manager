-- Hardening for tasks and RLS policies.
--
-- 1. Remove the duplicate Codeforces unique index
-- 2. Index tasks.user_id (used by every RLS check and the app's task query)
-- 3. Require an owner on every task, and delete tasks when their user is deleted
-- 4. Restrict factor / recurrence to the values the app uses
-- 5. Rewrite policies: authenticated role only, auth.uid() evaluated once per
--    query instead of once per row, explicit WITH CHECK on updates
--
-- Apply once. It aborts without changing anything if existing rows would
-- violate the new rules (see the preflight block).

-- ---------------------------------------------------------------------------
-- Preflight: stop before changing anything if existing rows would violate
-- the new rules.
-- ---------------------------------------------------------------------------
do $$
declare
  missing_owner  bigint;
  bad_factor     bigint;
  bad_recurrence bigint;
begin
  select count(*) into missing_owner
    from public.tasks where user_id is null;

  select count(*) into bad_factor
    from public.tasks
    where factor is not null and factor not in ('Urgent', 'Normal', 'Later');

  select count(*) into bad_recurrence
    from public.tasks
    where recurrence is not null and recurrence not in ('none', 'daily', 'weekly', 'monthly');

  if missing_owner + bad_factor + bad_recurrence > 0 then
    raise exception
      'Preflight failed: % task(s) without user_id, % with an unknown factor, % with an unknown recurrence. Fix or delete these rows, then re-run.',
      missing_owner, bad_factor, bad_recurrence;
  end if;
end $$;

-- 1. Duplicate of unique_cf_task
drop index if exists public.tasks_user_contest_uniq;

-- 2. Owner lookups
create index if not exists tasks_user_id_idx on public.tasks using btree (user_id);

-- 3. Ownership
alter table public.tasks alter column user_id set not null;

alter table public.tasks
  drop constraint tasks_user_id_fkey,
  add constraint tasks_user_id_fkey foreign key (user_id)
    references auth.users (id) on delete cascade;

-- 4. Allowed values (NULL is still allowed, matching the current columns)
alter table public.tasks
  add constraint tasks_factor_check
    check (factor in ('Urgent', 'Normal', 'Later')),
  add constraint tasks_recurrence_check
    check (recurrence in ('none', 'daily', 'weekly', 'monthly'));

-- 5. Policies
drop policy "Users can read own profile"   on public.profiles;
drop policy "Users can insert own profile" on public.profiles;
drop policy "Users can update own profile" on public.profiles;

create policy "Users can read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy "Users can view own tasks"   on public.tasks;
drop policy "Users can insert own tasks" on public.tasks;
drop policy "Users can update own tasks" on public.tasks;
drop policy "Users can delete own tasks" on public.tasks;

create policy "Users can view own tasks" on public.tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks" on public.tasks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own tasks" on public.tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
