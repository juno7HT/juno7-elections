-- Juno7 Elections staging seed
-- DONNEES DE DEMONSTRATION uniquement : aucun nom reel, aucune donnee de production.

BEGIN;

INSERT INTO political_parties (name, acronym, color, logo, address, phone, email)
VALUES
  ('Parti Demonstration Soleil', 'PDS', '#2563eb', NULL, NULL, NULL, NULL),
  ('Alliance Demo Citoyenne', 'ADC', '#16a34a', NULL, NULL, NULL, NULL)
ON CONFLICT (name) DO UPDATE SET
  acronym = EXCLUDED.acronym,
  color = EXCLUDED.color;

INSERT INTO candidates (
  first_name, last_name, ballot_name, office, department, commune,
  photo, party_id, candidate_code, scope_level, country_name,
  dept_name, commune_name, section_name, status, is_active
)
VALUES
  ('Alex', 'Modele', 'Alex Modele', 'president', NULL, NULL, NULL,
    (SELECT id FROM political_parties WHERE acronym = 'PDS'), 'CAND-DEMO-01', 'national', 'Haiti', NULL, NULL, NULL, 'approved', TRUE),
  ('Mira', 'Exemple', 'Mira Exemple', 'president', NULL, NULL, NULL,
    (SELECT id FROM political_parties WHERE acronym = 'ADC'), 'CAND-DEMO-02', 'national', 'Haiti', NULL, NULL, NULL, 'approved', TRUE),
  ('Noe', 'Temoin', 'Noe Temoin', 'president', NULL, NULL, NULL,
    NULL, 'CAND-DEMO-03', 'national', 'Haiti', NULL, NULL, NULL, 'approved', TRUE)
ON CONFLICT (candidate_code) DO UPDATE SET
  ballot_name = EXCLUDED.ballot_name,
  office = EXCLUDED.office,
  party_id = EXCLUDED.party_id,
  is_active = EXCLUDED.is_active;

INSERT INTO locations_electoral_units (
  dept_name, commune_name, section_name, centre_vote_name, bv_no, pv_code, source_doc, is_active
)
VALUES
  ('Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A1', 'Centre Demo Alpha 1', 'BV-001', 'PV-DEMO-001', 'DONNEES DE DEMONSTRATION', TRUE),
  ('Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A2', 'Centre Demo Alpha 2', 'BV-002', 'PV-DEMO-002', 'DONNEES DE DEMONSTRATION', TRUE),
  ('Departement Demo Sud', 'Commune Demo Beta', 'Section Demo B1', 'Centre Demo Beta 1', 'BV-003', 'PV-DEMO-003', 'DONNEES DE DEMONSTRATION', TRUE)
ON CONFLICT (pv_code) DO UPDATE SET
  dept_name = EXCLUDED.dept_name,
  commune_name = EXCLUDED.commune_name,
  section_name = EXCLUDED.section_name,
  centre_vote_name = EXCLUDED.centre_vote_name,
  bv_no = EXCLUDED.bv_no,
  source_doc = EXCLUDED.source_doc,
  is_active = EXCLUDED.is_active;

INSERT INTO results_votes (
  election_id, dept_name, commune_name, section_name, centre_vote_name, bv_no, pv_code, candidate, votes
)
VALUES
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A1', 'Centre Demo Alpha 1', 'BV-001', 'PV-DEMO-001', 'CAND-DEMO-01', 120),
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A1', 'Centre Demo Alpha 1', 'BV-001', 'PV-DEMO-001', 'CAND-DEMO-02', 90),
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A1', 'Centre Demo Alpha 1', 'BV-001', 'PV-DEMO-001', 'CAND-DEMO-03', 30),
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A2', 'Centre Demo Alpha 2', 'BV-002', 'PV-DEMO-002', 'CAND-DEMO-01', 80),
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A2', 'Centre Demo Alpha 2', 'BV-002', 'PV-DEMO-002', 'CAND-DEMO-02', 110),
  (1, 'Departement Demo Nord', 'Commune Demo Alpha', 'Section Demo A2', 'Centre Demo Alpha 2', 'BV-002', 'PV-DEMO-002', 'CAND-DEMO-03', 20),
  (1, 'Departement Demo Sud', 'Commune Demo Beta', 'Section Demo B1', 'Centre Demo Beta 1', 'BV-003', 'PV-DEMO-003', 'CAND-DEMO-01', 70),
  (1, 'Departement Demo Sud', 'Commune Demo Beta', 'Section Demo B1', 'Centre Demo Beta 1', 'BV-003', 'PV-DEMO-003', 'CAND-DEMO-02', 75),
  (1, 'Departement Demo Sud', 'Commune Demo Beta', 'Section Demo B1', 'Centre Demo Beta 1', 'BV-003', 'PV-DEMO-003', 'CAND-DEMO-03', 25)
ON CONFLICT (election_id, pv_code, candidate) DO UPDATE SET
  dept_name = EXCLUDED.dept_name,
  commune_name = EXCLUDED.commune_name,
  section_name = EXCLUDED.section_name,
  centre_vote_name = EXCLUDED.centre_vote_name,
  bv_no = EXCLUDED.bv_no,
  votes = EXCLUDED.votes,
  updated_at = NOW();

INSERT INTO results_department (dept_iso, candidate, votes)
VALUES
  ('DEMO-NORD', 'CAND-DEMO-01', 200),
  ('DEMO-NORD', 'CAND-DEMO-02', 200),
  ('DEMO-NORD', 'CAND-DEMO-03', 50),
  ('DEMO-SUD', 'CAND-DEMO-01', 70),
  ('DEMO-SUD', 'CAND-DEMO-02', 75),
  ('DEMO-SUD', 'CAND-DEMO-03', 25)
ON CONFLICT (dept_iso, candidate) DO UPDATE SET
  votes = EXCLUDED.votes,
  updated_at = NOW();

INSERT INTO election_reports (
  election_date, round_label, election_type, office, territory_level, territory_name,
  pv_not_received, pv_excluded, pv_included, expressed_choice, no_candidate_votes,
  valid_votes, null_votes, source_note
)
SELECT
  DATE '2026-07-16', 'Tour demonstration', 'Election demonstration', 'president',
  'national', 'Territoire Demo', 0, 0, 3, 635, 0, 620, 15,
  'DONNEES DE DEMONSTRATION'
WHERE NOT EXISTS (
  SELECT 1 FROM election_reports WHERE source_note = 'DONNEES DE DEMONSTRATION'
);

INSERT INTO election_report_candidates (report_id, candidate_no, party_name, candidate_name, votes, pct)
SELECT r.id, v.candidate_no, v.party_name, v.candidate_name, v.votes, v.pct
FROM election_reports r
CROSS JOIN (VALUES
  (1, 'Parti Demonstration Soleil', 'Alex Modele', 270, 43.5484),
  (2, 'Alliance Demo Citoyenne', 'Mira Exemple', 275, 44.3548),
  (3, 'Sans parti demo', 'Noe Temoin', 75, 12.0968)
) AS v(candidate_no, party_name, candidate_name, votes, pct)
WHERE r.source_note = 'DONNEES DE DEMONSTRATION'
  AND NOT EXISTS (
    SELECT 1
    FROM election_report_candidates erc
    WHERE erc.report_id = r.id
      AND erc.candidate_name = v.candidate_name
  );

COMMIT;
