-- Sprint 5 - Migration V2 012
-- Purpose: create non-redundant indexes for PV intake, validation, correction and publication.
-- Dependencies:
-- - database/migrations/v2/008_create_pv_intake.sql
-- - database/migrations/v2/009_create_pv_results.sql
-- - database/migrations/v2/010_create_pv_validation_and_corrections.sql
-- - database/migrations/v2/011_create_publication_model.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_v2_expected_pvs_context
  ON elections_v2.expected_pvs (election_id, round_id, polling_station_id, office_id);

CREATE INDEX IF NOT EXISTS idx_v2_expected_pvs_district
  ON elections_v2.expected_pvs (district_id);

CREATE INDEX IF NOT EXISTS idx_v2_pv_submissions_code_received
  ON elections_v2.pv_submissions (received_pv_code, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_pv_submissions_expected
  ON elections_v2.pv_submissions (expected_pv_id);

CREATE INDEX IF NOT EXISTS idx_v2_pv_submissions_content_hash
  ON elections_v2.pv_submissions (content_hash)
  WHERE content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v2_pv_documents_submission
  ON elections_v2.pv_documents (pv_submission_id, document_order);

CREATE INDEX IF NOT EXISTS idx_v2_pv_documents_checksum
  ON elections_v2.pv_documents (checksum)
  WHERE checksum IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_pv_results_active_layer_unique
  ON elections_v2.pv_results (pv_submission_id, result_layer)
  WHERE is_active = TRUE AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_pv_results_submission_status
  ON elections_v2.pv_results (pv_submission_id, result_status);

CREATE INDEX IF NOT EXISTS idx_v2_pv_candidate_results_candidacy
  ON elections_v2.pv_candidate_results (candidacy_id);

CREATE INDEX IF NOT EXISTS idx_v2_pv_validation_checks_result_date
  ON elections_v2.pv_validation_checks (pv_result_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_pv_anomalies_open
  ON elections_v2.pv_anomalies (anomaly_status, severity, opened_at DESC)
  WHERE anomaly_status IN ('open', 'assigned');

CREATE INDEX IF NOT EXISTS idx_v2_pv_validations_submission_date
  ON elections_v2.pv_validations (pv_submission_id, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_pv_validations_result_date
  ON elections_v2.pv_validations (pv_result_id, validated_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_pv_decisions_active
  ON elections_v2.pv_decisions (pv_submission_id, decision_type, decided_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_v2_result_corrections_status
  ON elections_v2.result_corrections (correction_status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_result_correction_items_correction
  ON elections_v2.result_correction_items (correction_id);

CREATE INDEX IF NOT EXISTS idx_v2_publication_batches_context_version
  ON elections_v2.publication_batches (election_id, round_id, version_number);

CREATE INDEX IF NOT EXISTS idx_v2_publication_batch_items_batch
  ON elections_v2.publication_batch_items (publication_batch_id);

CREATE INDEX IF NOT EXISTS idx_v2_published_snapshots_batch_level
  ON elections_v2.published_result_snapshots (publication_batch_id, aggregation_level);

CREATE INDEX IF NOT EXISTS idx_v2_published_snapshots_candidacy
  ON elections_v2.published_result_snapshots (candidacy_id)
  WHERE candidacy_id IS NOT NULL;

COMMIT;
