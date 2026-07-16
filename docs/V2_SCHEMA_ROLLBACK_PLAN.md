# V2 Schema Rollback Plan

Date: 2026-07-16

## 1. Scope

This plan covers the Sprint 4 V2 schema foundations in `database/migrations/v2/`.

The V2 schema is designed to run in parallel under `elections_v2`. It does not rename, remove or rewrite historical tables such as `results_votes`, `results_department`, `locations_electoral_units`, `candidates` or the historical public `political_parties`.

## 2. Before Any V2 Data Exists

If the V2 migrations are applied in a local or staging database and no application, import or operator has written V2 data yet, rollback is a deployment decision:

1. Stop using the V2 schema in application configuration.
2. Keep the historical application pointed at the existing public tables.
3. Record the migration attempt, database name, operator and timestamp.
4. Review the migration logs before any further attempt.

Any physical removal of the V2 schema must require explicit human approval from the technical lead and database owner. No automatic destructive rollback script is provided.

## 3. If V2 Data Exists

If any V2 table contains data, do not remove the schema as a normal rollback.

Preferred approach:

1. Disable V2 feature flags or API routes.
2. Leave `elections_v2` tables intact.
3. Export row counts and checksums for evidence.
4. Preserve audit logs and imported references.
5. Create a remediation plan for the specific data issue.

This protects early imports, audit evidence and possible reconciliation work.

## 4. Disabling V2 Without Data Loss

V2 can be disabled without deleting data by:

- keeping all reads on the historical MVP tables;
- preventing application writes to `elections_v2`;
- revoking application-level access in configuration or code in a later approved phase;
- marking V2 records inactive or archived only through approved application workflows once those workflows exist.

The Sprint 4 migrations do not create PostgreSQL roles, so access-control rollback is handled outside these migration files.

## 5. Operations Requiring Human Approval

The following actions require explicit approval:

- physical removal of any V2 table or schema;
- manual edits to V2 data;
- manual edits to historical public tables;
- production database access;
- importing historical candidates, parties, locations or results into V2;
- enabling V2 reads or writes in backend routes;
- publishing any V2-derived result.

## 6. Why No Automatic Destructive Rollback Is Provided

An automatic destructive rollback is intentionally omitted because:

- V2 may contain audit evidence or imported election references;
- accidental execution against the wrong database would be high impact;
- historical tables must remain untouched;
- safe rollback depends on whether V2 data exists;
- human validation is required before any destructive database operation.

The safe default is to disable V2 usage and preserve the data for inspection.
