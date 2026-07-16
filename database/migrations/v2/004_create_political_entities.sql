-- Sprint 4 - Migration V2 004
-- Purpose: create persons, parties, coalitions and candidacy foundations.
-- Dependencies:
-- - database/migrations/v2/001_create_enums_and_helpers.sql
-- - database/migrations/v2/002_create_election_core.sql
-- - database/migrations/v2/003_create_territorial_referential.sql
-- Note: historical public.candidates is not migrated in Sprint 4.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.persons (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT NOT NULL,
  birth_date DATE,
  photo_url TEXT,
  external_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT persons_public_id_unique UNIQUE (public_id),
  CONSTRAINT persons_external_ref_unique UNIQUE (external_ref),
  CONSTRAINT persons_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT persons_display_name_not_blank CHECK (length(btrim(display_name)) > 0)
);

COMMENT ON TABLE elections_v2.persons IS
  'People who may become candidates; separated from electoral candidacies.';

CREATE TABLE IF NOT EXISTS elections_v2.political_parties (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  name TEXT NOT NULL,
  acronym TEXT,
  color TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT political_parties_public_id_unique UNIQUE (public_id),
  CONSTRAINT political_parties_name_unique UNIQUE (name),
  CONSTRAINT political_parties_acronym_unique UNIQUE (acronym),
  CONSTRAINT political_parties_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT political_parties_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT political_parties_status_check CHECK (
    status IN ('draft', 'active', 'suspended', 'archived')
  )
);

COMMENT ON TABLE elections_v2.political_parties IS
  'V2 political party referential, parallel to the historical public table.';

CREATE TABLE IF NOT EXISTS elections_v2.coalitions (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  name TEXT NOT NULL,
  acronym TEXT,
  color TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT coalitions_public_id_unique UNIQUE (public_id),
  CONSTRAINT coalitions_name_unique UNIQUE (name),
  CONSTRAINT coalitions_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT coalitions_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT coalitions_status_check CHECK (
    status IN ('draft', 'active', 'suspended', 'archived')
  )
);

COMMENT ON TABLE elections_v2.coalitions IS
  'Political coalitions or regroupments.';

CREATE TABLE IF NOT EXISTS elections_v2.coalition_members (
  id BIGSERIAL PRIMARY KEY,
  coalition_id BIGINT NOT NULL REFERENCES elections_v2.coalitions(id),
  party_id BIGINT NOT NULL REFERENCES elections_v2.political_parties(id),
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coalition_members_unique UNIQUE (coalition_id, party_id, valid_from),
  CONSTRAINT coalition_members_validity_check CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to
  )
);

COMMENT ON TABLE elections_v2.coalition_members IS
  'Membership of V2 political parties in coalitions.';

CREATE TABLE IF NOT EXISTS elections_v2.candidacies (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  election_id BIGINT NOT NULL REFERENCES elections_v2.elections(id),
  round_id BIGINT REFERENCES elections_v2.election_rounds(id),
  person_id BIGINT REFERENCES elections_v2.persons(id),
  office_id BIGINT NOT NULL REFERENCES elections_v2.electoral_offices(id),
  district_id BIGINT REFERENCES elections_v2.electoral_districts(id),
  party_id BIGINT REFERENCES elections_v2.political_parties(id),
  coalition_id BIGINT REFERENCES elections_v2.coalitions(id),
  candidate_code TEXT NOT NULL,
  ballot_name TEXT NOT NULL,
  ballot_number TEXT,
  display_order INTEGER,
  campaign_color TEXT,
  campaign_logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT candidacies_public_id_unique UNIQUE (public_id),
  CONSTRAINT candidacies_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT candidacies_candidate_code_not_blank CHECK (length(btrim(candidate_code)) > 0),
  CONSTRAINT candidacies_ballot_name_not_blank CHECK (length(btrim(ballot_name)) > 0),
  CONSTRAINT candidacies_display_order_check CHECK (
    display_order IS NULL OR display_order > 0
  ),
  CONSTRAINT candidacies_status_check CHECK (
    status IN ('draft', 'submitted', 'pending', 'approved', 'rejected', 'withdrawn', 'archived')
  ),
  CONSTRAINT candidacies_party_or_coalition_check CHECK (
    party_id IS NULL OR coalition_id IS NULL
  ),
  CONSTRAINT candidacies_person_or_independent_label_check CHECK (
    person_id IS NOT NULL OR length(btrim(ballot_name)) > 0
  )
);

COMMENT ON TABLE elections_v2.candidacies IS
  'Electoral candidacy for a person or independent ballot identity in a specific election context.';

COMMIT;
