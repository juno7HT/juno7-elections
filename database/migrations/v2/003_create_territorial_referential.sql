-- Sprint 4 - Migration V2 003
-- Purpose: create territorial, district, center and station foundations.
-- Dependencies:
-- - database/migrations/v2/001_create_enums_and_helpers.sql
-- - database/migrations/v2/002_create_election_core.sql
-- Note: expected_pvs is intentionally deferred to Sprint 5.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.territories (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  parent_id BIGINT REFERENCES elections_v2.territories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT,
  territory_level TEXT NOT NULL,
  path TEXT NOT NULL,
  iso_code TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT territories_public_id_unique UNIQUE (public_id),
  CONSTRAINT territories_level_code_unique UNIQUE (territory_level, code),
  CONSTRAINT territories_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT territories_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT territories_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT territories_path_not_blank CHECK (length(btrim(path)) > 0),
  CONSTRAINT territories_level_check CHECK (
    territory_level IN ('country', 'department', 'arrondissement', 'commune', 'section')
  ),
  CONSTRAINT territories_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT territories_latitude_check CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT territories_longitude_check CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  )
);

COMMENT ON TABLE elections_v2.territories IS
  'Administrative territorial hierarchy for country, departments, communes and sections.';

CREATE TABLE IF NOT EXISTS elections_v2.electoral_districts (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  election_id BIGINT NOT NULL REFERENCES elections_v2.elections(id),
  office_id BIGINT NOT NULL REFERENCES elections_v2.electoral_offices(id),
  primary_territory_id BIGINT REFERENCES elections_v2.territories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  district_type TEXT NOT NULL,
  scope_level TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT electoral_districts_public_id_unique UNIQUE (public_id),
  CONSTRAINT electoral_districts_election_office_code_unique UNIQUE (election_id, office_id, code),
  CONSTRAINT electoral_districts_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT electoral_districts_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT electoral_districts_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT electoral_districts_type_check CHECK (
    district_type IN ('national', 'territorial', 'special')
  ),
  CONSTRAINT electoral_districts_scope_check CHECK (
    scope_level IN ('national', 'department', 'commune', 'section', 'district')
  )
);

COMMENT ON TABLE elections_v2.electoral_districts IS
  'Electoral districts, intentionally distinct from administrative territories.';

CREATE TABLE IF NOT EXISTS elections_v2.electoral_district_territories (
  id BIGSERIAL PRIMARY KEY,
  district_id BIGINT NOT NULL REFERENCES elections_v2.electoral_districts(id),
  territory_id BIGINT NOT NULL REFERENCES elections_v2.territories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT electoral_district_territories_unique UNIQUE (district_id, territory_id)
);

COMMENT ON TABLE elections_v2.electoral_district_territories IS
  'Join table for districts that cover one or more administrative territories.';

CREATE TABLE IF NOT EXISTS elections_v2.polling_centers (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  territory_id BIGINT NOT NULL REFERENCES elections_v2.territories(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT polling_centers_public_id_unique UNIQUE (public_id),
  CONSTRAINT polling_centers_territory_code_unique UNIQUE (territory_id, code),
  CONSTRAINT polling_centers_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT polling_centers_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT polling_centers_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT polling_centers_latitude_check CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT polling_centers_longitude_check CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  )
);

COMMENT ON TABLE elections_v2.polling_centers IS
  'Voting centers attached to administrative territories.';

CREATE TABLE IF NOT EXISTS elections_v2.polling_stations (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  polling_center_id BIGINT NOT NULL REFERENCES elections_v2.polling_centers(id),
  code TEXT NOT NULL,
  label TEXT,
  registered_voters INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT polling_stations_public_id_unique UNIQUE (public_id),
  CONSTRAINT polling_stations_center_code_unique UNIQUE (polling_center_id, code),
  CONSTRAINT polling_stations_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT polling_stations_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT polling_stations_registered_voters_check CHECK (
    registered_voters IS NULL OR registered_voters >= 0
  )
);

COMMENT ON TABLE elections_v2.polling_stations IS
  'Polling stations or bureaux de vote inside a voting center.';

COMMIT;
