-- Sprint 5 - Migration V2 013
-- Purpose: read-only validation queries for the PV, correction and publication schema.
-- Dependencies:
-- - database/migrations/v2/008_create_pv_intake.sql
-- - database/migrations/v2/009_create_pv_results.sql
-- - database/migrations/v2/010_create_pv_validation_and_corrections.sql
-- - database/migrations/v2/011_create_publication_model.sql
-- - database/migrations/v2/012_create_pv_indexes.sql
-- This file intentionally contains SELECT statements only.

SELECT
  'pv_expected_tables' AS check_name,
  expected.table_name,
  CASE WHEN actual.table_name IS NULL THEN 'missing' ELSE 'present' END AS status
FROM (
  VALUES
    ('expected_pvs'),
    ('pv_submissions'),
    ('pv_documents'),
    ('pv_results'),
    ('pv_candidate_results'),
    ('pv_validation_checks'),
    ('pv_anomalies'),
    ('pv_validations'),
    ('pv_decisions'),
    ('result_corrections'),
    ('result_correction_items'),
    ('publication_batches'),
    ('publication_batch_items'),
    ('published_result_snapshots')
) AS expected(table_name)
LEFT JOIN information_schema.tables actual
  ON actual.table_schema = 'elections_v2'
 AND actual.table_name = expected.table_name
ORDER BY expected.table_name;

SELECT
  'pv_required_columns' AS check_name,
  expected.table_name,
  expected.column_name,
  CASE WHEN actual.column_name IS NULL THEN 'missing' ELSE 'present' END AS status
FROM (
  VALUES
    ('expected_pvs', 'expected_pv_code'),
    ('pv_submissions', 'received_pv_code'),
    ('pv_submissions', 'content_hash'),
    ('pv_documents', 'storage_uri'),
    ('pv_results', 'result_layer'),
    ('pv_results', 'version_number'),
    ('pv_candidate_results', 'candidacy_id'),
    ('pv_validation_checks', 'check_status'),
    ('pv_anomalies', 'anomaly_type'),
    ('pv_validations', 'validation_decision'),
    ('pv_decisions', 'decision_type'),
    ('result_corrections', 'reason'),
    ('result_correction_items', 'old_value'),
    ('result_correction_items', 'new_value'),
    ('publication_batches', 'version_number'),
    ('publication_batch_items', 'item_type'),
    ('published_result_snapshots', 'aggregation_level')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns actual
  ON actual.table_schema = 'elections_v2'
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

SELECT
  'pv_foreign_keys' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'expected_pvs',
    'pv_submissions',
    'pv_documents',
    'pv_results',
    'pv_candidate_results',
    'pv_validation_checks',
    'pv_anomalies',
    'pv_validations',
    'pv_decisions',
    'result_corrections',
    'result_correction_items',
    'publication_batches',
    'publication_batch_items',
    'published_result_snapshots'
  )
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'pv_unique_constraints' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'UNIQUE'
  AND tc.table_name LIKE 'pv_%'
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'pv_check_constraints' AS check_name,
  tc.table_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'elections_v2'
  AND tc.constraint_type = 'CHECK'
  AND (
    tc.table_name LIKE 'pv_%'
    OR tc.table_name LIKE 'result_correction%'
    OR tc.table_name LIKE 'publication_%'
    OR tc.table_name = 'published_result_snapshots'
    OR tc.table_name = 'expected_pvs'
  )
ORDER BY tc.table_name, tc.constraint_name;

SELECT
  'pv_indexes' AS check_name,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'elections_v2'
  AND (
    tablename LIKE 'pv_%'
    OR tablename LIKE 'result_correction%'
    OR tablename LIKE 'publication_%'
    OR tablename = 'published_result_snapshots'
    OR tablename = 'expected_pvs'
  )
ORDER BY tablename, indexname;

SELECT
  'pv_layer_separation_columns' AS check_name,
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'elections_v2'
  AND table_name = 'pv_results'
  AND column_name IN ('result_layer', 'version_number', 'result_status', 'is_active')
ORDER BY column_name;

SELECT
  'historical_tables_visibility_only' AS check_name,
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
