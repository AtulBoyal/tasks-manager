-- Runs (as admin) just BEFORE the migration of the same name, so tests can
-- check that existing rows are converted correctly. Values mimic what the
-- app stored while these columns were text.

insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000c');

insert into public.tasks (name, user_id, last_date, completion_date) values
  ('legacy dated',    '00000000-0000-0000-0000-00000000000c', '2026-11-24', '2026-11-24T10:15:30.123Z'),
  ('legacy blank',    '00000000-0000-0000-0000-00000000000c', '',           ''),
  ('legacy null',     '00000000-0000-0000-0000-00000000000c', null,         null),
  ('legacy padded',   '00000000-0000-0000-0000-00000000000c', ' 2026-01-05 ', '2026-01-05');
