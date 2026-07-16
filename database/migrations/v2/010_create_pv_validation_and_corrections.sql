-- Sprint 5 - Migration V2 010
-- Purpose: create PV checks, anomalies, validations, decisions and correction tables.
-- Dependencies:
-- - database/migrations/v2/005_create_access_control.sql
-- - database/migrations/v2/008_create_pv_intake.sql
-- - database/migrations/v2/009_create_pv_results.sql
-- Notes:
-- - Corrections are versioned; previous values are retained in result_correction_items.
-- - No trigger-based immutability is added in this sprint.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.pv_validation_checks (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  check_type TEXT NOT NULL,
  check_status TEXT NOT NULL,
  expected_value JSONB,
  observed_value JSONB,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  executed_by_system BOOLEAN NOT NULL DEFAULT TRUE,
  executed_by_user_id BIGINT REFERENCES elections_v2.users(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pv_validation_checks_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_validation_checks_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_validation_checks_type_not_blank CHECK (length(btrim(check_type)) > 0),
  CONSTRAINT pv_validation_checks_status_check CHECK (
    check_status IN ('passed', 'failed', 'warning', 'skipped')
  ),
  CONSTRAINT pv_validation_checks_target_check CHECK (
    pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL
  )
);

COMMENT ON TABLE elections_v2.pv_validation_checks IS
  'Automatic or human validation checks and their observed values.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_anomalies (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  pv_document_id BIGINT REFERENCES elections_v2.pv_documents(id),
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  anomaly_status TEXT NOT NULL DEFAULT 'open',
  assigned_to_user_id BIGINT REFERENCES elections_v2.users(id),
  resolution_notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT pv_anomalies_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_anomalies_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_anomalies_type_check CHECK (
    anomaly_type IN (
      'duplicate',
      'unreadable_document',
      'inconsistent_pv_code',
      'inconsistent_total',
      'inconsistent_territory',
      'unknown_candidate',
      'entry_discrepancy',
      'suspected_modification',
      'other'
    )
  ),
  CONSTRAINT pv_anomalies_severity_check CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT pv_anomalies_status_check CHECK (
    anomaly_status IN ('open', 'assigned', 'resolved', 'dismissed', 'archived')
  ),
  CONSTRAINT pv_anomalies_description_not_blank CHECK (length(btrim(description)) > 0),
  CONSTRAINT pv_anomalies_close_check CHECK (closed_at IS NULL OR closed_at >= opened_at),
  CONSTRAINT pv_anomalies_target_check CHECK (
    pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL OR pv_document_id IS NOT NULL
  )
);

COMMENT ON TABLE elections_v2.pv_anomalies IS
  'Open and resolved anomalies found during PV intake, entry, verification or correction.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_validations (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  validator_user_id BIGINT NOT NULL REFERENCES elections_v2.users(id),
  validation_type TEXT NOT NULL,
  validation_decision TEXT NOT NULL,
  comment TEXT,
  validated_version INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pv_validations_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_validations_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_validations_type_check CHECK (
    validation_type IN ('entry_review', 'document_review', 'arithmetic_review', 'supervisor_review', 'publication_review')
  ),
  CONSTRAINT pv_validations_decision_check CHECK (
    validation_decision IN ('approved', 'rejected', 'contested', 'needs_correction', 'included', 'excluded')
  ),
  CONSTRAINT pv_validations_version_check CHECK (
    validated_version IS NULL OR validated_version > 0
  ),
  CONSTRAINT pv_validations_target_check CHECK (
    pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL
  )
);

COMMENT ON TABLE elections_v2.pv_validations IS
  'Human verification acts over a PV submission or result version.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_decisions (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  decision_type TEXT NOT NULL,
  decision_status TEXT NOT NULL DEFAULT 'active',
  decided_by_user_id BIGINT NOT NULL REFERENCES elections_v2.users(id),
  role_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_version INTEGER,
  approval_level TEXT NOT NULL DEFAULT 'standard',
  previous_decision_id BIGINT REFERENCES elections_v2.pv_decisions(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT pv_decisions_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_decisions_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_decisions_type_check CHECK (
    decision_type IN ('include', 'exclude', 'retain_provisionally', 'contest', 'request_correction', 'publish', 'withdraw_from_publication')
  ),
  CONSTRAINT pv_decisions_status_check CHECK (
    decision_status IN ('active', 'superseded', 'cancelled', 'archived')
  ),
  CONSTRAINT pv_decisions_reason_not_blank CHECK (length(btrim(reason)) > 0),
  CONSTRAINT pv_decisions_role_not_blank CHECK (length(btrim(role_code)) > 0),
  CONSTRAINT pv_decisions_target_version_check CHECK (
    target_version IS NULL OR target_version > 0
  ),
  CONSTRAINT pv_decisions_target_check CHECK (
    pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL
  ),
  CONSTRAINT pv_decisions_previous_not_self CHECK (
    previous_decision_id IS NULL OR previous_decision_id <> id
  )
);

COMMENT ON TABLE elections_v2.pv_decisions IS
  'Versioned operational decisions; sensitive decisions supersede rather than overwrite earlier decisions.';

CREATE TABLE IF NOT EXISTS elections_v2.result_corrections (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  correction_target_type TEXT NOT NULL,
  correction_target_id BIGINT NOT NULL,
  source_pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  target_pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  requested_by_user_id BIGINT NOT NULL REFERENCES elections_v2.users(id),
  approved_by_user_id BIGINT REFERENCES elections_v2.users(id),
  anomaly_id BIGINT REFERENCES elections_v2.pv_anomalies(id),
  reason TEXT NOT NULL,
  correction_status TEXT NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  sensitivity_level TEXT NOT NULL DEFAULT 'standard',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT result_corrections_public_id_unique UNIQUE (public_id),
  CONSTRAINT result_corrections_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT result_corrections_target_type_check CHECK (
    correction_target_type IN ('pv_result', 'pv_candidate_result', 'pv_submission', 'pv_decision')
  ),
  CONSTRAINT result_corrections_reason_not_blank CHECK (length(btrim(reason)) > 0),
  CONSTRAINT result_corrections_status_check CHECK (
    correction_status IN ('requested', 'approved', 'rejected', 'applied', 'cancelled')
  ),
  CONSTRAINT result_corrections_sensitivity_check CHECK (
    sensitivity_level IN ('standard', 'sensitive', 'critical')
  ),
  CONSTRAINT result_corrections_result_version_check CHECK (
    source_pv_result_id IS NULL OR target_pv_result_id IS NULL OR source_pv_result_id <> target_pv_result_id
  ),
  CONSTRAINT result_corrections_approval_order_check CHECK (
    approved_at IS NULL OR approved_at >= requested_at
  ),
  CONSTRAINT result_corrections_applied_order_check CHECK (
    applied_at IS NULL OR applied_at >= requested_at
  )
);

COMMENT ON TABLE elections_v2.result_corrections IS
  'Correction request and approval header. Applied corrections must point to a new logical version.';

CREATE TABLE IF NOT EXISTS elections_v2.result_correction_items (
  id BIGSERIAL PRIMARY KEY,
  correction_id BIGINT NOT NULL REFERENCES elections_v2.result_corrections(id),
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  justification TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 1,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT result_correction_items_order_unique UNIQUE (correction_id, item_order),
  CONSTRAINT result_correction_items_field_not_blank CHECK (length(btrim(field_name)) > 0),
  CONSTRAINT result_correction_items_justification_not_blank CHECK (length(btrim(justification)) > 0),
  CONSTRAINT result_correction_items_order_check CHECK (item_order > 0),
  CONSTRAINT result_correction_items_validation_status_check CHECK (
    validation_status IN ('pending', 'validated', 'rejected')
  )
);

COMMENT ON TABLE elections_v2.result_correction_items IS
  'Field-level before/after values for a versioned result correction.';

COMMIT;
