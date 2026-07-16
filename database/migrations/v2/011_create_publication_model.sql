-- Sprint 5 - Migration V2 011
-- Purpose: create versioned publication batches and immutable published snapshots.
-- Dependencies:
-- - database/migrations/v2/003_create_territorial_referential.sql
-- - database/migrations/v2/004_create_political_entities.sql
-- - database/migrations/v2/005_create_access_control.sql
-- - database/migrations/v2/008_create_pv_intake.sql
-- - database/migrations/v2/009_create_pv_results.sql
-- - database/migrations/v2/010_create_pv_validation_and_corrections.sql

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.publication_batches (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  election_id BIGINT NOT NULL REFERENCES elections_v2.elections(id),
  round_id BIGINT REFERENCES elections_v2.election_rounds(id),
  publication_type TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  publication_status TEXT NOT NULL DEFAULT 'draft',
  prepared_by_user_id BIGINT REFERENCES elections_v2.users(id),
  approved_by_user_id BIGINT REFERENCES elections_v2.users(id),
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  public_note TEXT,
  batch_checksum TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT publication_batches_public_id_unique UNIQUE (public_id),
  CONSTRAINT publication_batches_context_version_unique UNIQUE (
    election_id,
    round_id,
    publication_type,
    version_number
  ),
  CONSTRAINT publication_batches_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT publication_batches_type_check CHECK (
    publication_type IN ('provisional', 'corrected', 'final', 'withdrawal')
  ),
  CONSTRAINT publication_batches_status_check CHECK (
    publication_status IN ('draft', 'prepared', 'approved', 'published', 'withdrawn', 'archived')
  ),
  CONSTRAINT publication_batches_version_check CHECK (version_number > 0),
  CONSTRAINT publication_batches_approval_order_check CHECK (
    approved_at IS NULL OR approved_at >= prepared_at
  ),
  CONSTRAINT publication_batches_publish_order_check CHECK (
    published_at IS NULL OR approved_at IS NULL OR published_at >= approved_at
  ),
  CONSTRAINT publication_batches_withdraw_order_check CHECK (
    withdrawn_at IS NULL OR published_at IS NULL OR withdrawn_at >= published_at
  )
);

COMMENT ON TABLE elections_v2.publication_batches IS
  'Versioned publication lot for provisional, corrected, final or withdrawal publications.';

CREATE TABLE IF NOT EXISTS elections_v2.publication_batch_items (
  id BIGSERIAL PRIMARY KEY,
  publication_batch_id BIGINT NOT NULL REFERENCES elections_v2.publication_batches(id),
  item_type TEXT NOT NULL,
  expected_pv_id BIGINT REFERENCES elections_v2.expected_pvs(id),
  pv_submission_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  pv_result_id BIGINT REFERENCES elections_v2.pv_results(id),
  pv_decision_id BIGINT REFERENCES elections_v2.pv_decisions(id),
  item_order INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT publication_batch_items_order_unique UNIQUE (publication_batch_id, item_order),
  CONSTRAINT publication_batch_items_type_check CHECK (
    item_type IN ('expected_pv', 'pv_submission', 'pv_result', 'pv_decision', 'aggregate_snapshot')
  ),
  CONSTRAINT publication_batch_items_order_check CHECK (item_order > 0),
  CONSTRAINT publication_batch_items_target_check CHECK (
    expected_pv_id IS NOT NULL
    OR pv_submission_id IS NOT NULL
    OR pv_result_id IS NOT NULL
    OR pv_decision_id IS NOT NULL
  )
);

COMMENT ON TABLE elections_v2.publication_batch_items IS
  'Objects included in a publication batch. Public reads should use snapshots, not entry tables.';

CREATE TABLE IF NOT EXISTS elections_v2.published_result_snapshots (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  publication_batch_id BIGINT NOT NULL REFERENCES elections_v2.publication_batches(id),
  aggregation_level TEXT NOT NULL,
  territory_id BIGINT REFERENCES elections_v2.territories(id),
  district_id BIGINT REFERENCES elections_v2.electoral_districts(id),
  office_id BIGINT REFERENCES elections_v2.electoral_offices(id),
  candidacy_id BIGINT REFERENCES elections_v2.candidacies(id),
  votes INTEGER,
  registered_voters INTEGER,
  voters INTEGER,
  valid_ballots INTEGER,
  blank_votes INTEGER,
  null_votes INTEGER,
  expressed_votes INTEGER,
  percentage NUMERIC(9,6),
  ranking INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT published_result_snapshots_public_id_unique UNIQUE (public_id),
  CONSTRAINT published_result_snapshots_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT published_result_snapshots_level_check CHECK (
    aggregation_level IN ('polling_station', 'polling_center', 'section', 'commune', 'department', 'district', 'national')
  ),
  CONSTRAINT published_result_snapshots_votes_check CHECK (votes IS NULL OR votes >= 0),
  CONSTRAINT published_result_snapshots_registered_voters_check CHECK (
    registered_voters IS NULL OR registered_voters >= 0
  ),
  CONSTRAINT published_result_snapshots_voters_check CHECK (voters IS NULL OR voters >= 0),
  CONSTRAINT published_result_snapshots_valid_ballots_check CHECK (
    valid_ballots IS NULL OR valid_ballots >= 0
  ),
  CONSTRAINT published_result_snapshots_blank_votes_check CHECK (
    blank_votes IS NULL OR blank_votes >= 0
  ),
  CONSTRAINT published_result_snapshots_null_votes_check CHECK (
    null_votes IS NULL OR null_votes >= 0
  ),
  CONSTRAINT published_result_snapshots_expressed_votes_check CHECK (
    expressed_votes IS NULL OR expressed_votes >= 0
  ),
  CONSTRAINT published_result_snapshots_percentage_check CHECK (
    percentage IS NULL OR (percentage >= 0 AND percentage <= 100)
  ),
  CONSTRAINT published_result_snapshots_ranking_check CHECK (
    ranking IS NULL OR ranking > 0
  ),
  CONSTRAINT published_result_snapshots_voters_registered_check CHECK (
    voters IS NULL OR registered_voters IS NULL OR voters <= registered_voters
  )
);

COMMENT ON TABLE elections_v2.published_result_snapshots IS
  'Immutable public result snapshot calculated for one publication batch and aggregation level.';

COMMIT;
