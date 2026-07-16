-- Sprint 4 - Migration V2 002
-- Purpose: create election cycle and office foundation tables.
-- Dependencies: database/migrations/v2/001_create_enums_and_helpers.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.elections (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  election_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparation',
  scheduled_date DATE,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT elections_public_id_unique UNIQUE (public_id),
  CONSTRAINT elections_code_unique UNIQUE (code),
  CONSTRAINT elections_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT elections_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT elections_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT elections_type_not_blank CHECK (length(btrim(election_type)) > 0),
  CONSTRAINT elections_status_check CHECK (
    status IN (
      'preparation',
      'configuration',
      'candidacies',
      'upcoming',
      'open',
      'counting',
      'pv_reception',
      'verification',
      'consolidation',
      'provisional_published',
      'contestation',
      'final_published',
      'archived'
    )
  ),
  CONSTRAINT elections_open_close_check CHECK (
    opens_at IS NULL OR closes_at IS NULL OR opens_at <= closes_at
  ),
  CONSTRAINT elections_archive_check CHECK (
    archived_at IS NULL OR is_active = FALSE OR status = 'archived'
  )
);

COMMENT ON TABLE elections_v2.elections IS
  'Election-level event, independent from historical MVP result tables.';

CREATE TABLE IF NOT EXISTS elections_v2.election_rounds (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  election_id BIGINT NOT NULL REFERENCES elections_v2.elections(id),
  round_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preparation',
  scheduled_date DATE,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT election_rounds_public_id_unique UNIQUE (public_id),
  CONSTRAINT election_rounds_election_round_unique UNIQUE (election_id, round_number),
  CONSTRAINT election_rounds_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT election_rounds_number_check CHECK (round_number > 0),
  CONSTRAINT election_rounds_label_not_blank CHECK (length(btrim(label)) > 0),
  CONSTRAINT election_rounds_status_check CHECK (
    status IN (
      'preparation',
      'configuration',
      'candidacies',
      'upcoming',
      'open',
      'counting',
      'pv_reception',
      'verification',
      'consolidation',
      'provisional_published',
      'contestation',
      'final_published',
      'archived'
    )
  ),
  CONSTRAINT election_rounds_open_close_check CHECK (
    opens_at IS NULL OR closes_at IS NULL OR opens_at <= closes_at
  )
);

COMMENT ON TABLE elections_v2.election_rounds IS
  'Round or operational polling cycle attached to a V2 election.';

CREATE TABLE IF NOT EXISTS elections_v2.electoral_offices (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  scope_level TEXT NOT NULL,
  required_territory_level TEXT,
  description TEXT,
  display_order INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT electoral_offices_public_id_unique UNIQUE (public_id),
  CONSTRAINT electoral_offices_code_unique UNIQUE (code),
  CONSTRAINT electoral_offices_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT electoral_offices_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT electoral_offices_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT electoral_offices_scope_check CHECK (
    scope_level IN ('national', 'department', 'commune', 'section', 'district')
  ),
  CONSTRAINT electoral_offices_required_territory_check CHECK (
    required_territory_level IS NULL
    OR required_territory_level IN ('country', 'department', 'arrondissement', 'commune', 'section')
  ),
  CONSTRAINT electoral_offices_display_order_check CHECK (
    display_order IS NULL OR display_order > 0
  )
);

COMMENT ON TABLE elections_v2.electoral_offices IS
  'Elective offices such as president, senator, deputy, municipal or local offices.';

COMMIT;
