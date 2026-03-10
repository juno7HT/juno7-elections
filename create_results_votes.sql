CREATE TABLE IF NOT EXISTS results_votes (
    id SERIAL PRIMARY KEY,
    election_id TEXT NOT NULL,
    dept_name TEXT NOT NULL,
    commune_name TEXT NOT NULL,
    section_name TEXT NOT NULL,
    centre_vote_name TEXT,
    bv_no TEXT,
    pv_code TEXT,
    candidate TEXT NOT NULL,
    votes INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (election_id, pv_code, candidate)
);
