-- Sprint 4 - Migration V2 007
-- Purpose: read-only validation queries for the V2 schema.
-- Dependencies:
-- - database/migrations/v2/001_create_enums_and_helpers.sql
-- - database/migrations/v2/002_create_election_core.sql
-- - database/migrations/v2/003_create_territorial_referential.sql
-- - database/migrations/v2/004_create_political_entities.sql
-- - database/migrations/v2/005_create_access_control.sql
-- - database/migrations/v2/006_create_indexes.sql
-- This file intentionally contains SELECT statements only.

SELECT
  'v2_expected_tables' AS check_name,
  expected.table_name,
  CASE WHEN actual.table_name IS NULL THEN 'missing' ELSE 'present' END AS status
FROM (
  VALUES
    ('elections'),
    ('election_rounds'),
    ('electoral_offices'),
    ('territories'),
    ('electoral_districts'),
    ('electoral_district_territories'),
    ('polling_centers'),
    ('polling_stations'),
    ('persons'),
    ('political_parties'),
    ('coalitions'),
    ('coalition_members'),
    ('candidacies'),
    ('users'),
    ('roles'),
    ('user_roles'),
    ('audit_logs')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual
  ON actual.table_schema = 'elections_v2'
 AND actual.table_name = expected.table_name
ORDER BY expected.table_name;

SELECT
  'v2_required_columns' AS check_name,
  expected.table_name,
  expected.column_name,
  CASE WHEN actual.column_name IS NULL THEN 'missing' ELSE 'present' END AS status
FROM (
  VALUES
    ('elections', 'public_id'),
    ('elections', 'status'),
    ('election_rounds', 'election_id'),
    ('election_rounds', 'round_number'),
    ('electoral_offices', 'scope_level'),
    ('territories', 'parent_id'),
    ('territories', 'territory_level'),
    ('territories', 'path'),
    ('electoral_districts', 'election_id'),
    ('electoral_districts', 'office_id'),
    ('polling_centers', 'territory_id'),
    ('polling_stations', 'polling_center_id'),
    ('persons', 'display_name'),
    ('political_parties', 'name'),
    ('coalitions', 'name'),
    ('coalition_members', 'coalition_id'),
    ('candidacies', 'candidate_code'),
    ('users', 'password_hash'),
    ('roles', 'code'),
    ('user_roles', 'user_id'),
    ('audit_logs', 'action')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns actual
  ON actual.table_schema = 'elections_v2'
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

SELECT
  'v2_foreign_keys' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'v2_unique_constraints' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'v2_check_constraints' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'v2_indexes' AS check_name,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'elections_v2'
ORDER BY tablename, indexname;

SELECT
  'historical_tables_visibility' AS check_name,
  expected.table_name,
  CASE WHEN actual.table_name IS NULL THEN 'not_present_in_target' ELSE 'present_read_only_check' END AS status
FROM (
  VALUES
    ('results_votes'),
    ('results_department')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual
  ON actual.table_schema = 'public'
 AND actual.table_name = expected.table_name
ORDER BY expected.table_name;

SELECT
  'target_database_context' AS check_name,
  current_database() AS database_name,
  current_schema() AS current_schema;
