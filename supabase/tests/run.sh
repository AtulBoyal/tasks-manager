#!/bin/sh
# Applies the Supabase stub + all migrations to an EMPTY Postgres database and
# runs the RLS/constraint tests. Never point this at a real Supabase project.
#
# Usage:  DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres supabase/tests/run.sh
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to an empty, disposable Postgres database}"

cd "$(dirname "$0")/.."

psql_run() {
  psql "$DATABASE_URL" --no-psqlrc -v ON_ERROR_STOP=1 --quiet "$@"
}

echo "Applying Supabase stub"
psql_run -f tests/supabase_stub.sql

for migration in migrations/*.sql; do
  # Optional data seeded just before a migration, to test data conversions
  seed="tests/seed/$(basename "$migration")"
  if [ -f "$seed" ]; then
    echo "Seeding $seed"
    psql_run --single-transaction -f "$seed"
  fi

  echo "Applying $migration"
  psql_run --single-transaction -f "$migration"
done

echo "Running tests"
psql_run -f tests/rls.test.sql
