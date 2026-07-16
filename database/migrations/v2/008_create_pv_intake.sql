-- Sprint 5 - Migration V2 008
-- Purpose: create expected PV, PV submission and source document intake tables.
-- Dependencies:
-- - database/migrations/v2/002_create_election_core.sql
-- - database/migrations/v2/003_create_territorial_referential.sql
-- - database/migrations/v2/005_create_access_control.sql
-- Notes:
-- - Files are referenced by logical URI/checksum only; binary content is not stored.
-- - Historical tables remain untouched.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.expected_pvs (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  election_id BIGINT NOT NULL REFERENCES elections_v2.elections(id),
  round_id BIGINT NOT NULL REFERENCES elections_v2.election_rounds(id),
  office_id BIGINT NOT NULL REFERENCES elections_v2.electoral_offices(id),
  district_id BIGINT NOT NULL REFERENCES elections_v2.electoral_districts(id),
  polling_station_id BIGINT NOT NULL REFERENCES elections_v2.polling_stations(id),
  expected_pv_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'expected',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT expected_pvs_public_id_unique UNIQUE (public_id),
  CONSTRAINT expected_pvs_context_unique UNIQUE (
    election_id,
    round_id,
    office_id,
    district_id,
    polling_station_id
  ),
  CONSTRAINT expected_pvs_round_code_unique UNIQUE (round_id, expected_pv_code),
  CONSTRAINT expected_pvs_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT expected_pvs_code_not_blank CHECK (length(btrim(expected_pv_code)) > 0),
  CONSTRAINT expected_pvs_status_check CHECK (status IN ('expected', 'cancelled', 'archived'))
);

COMMENT ON TABLE elections_v2.expected_pvs IS
  'PV expected for one election, round, office, district and polling station context.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_submissions (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  expected_pv_id BIGINT REFERENCES elections_v2.expected_pvs(id),
  election_id BIGINT REFERENCES elections_v2.elections(id),
  round_id BIGINT REFERENCES elections_v2.election_rounds(id),
  received_pv_code TEXT,
  transmission_channel TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_agent_user_id BIGINT REFERENCES elections_v2.users(id),
  source_user_id BIGINT REFERENCES elections_v2.users(id),
  processing_status TEXT NOT NULL DEFAULT 'received',
  document_quality TEXT,
  content_hash TEXT,
  potential_duplicate_of_id BIGINT REFERENCES elections_v2.pv_submissions(id),
  notes TEXT,
  technical_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT pv_submissions_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_submissions_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_submissions_channel_check CHECK (
    transmission_channel IN ('field_app', 'web_admin', 'email', 'messaging', 'scan_center', 'manual', 'other')
  ),
  CONSTRAINT pv_submissions_status_check CHECK (
    processing_status IN (
      'received',
      'matched',
      'in_entry',
      'entered',
      'to_verify',
      'verified',
      'contested',
      'rejected',
      'corrected',
      'included',
      'published',
      'archived'
    )
  ),
  CONSTRAINT pv_submissions_quality_check CHECK (
    document_quality IS NULL
    OR document_quality IN ('good', 'readable', 'partial', 'poor', 'unreadable')
  ),
  CONSTRAINT pv_submissions_duplicate_not_self CHECK (
    potential_duplicate_of_id IS NULL OR potential_duplicate_of_id <> id
  ),
  CONSTRAINT pv_submissions_received_code_not_blank CHECK (
    received_pv_code IS NULL OR length(btrim(received_pv_code)) > 0
  )
);

COMMENT ON TABLE elections_v2.pv_submissions IS
  'Each received transmission for a PV, matched or unmatched to an expected PV.';

CREATE TABLE IF NOT EXISTS elections_v2.pv_documents (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  pv_submission_id BIGINT NOT NULL REFERENCES elections_v2.pv_submissions(id),
  storage_uri TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  checksum TEXT,
  page_number INTEGER,
  document_order INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id BIGINT REFERENCES elections_v2.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT pv_documents_public_id_unique UNIQUE (public_id),
  CONSTRAINT pv_documents_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT pv_documents_storage_uri_not_blank CHECK (length(btrim(storage_uri)) > 0),
  CONSTRAINT pv_documents_file_size_check CHECK (
    file_size_bytes IS NULL OR file_size_bytes >= 0
  ),
  CONSTRAINT pv_documents_page_number_check CHECK (
    page_number IS NULL OR page_number > 0
  ),
  CONSTRAINT pv_documents_order_check CHECK (document_order > 0),
  CONSTRAINT pv_documents_status_check CHECK (
    status IN ('active', 'replaced', 'rejected', 'archived')
  )
);

COMMENT ON TABLE elections_v2.pv_documents IS
  'Logical references to PV source documents or images; binary files are stored outside PostgreSQL.';

COMMIT;
