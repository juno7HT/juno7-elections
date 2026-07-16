-- Sprint 4 - Migration V2 006
-- Purpose: create non-redundant lookup and relationship indexes.
-- Dependencies:
-- - database/migrations/v2/002_create_election_core.sql
-- - database/migrations/v2/003_create_territorial_referential.sql
-- - database/migrations/v2/004_create_political_entities.sql
-- - database/migrations/v2/005_create_access_control.sql

BEGIN;

CREATE INDEX IF NOT EXISTS idx_v2_elections_status
  ON elections_v2.elections (status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_election_rounds_election_status
  ON elections_v2.election_rounds (election_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_electoral_offices_scope
  ON elections_v2.electoral_offices (scope_level, required_territory_level)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_v2_territories_parent
  ON elections_v2.territories (parent_id);

CREATE INDEX IF NOT EXISTS idx_v2_territories_path
  ON elections_v2.territories (path);

CREATE INDEX IF NOT EXISTS idx_v2_electoral_districts_election_office
  ON elections_v2.electoral_districts (election_id, office_id);

CREATE INDEX IF NOT EXISTS idx_v2_electoral_districts_primary_territory
  ON elections_v2.electoral_districts (primary_territory_id);

CREATE INDEX IF NOT EXISTS idx_v2_district_territories_territory
  ON elections_v2.electoral_district_territories (territory_id);

CREATE INDEX IF NOT EXISTS idx_v2_polling_centers_territory
  ON elections_v2.polling_centers (territory_id);

CREATE INDEX IF NOT EXISTS idx_v2_polling_stations_center
  ON elections_v2.polling_stations (polling_center_id);

CREATE INDEX IF NOT EXISTS idx_v2_persons_display_name
  ON elections_v2.persons (display_name);

CREATE INDEX IF NOT EXISTS idx_v2_political_parties_status
  ON elections_v2.political_parties (status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_coalitions_status
  ON elections_v2.coalitions (status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_coalition_members_party
  ON elections_v2.coalition_members (party_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_candidacies_context_code_unique
  ON elections_v2.candidacies (election_id, office_id, COALESCE(district_id, 0), candidate_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_v2_candidacies_context_ballot_number_unique
  ON elections_v2.candidacies (election_id, office_id, COALESCE(district_id, 0), ballot_number)
  WHERE ballot_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_v2_candidacies_round
  ON elections_v2.candidacies (round_id);

CREATE INDEX IF NOT EXISTS idx_v2_candidacies_status
  ON elections_v2.candidacies (status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_candidacies_office_district
  ON elections_v2.candidacies (office_id, district_id);

CREATE INDEX IF NOT EXISTS idx_v2_user_roles_user
  ON elections_v2.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_v2_user_roles_scope
  ON elections_v2.user_roles (election_id, territory_id);

CREATE INDEX IF NOT EXISTS idx_v2_audit_logs_entity_date
  ON elections_v2.audit_logs (entity_schema, entity_table, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_audit_logs_user_date
  ON elections_v2.audit_logs (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_audit_logs_action_date
  ON elections_v2.audit_logs (action, occurred_at DESC);

COMMIT;
