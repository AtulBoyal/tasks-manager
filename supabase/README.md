# Database

The Supabase (Postgres) schema for TaskVault, kept as ordered SQL migrations.

```
supabase/
├── migrations/
│   ├── 20261124000000_baseline_schema.sql          # schema as it was in production
│   ├── 20261124000100_harden_tasks_and_policies.sql
│   ├── 20261124000200_convert_task_dates.sql
│   └── 20261124000300_add_recurrence_rule.sql
└── tests/
    ├── supabase_stub.sql   # stand-ins for Supabase's auth schema, roles, publication
    ├── seed/               # data inserted just before the migration of the same name
    ├── rls.test.sql        # RLS, constraint and data-conversion assertions
    └── run.sh              # applies everything to an empty Postgres and runs the tests
```

To test a migration that converts existing data, add `tests/seed/<same filename>.sql`
with rows in the old format; `run.sh` inserts them right before that migration runs,
and `rls.test.sql` can then assert how they were converted.

Migrations run in filename order. Never edit a migration that has been applied
to production; add a new one instead.

## Applying migrations

### Production (existing project)

The **baseline** describes what production already has. Never run it there.

New migrations can be applied in the Supabase dashboard → **SQL Editor**:
paste the whole file between `begin;` and `commit;` and run it once.

### Fresh project

Run every file in `migrations/` in order, in the SQL Editor or with the CLI.

### With the Supabase CLI (optional)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

# Once: tell the CLI which migrations production already has
npx supabase migration repair --status applied 20261124000000
npx supabase migration repair --status applied 20261124000100   # after applying it manually

# Later: create and apply new migrations
npx supabase migration new <name>
npx supabase db push
```

## Testing

CI applies all migrations to a disposable Postgres and runs `tests/rls.test.sql`
on every pull request. To run the same thing locally with Docker:

```bash
docker run -d --rm --name taskvault-db -e POSTGRES_PASSWORD=postgres postgres:17
until docker exec taskvault-db pg_isready -U postgres -q; do sleep 1; done
docker cp supabase taskvault-db:/supabase
docker exec -e DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
  taskvault-db sh /supabase/tests/run.sh
docker stop taskvault-db
```

`run.sh` must only ever point at an empty, throwaway database.
