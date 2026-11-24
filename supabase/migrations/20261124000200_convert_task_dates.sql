-- Store task dates with proper types:
--   last_date:       text -> date         (app already uses 'YYYY-MM-DD')
--   completion_date: text -> timestamptz  (app writes ISO timestamps)
-- Empty strings become NULL.
--
-- Only unambiguous ISO values ('YYYY-MM-DD...') are converted. The database
-- parses dates month-first, so a value like '05-03-2026' would silently become
-- 3 May; the preflight refuses to run instead, listing examples to fix.

-- ---------------------------------------------------------------------------
-- Preflight
-- ---------------------------------------------------------------------------
do $$
declare
  r              record;
  bad_last_date  bigint := 0;
  bad_completion bigint := 0;
  examples       text := '';
begin
  for r in
    select id, last_date as value from public.tasks
    where nullif(btrim(last_date), '') is not null
  loop
    begin
      if btrim(r.value) !~ '^\d{4}-\d{2}-\d{2}$' then
        raise exception 'not ISO';
      end if;
      perform btrim(r.value)::date;
    exception when others then
      bad_last_date := bad_last_date + 1;
      if bad_last_date + bad_completion <= 5 then
        examples := examples || format(' [task %s last_date=%L]', r.id, r.value);
      end if;
    end;
  end loop;

  for r in
    select id, completion_date as value from public.tasks
    where nullif(btrim(completion_date), '') is not null
  loop
    begin
      if btrim(r.value) !~ '^\d{4}-\d{2}-\d{2}' then
        raise exception 'not ISO';
      end if;
      perform btrim(r.value)::timestamptz;
    exception when others then
      bad_completion := bad_completion + 1;
      if bad_last_date + bad_completion <= 5 then
        examples := examples || format(' [task %s completion_date=%L]', r.id, r.value);
      end if;
    end;
  end loop;

  if bad_last_date + bad_completion > 0 then
    raise exception
      'Preflight failed: % last_date and % completion_date value(s) are not ISO dates. Examples:%',
      bad_last_date, bad_completion, examples;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Convert
-- ---------------------------------------------------------------------------
alter table public.tasks
  alter column last_date type date
    using nullif(btrim(last_date), '')::date,
  alter column completion_date type timestamptz
    using nullif(btrim(completion_date), '')::timestamptz;
