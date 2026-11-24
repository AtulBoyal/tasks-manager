-- Custom recurrence details, e.g. "every 2 weeks on Mon and Wed".
--
-- tasks.recurrence keeps the frequency (none/daily/weekly/monthly);
-- tasks.recurrence_rule holds the details:
--   { "interval": 1..365, "weekdays": [0..6] (weekly), "monthDay": 1..31 (monthly) }
-- NULL means the defaults (every 1 day/week/month, weekday/day from the deadline).
--
-- Adding a nullable column is instant and changes no existing rows.

alter table public.tasks
  add column recurrence_rule jsonb;

alter table public.tasks
  add constraint tasks_recurrence_rule_check check (
    recurrence_rule is null
    or (
      recurrence is distinct from 'none'
      and jsonb_typeof(recurrence_rule) = 'object'
      -- interval: whole number 1..365
      and jsonb_typeof(recurrence_rule -> 'interval') = 'number'
      and jsonb_path_exists(recurrence_rule, '$.interval ? (@ >= 1 && @ <= 365 && @ == @.floor())')
      -- weekdays (optional): array of whole numbers 0..6
      and (
        not recurrence_rule ? 'weekdays'
        or (
          jsonb_typeof(recurrence_rule -> 'weekdays') = 'array'
          and not jsonb_path_exists(
            recurrence_rule,
            '$.weekdays[*] ? (@.type() != "number" || @ < 0 || @ > 6 || @ != @.floor())'
          )
        )
      )
      -- monthDay (optional): whole number 1..31
      and (
        not recurrence_rule ? 'monthDay'
        or (
          jsonb_typeof(recurrence_rule -> 'monthDay') = 'number'
          and jsonb_path_exists(recurrence_rule, '$.monthDay ? (@ >= 1 && @ <= 31 && @ == @.floor())')
        )
      )
    )
  );
