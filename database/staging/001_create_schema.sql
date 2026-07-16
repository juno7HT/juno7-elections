-- Juno7 Elections staging schema
-- DONNEES DE DEMONSTRATION uniquement. Ne pas executer sur la base production.

BEGIN;

CREATE TABLE IF NOT EXISTS results_department (
  id SERIAL PRIMARY KEY,
  dept_iso TEXT NOT NULL,
  candidate TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0 CHECK (votes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dept_iso, candidate)
);

CREATE TABLE IF NOT EXISTS results_votes (
  id SERIAL PRIMARY KEY,
  election_id INTEGER NOT NULL CHECK (election_id > 0),
  dept_name TEXT NOT NULL,
  commune_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  centre_vote_name TEXT,
  bv_no TEXT,
  pv_code TEXT NOT NULL CHECK (length(btrim(pv_code)) > 0),
  candidate TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0 CHECK (votes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, pv_code, candidate)
);

CREATE TABLE IF NOT EXISTS locations_electoral_units (
  id SERIAL PRIMARY KEY,
  dept_name TEXT NOT NULL,
  commune_name TEXT NOT NULL,
  section_name TEXT NOT NULL,
  centre_vote_name TEXT,
  bv_no TEXT,
  pv_code TEXT,
  source_doc TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (pv_code)
);

CREATE TABLE IF NOT EXISTS political_parties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  acronym TEXT,
  color TEXT,
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name),
  UNIQUE (acronym)
);

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  ballot_name TEXT NOT NULL,
  office TEXT NOT NULL DEFAULT 'president',
  department TEXT,
  commune TEXT,
  photo TEXT,
  party_id INTEGER,
  candidate_code TEXT,
  scope_level TEXT,
  country_name TEXT DEFAULT 'Haiti',
  dept_name TEXT,
  commune_name TEXT,
  section_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (candidate_code)
);

CREATE TABLE IF NOT EXISTS election_reports (
  id SERIAL PRIMARY KEY,
  election_date DATE,
  round_label TEXT,
  election_type TEXT,
  office TEXT,
  territory_level TEXT,
  territory_name TEXT,
  pv_not_received INTEGER NOT NULL DEFAULT 0 CHECK (pv_not_received >= 0),
  pv_excluded INTEGER NOT NULL DEFAULT 0 CHECK (pv_excluded >= 0),
  pv_included INTEGER NOT NULL DEFAULT 0 CHECK (pv_included >= 0),
  expressed_choice INTEGER NOT NULL DEFAULT 0 CHECK (expressed_choice >= 0),
  no_candidate_votes INTEGER NOT NULL DEFAULT 0 CHECK (no_candidate_votes >= 0),
  valid_votes INTEGER NOT NULL DEFAULT 0 CHECK (valid_votes >= 0),
  null_votes INTEGER NOT NULL DEFAULT 0 CHECK (null_votes >= 0),
  source_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS election_report_candidates (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL,
  candidate_no INTEGER,
  party_name TEXT,
  candidate_name TEXT NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0 CHECK (votes >= 0),
  pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (pct >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
