-- Sprint 4 - Migration V2 005
-- Purpose: create minimal users, roles and append-only audit foundations.
-- Dependencies:
-- - database/migrations/v2/001_create_enums_and_helpers.sql
-- - database/migrations/v2/002_create_election_core.sql
-- - database/migrations/v2/003_create_territorial_referential.sql
-- Note: no clear-text password field is provided.

BEGIN;

CREATE TABLE IF NOT EXISTS elections_v2.users (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL,
  email TEXT,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT users_public_id_unique UNIQUE (public_id),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_public_id_format CHECK (
    length(btrim(public_id)) >= 12 AND public_id !~ '^[0-9]+$'
  ),
  CONSTRAINT users_display_name_not_blank CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT users_status_check CHECK (
    status IN ('active', 'inactive', 'disabled', 'archived')
  )
);

COMMENT ON TABLE elections_v2.users IS
  'Application users. password_hash is reserved for secure hashes only.';

CREATE TABLE IF NOT EXISTS elections_v2.roles (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_code_unique UNIQUE (code),
  CONSTRAINT roles_code_not_blank CHECK (length(btrim(code)) > 0),
  CONSTRAINT roles_name_not_blank CHECK (length(btrim(name)) > 0)
);

COMMENT ON TABLE elections_v2.roles IS
  'Role referential for MVP access control.';

CREATE TABLE IF NOT EXISTS elections_v2.user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES elections_v2.users(id),
  role_id BIGINT NOT NULL REFERENCES elections_v2.roles(id),
  election_id BIGINT REFERENCES elections_v2.elections(id),
  territory_id BIGINT REFERENCES elections_v2.territories(id),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, election_id, territory_id, valid_from),
  CONSTRAINT user_roles_validity_check CHECK (
    valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to
  )
);

COMMENT ON TABLE elections_v2.user_roles IS
  'User role assignments with optional election and territory scope.';

CREATE TABLE IF NOT EXISTS elections_v2.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id BIGINT REFERENCES elections_v2.users(id),
  role_code TEXT,
  action TEXT NOT NULL,
  entity_schema TEXT NOT NULL DEFAULT 'elections_v2',
  entity_table TEXT NOT NULL,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  source TEXT,
  ip_address INET,
  session_id TEXT,
  request_id TEXT,
  technical_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_logs_action_check CHECK (
    action IN (
      'create',
      'entry',
      'update',
      'verify',
      'approve',
      'reject',
      'correct',
      'publish',
      'withdraw_publication',
      'archive',
      'login',
      'logout'
    )
  ),
  CONSTRAINT audit_logs_entity_table_not_blank CHECK (length(btrim(entity_table)) > 0)
);

COMMENT ON TABLE elections_v2.audit_logs IS
  'Append-only application audit log. Immutability is enforced by application governance in this sprint.';

COMMIT;
