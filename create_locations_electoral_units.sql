CREATE TABLE IF NOT EXISTS locations_electoral_units (
    id SERIAL PRIMARY KEY,
    dept_name TEXT NOT NULL,
    commune_name TEXT NOT NULL,
    section_name TEXT NOT NULL,
    centre_vote_name TEXT,
    bv_no TEXT,
    pv_code TEXT,
    source_doc TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
)
