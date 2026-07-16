-- Sprint 4 - Migration V2 001
-- Purpose: create the isolated V2 schema and document common conventions.
-- Dependencies: none.
-- Notes:
-- - V2 tables live in schema elections_v2 so they can run in parallel with
--   historical public tables such as results_votes and political_parties.
-- - Flexible TEXT + CHECK constraints are used instead of PostgreSQL ENUMs.
-- - Public identifiers are non-sequential TEXT values supplied by the
--   application/import layer and constrained to avoid numeric-only ids.

BEGIN;

CREATE SCHEMA IF NOT EXISTS elections_v2;

COMMENT ON SCHEMA elections_v2 IS
  'Juno7 Elections V2 schema for non-destructive electoral domain foundations.';

COMMIT;
