# V2 Local Database Testing

Date: 2026-07-16

This guide documents the local-only validation flow for the V2 electoral schema.

## Safety Rules

- Use only `127.0.0.1`.
- Use only a disposable database whose name contains `test` or `local`.
- Never use `elections2026`.
- Do not point these scripts at a VPS, remote host or production database.
- The scripts do not clean the database automatically.
- The migration files `database/migrations/v2/001` through `013` are not modified by this harness.

## Expected Local Target

```sh
export PGHOST=127.0.0.1
export PGPORT=55433
export PGDATABASE=juno7_elections_v2_test
```

`PGUSER` defaults to the current local user.

## Run Migrations

One pass:

```sh
bash database/testing/run-v2-migrations.sh
```

Two passes for idempotence:

```sh
bash database/testing/run-v2-migrations.sh --twice
```

The script refuses a non-local host, `elections2026`, and database names without `test` or `local`.

## Verify Schema

```sh
psql -v ON_ERROR_STOP=1 -f database/testing/verify-v2-schema.sql
```

This checks the target, table count, duplicate tables, duplicate constraints, duplicate indexes, historical-table visibility and absence of application objects in `public`.

## Seed Fictitious Demo Data

```sh
psql -v ON_ERROR_STOP=1 -f database/testing/seed-v2-demo.sql
```

The seed uses only fictional names and `example.invalid` email addresses.

## Constraint Tests

```sh
psql -v ON_ERROR_STOP=1 -f database/testing/test-v2-constraints.sql
```

The script runs inside a transaction and finishes with `ROLLBACK`.

## Workflow Test

```sh
psql -v ON_ERROR_STOP=1 -f database/testing/test-v2-workflow.sql
```

The workflow covers election, round, territories, polling center/station, candidacies, expected PV, submission, document, entry, validation check, anomaly, validation, versioned correction, inclusion decision, publication batch and public snapshots. It verifies that a later entry does not retroactively change the published snapshot.

## Node Test

The Node test is opt-in so normal `npm test` does not require a running local PostgreSQL server.

```sh
V2_LOCAL_DB_TESTS=1 \
PGHOST=127.0.0.1 \
PGPORT=55433 \
PGDATABASE=juno7_elections_v2_test \
node --test tests/v2-local-database.test.js
```
