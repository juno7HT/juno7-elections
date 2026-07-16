#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-55433}"
PGDATABASE="${PGDATABASE:-juno7_elections_v2_test}"
PGUSER="${PGUSER:-$(id -un)}"
PASSES="${V2_MIGRATION_PASSES:-1}"

case "${1:-}" in
  --twice) PASSES=2 ;;
  --passes=*) PASSES="${1#--passes=}" ;;
  "") ;;
  *) echo "Unsupported argument: $1" >&2; exit 2 ;;
esac

if [ "$PGHOST" != "127.0.0.1" ]; then
  echo "Refusing non-local PGHOST: $PGHOST" >&2
  exit 2
fi

case "$PGDATABASE" in
  *elections2026*) echo "Refusing forbidden database name: $PGDATABASE" >&2; exit 2 ;;
esac

case "$PGDATABASE" in
  *test*|*local*) ;;
  *) echo "Refusing database without test/local in its name: $PGDATABASE" >&2; exit 2 ;;
esac

case "$PASSES" in
  1|2) ;;
  *) echo "PASSES must be 1 or 2" >&2; exit 2 ;;
esac

export PGHOST PGPORT PGDATABASE PGUSER

psql -v ON_ERROR_STOP=1 -tA -c "
DO \$\$
BEGIN
  IF current_database() = 'elections2026' OR current_database() !~ '(test|local)' THEN
    RAISE EXCEPTION 'Refusing unsafe database %', current_database();
  END IF;
  IF host(inet_server_addr()) <> '127.0.0.1' THEN
    RAISE EXCEPTION 'Refusing non-local server %:%', inet_server_addr(), inet_server_port();
  END IF;
END \$\$;
SELECT current_database(), current_user, inet_server_addr(), inet_server_port();
"

migrations=(
  database/migrations/v2/001_create_enums_and_helpers.sql
  database/migrations/v2/002_create_election_core.sql
  database/migrations/v2/003_create_territorial_referential.sql
  database/migrations/v2/004_create_political_entities.sql
  database/migrations/v2/005_create_access_control.sql
  database/migrations/v2/006_create_indexes.sql
  database/migrations/v2/007_schema_validation.sql
  database/migrations/v2/008_create_pv_intake.sql
  database/migrations/v2/009_create_pv_results.sql
  database/migrations/v2/010_create_pv_validation_and_corrections.sql
  database/migrations/v2/011_create_publication_model.sql
  database/migrations/v2/012_create_pv_indexes.sql
  database/migrations/v2/013_pv_schema_validation.sql
)

for pass in $(seq 1 "$PASSES"); do
  echo "== V2 migration pass $pass/$PASSES =="
  for migration in "${migrations[@]}"; do
    echo "== $migration =="
    psql -v ON_ERROR_STOP=1 -f "$ROOT_DIR/$migration"
  done
done
