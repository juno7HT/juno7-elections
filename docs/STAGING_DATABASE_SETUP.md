# Staging Database Setup

This document prepares the PostgreSQL staging database plan for Juno7 Elections. It does not contain production secrets and must not be used against the production database.

## Architecture

- Application code: `/home/juno7admin/worktrees/juno7-elections-mvp`
- Staging database: `juno7_elections_staging`
- Staging application role: `juno7_elections_staging_app`
- Application port: `3100`
- Environment file: `.env.staging`, created manually later and never committed
- Seed data: demonstration-only records with `election_id = 1`

## Privileges

The application role should be limited to the staging database only:

- `NOSUPERUSER`
- `NOCREATEDB`
- `NOCREATEROLE`
- `NOINHERIT` is optional; use the simpler default unless a DBA requires otherwise
- Connect privileges only on `juno7_elections_staging`
- DML privileges only on the staging schema objects needed by the app
- No privileges on production database `elections2026`

## SQL Scripts

Run order after human validation:

1. `database/staging/001_create_schema.sql`
2. `database/staging/002_seed_demo.sql`

The scripts are transaction-wrapped and avoid `DROP`, `TRUNCATE`, production references, hardcoded roles, and production data.

## Demonstration Data

The seed script creates only fake demonstration content:

- `election_id = 1`
- Two fictitious parties
- Three fictitious candidates
- Two demonstration departments
- Two communes
- Two sections minimum
- Three voting centers / polling stations
- Three PV codes
- Coherent fictitious vote totals

No real Haitian candidate, party, voter, or production result is included.

## Pre-Write Guardrail

Before running any SQL write, verify the target explicitly:

```bash
set -euo pipefail
: "${NODE_ENV:?NODE_ENV is required}"
: "${STAGING:?STAGING is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

if [ "$NODE_ENV" != "staging" ] || [ "$STAGING" != "true" ]; then
  echo "Refusing SQL execution: staging environment flags are not set" >&2
  exit 1
fi

DB_NAME=$(node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.pathname.replace(/^\\//,''));")
if [ "$DB_NAME" = "elections2026" ] || ! printf '%s' "$DB_NAME" | grep -qi staging; then
  echo "Refusing SQL execution: database name is not an approved staging target" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tAc "SELECT current_database(), current_user, inet_server_addr(), inet_server_port();"
```

The command must print a database name containing `staging`. It must never print or target `elections2026`.

## Administrative Commands Proposed

Do not run these commands until the next approved phase.

### Option A: local postgres account

Generate a staging password locally at execution time:

```bash
STAGING_DB='juno7_elections_staging'
STAGING_ROLE='juno7_elections_staging_app'
STAGING_PASSWORD='<GENERATE_AT_EXECUTION_TIME>'
```

Create role and database:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE juno7_elections_staging_app LOGIN PASSWORD '<GENERATED_STAGING_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE juno7_elections_staging OWNER juno7_elections_staging_app;
REVOKE ALL ON DATABASE juno7_elections_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE juno7_elections_staging TO juno7_elections_staging_app;
SQL
```

Then connect only to the staging database and apply:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/staging/001_create_schema.sql
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f database/staging/002_seed_demo.sql
```

### Option B: existing PostgreSQL administrator

Use an existing PostgreSQL administrator connection that is not the production application role:

```bash
psql "$POSTGRES_ADMIN_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE juno7_elections_staging_app LOGIN PASSWORD '<GENERATED_STAGING_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE juno7_elections_staging OWNER juno7_elections_staging_app;
REVOKE ALL ON DATABASE juno7_elections_staging FROM PUBLIC;
GRANT CONNECT ON DATABASE juno7_elections_staging TO juno7_elections_staging_app;
SQL
```

The admin URL must not point to `elections2026`, and the staging app role must receive no grants on production.

## Validation Procedure

Before applying SQL:

1. Confirm `.env.staging` exists outside Git and contains only staging values.
2. Confirm `NODE_ENV=staging` and `STAGING=true`.
3. Confirm `PORT=3100`.
4. Confirm the database name contains `staging`.
5. Confirm the target database is not `elections2026`.
6. Run the guardrail command above.
7. Apply schema, then seed data.
8. Run read-only checks on row counts and route health.

## Rollback

Preferred rollback before any public staging use:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
-- Only after explicit approval in a rollback phase.
-- DROP DATABASE juno7_elections_staging;
-- DROP ROLE juno7_elections_staging_app;
SQL
```

Rollback commands are intentionally commented here. They require separate human approval because they are destructive.

## Human Approval Required

Creating the role, creating the database, applying SQL scripts, and starting any PM2 staging process all require explicit validation. No command in this document should be run against production.
