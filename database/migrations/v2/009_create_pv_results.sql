-- Sprint 5 - Migration V2 009
-- Purpose: create layered PV result totals and candidate result tables.
-- Dependencies:
-- - database/migrations/v2/004_create_political_entities.sql
-- - database/migrations/v2/005_create_access_control.sql
-- - database/migrations/v2/008_create_pv_intake.sql
-- Notes:
-- - Legal formulas for valid, blank, null and expressed votes are not encoded here.
-- - Each layer/version is preserved; updates should create a new logical version.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.pv_results (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT NOT NULL REFERENCES elections_v2.pv_submissions(id),
  result_layer TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  result_status TEXT NOT NULL DEFAULT 'draft',
  registered_voters INTEGER,
  voters INTEGER,
  valid_ballots INTEGER,
  blank_votes INTEGER,
  null_votes INTEGER,
  expressed_votes INTEGER,
  envelopes_count INTEGER,
  ballots_count INTEGER,
  data_source TEXT NOT NULL DEFAULT 'manual_entry',
  source_notes TEXT,
  created_by_user_id BIGINT REFERENCES elections_v2.users(id),
  updated_by_user_id BIGINT REFERENCES elections_v2.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT pv_results_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_results_submission_layer_version_unique UNIQUE (
    pv_submission_id,
    result_layer,
    version_number
  ),
  CONSTRAINT pv_results_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_results_layer_check CHECK (
    result_layer IN ('declared', 'entered', 'verified', 'retained')
  ),
  CONSTRAINT pv_results_status_check CHECK (
    result_status IN ('draft', 'active', 'superseded', 'rejected', 'archived')
  ),
  CONSTRAINT pv_results_version_check CHECK (version_number > 0),
  CONSTRAINT pv_results_registered_voters_check CHECK (
    registered_voters IS NULL OR registered_voters >= 0
  ),
  CONSTRAINT pv_results_voters_check CHECK (voters IS NULL OR voters >= 0),
  CONSTRAINT pv_results_valid_ballots_check CHECK (
    valid_ballots IS NULL OR valid_ballots >= 0
  ),
  CONSTRAINT pv_results_blank_votes_check CHECK (blank_votes IS NULL OR blank_votes >= 0),
  CONSTRAINT pv_results_null_votes_check CHECK (null_votes IS NULL OR null_votes >= 0),
  CONSTRAINT pv_results_expressed_votes_check CHECK (
    expressed_votes IS NULL OR expressed_votes >= 0
  ),
  CONSTRAINT pv_results_envelopes_count_check CHECK (
    envelopes_count IS NULL OR envelopes_count >= 0
  ),
  CONSTRAINT pv_results_ballots_count_check CHECK (
    ballots_count IS NULL OR ballots_count >= 0
  ),
  CONSTRAINT pv_results_voters_registered_check CHECK (
    voters IS NULL OR registered_voters IS NULL OR voters <= registered_voters
  ),
  CONSTRAINT pv_results_data_source_check CHECK (
    data_source IN ('pv_document', 'manual_entry', 'double_entry', 'verification', 'correction', 'import')
  )
);

COMMENT ON TABLE elections_v2.pv_results IS
  'Layered PV totals. Declared, entered, verified and retained data are stored separately.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_candidate_results (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_result_id BIGINT NOT NULL REFERENCES elections_v2.pv_results(id),
  candidacy_id BIGINT NOT NULL REFERENCES elections_v2.candidacies(id),
  votes INTEGER NOT NULL,
  entry_order INTEGER,
  observations TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pv_candidate_results_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_candidate_results_result_candidacy_unique UNIQUE (pv_result_id, candidacy_id),
  CONSTRAINT pv_candidate_results_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_candidate_results_votes_check CHECK (votes >= 0),
  CONSTRAINT pv_candidate_results_entry_order_check CHECK (
    entry_order IS NULL OR entry_order > 0
  )
);

COMMENT ON TABLE elections_v2.pv_candidate_results IS
  'Candidate-level votes for one PV result layer and version.';

COMMIT;
