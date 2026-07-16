\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF current_database() = 'elections2026' OR current_database() !~ '(test|local)' THEN
    RAISE EXCEPTION 'Refusing unsafe database %', current_database();
  END IF;
  IF host(inet_server_addr()) <> '127.0.0.1' THEN
    RAISE EXCEPTION 'Refusing non-local server %:%', inet_server_addr(), inet_server_port();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.expect_rejected(p_label text, p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'UNEXPECTED_SUCCESS: %', p_label;
EXCEPTION WHEN integrity_constraint_violation THEN
  RAISE NOTICE 'PASS: % rejected with SQLSTATE % (%).', p_label, SQLSTATE, SQLERRM;
END;
$$;

DO $$
DECLARE
  v_country_id bigint;
  v_election_id bigint;
  v_round_id bigint;
  v_office_id bigint;
  v_district_id bigint;
  v_center_id bigint;
  v_station_id bigint;
  v_expected_pv_id bigint;
  v_submission_id bigint;
  v_result_id bigint;
  v_person_id bigint;
  v_party_id bigint;
  v_coalition_id bigint;
  v_candidacy_id bigint;
  v_user_id bigint;
  v_role_id bigint;
BEGIN
  INSERT INTO elections_v2.territories (public_id, code, name, normalized_name, territory_level, path)
  VALUES ('ctest_country_001', 'CTEST-CTRY', 'Fictional Constraint Country', 'fictional constraint country', 'country', '/CTEST-CTRY')
  RETURNING id INTO v_country_id;

  INSERT INTO elections_v2.elections (public_id, code, name, election_type, status)
  VALUES ('ctest_election_01', 'CTEST-ELECT', 'Fictional Constraint Election', 'general', 'preparation')
  RETURNING id INTO v_election_id;

  INSERT INTO elections_v2.election_rounds (public_id, election_id, round_number, label, status)
  VALUES ('ctest_round_001', v_election_id, 1, 'Fictional Round', 'preparation')
  RETURNING id INTO v_round_id;

  INSERT INTO elections_v2.electoral_offices (public_id, code, name, scope_level)
  VALUES ('ctest_office_01', 'CTEST-OFF', 'Fictional Office', 'national')
  RETURNING id INTO v_office_id;

  INSERT INTO elections_v2.electoral_districts (public_id, election_id, office_id, primary_territory_id, code, name, district_type, scope_level)
  VALUES ('ctest_district1', v_election_id, v_office_id, v_country_id, 'CTEST-DIST', 'Fictional District', 'national', 'national')
  RETURNING id INTO v_district_id;

  INSERT INTO elections_v2.polling_centers (public_id, territory_id, code, name)
  VALUES ('ctest_center_01', v_country_id, 'CTEST-CENTER', 'Fictional Center')
  RETURNING id INTO v_center_id;

  INSERT INTO elections_v2.polling_stations (public_id, polling_center_id, code, label, registered_voters)
  VALUES ('ctest_station01', v_center_id, 'CTEST-BV', 'Fictional Station', 100)
  RETURNING id INTO v_station_id;

  INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code)
  VALUES ('ctest_expected1', v_election_id, v_round_id, v_office_id, v_district_id, v_station_id, 'CTEST-PV')
  RETURNING id INTO v_expected_pv_id;

  INSERT INTO elections_v2.pv_submissions (public_id, expected_pv_id, election_id, round_id, received_pv_code, transmission_channel)
  VALUES ('ctest_submission1', v_expected_pv_id, v_election_id, v_round_id, 'CTEST-PV', 'manual')
  RETURNING id INTO v_submission_id;

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters)
  VALUES ('ctest_result_001', v_submission_id, 'entered', 1, 'active', 100, 50)
  RETURNING id INTO v_result_id;

  INSERT INTO elections_v2.persons (public_id, display_name)
  VALUES ('ctest_person_001', 'Fictional Constraint Candidate')
  RETURNING id INTO v_person_id;

  INSERT INTO elections_v2.political_parties (public_id, name, acronym, status)
  VALUES ('ctest_party_001', 'Fictional Constraint Party', 'FCP', 'active')
  RETURNING id INTO v_party_id;

  INSERT INTO elections_v2.coalitions (public_id, name, acronym, status)
  VALUES ('ctest_coalition', 'Fictional Constraint Coalition', 'FCC', 'active')
  RETURNING id INTO v_coalition_id;

  INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, candidate_code, ballot_name, status)
  VALUES ('ctest_candidacy', v_election_id, v_round_id, v_person_id, v_office_id, v_district_id, v_party_id, 'CTEST-CAND', 'Fictional Constraint Candidate', 'approved')
  RETURNING id INTO v_candidacy_id;

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('ctest_vote_001', v_result_id, v_candidacy_id, 10);

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('ctest_user_001', 'ctest-user@example.invalid', 'Fictional Constraint User', 'active')
  RETURNING id INTO v_user_id;

  INSERT INTO elections_v2.roles (code, name)
  VALUES ('CTEST_ROLE', 'Fictional Constraint Role')
  RETURNING id INTO v_role_id;

  INSERT INTO elections_v2.user_roles (user_id, role_id, election_id, territory_id, valid_from)
  VALUES (v_user_id, v_role_id, v_election_id, v_country_id, TIMESTAMPTZ '2026-01-01 00:00:00+00');

  PERFORM pg_temp.expect_rejected('vote negatif', format('INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes) VALUES (%L, %s, %s, -1)', 'ctest_vote_neg', v_result_id, v_candidacy_id));
  PERFORM pg_temp.expect_rejected('PV attendu duplique', format('INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code) VALUES (%L, %s, %s, %s, %s, %s, %L)', 'ctest_expected_dup', v_election_id, v_round_id, v_office_id, v_district_id, v_station_id, 'CTEST-PV-DUP'));
  PERFORM pg_temp.expect_rejected('resultat candidat duplique', format('INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes) VALUES (%L, %s, %s, 11)', 'ctest_vote_dup', v_result_id, v_candidacy_id));
  PERFORM pg_temp.expect_rejected('votants superieurs aux inscrits', format('INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, is_active) VALUES (%L, %s, %L, 2, %L, 100, 101, false)', 'ctest_result_bad_voters', v_submission_id, 'entered', 'active'));
  PERFORM pg_temp.expect_rejected('code vide', format('INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code) VALUES (%L, %s, %s, %s, %s, %s, %L)', 'ctest_expected_blank', v_election_id, v_round_id, v_office_id, v_district_id, v_station_id, '   '));
  PERFORM pg_temp.expect_rejected('candidature avec parti et coalition simultanement', format('INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, coalition_id, candidate_code, ballot_name, status) VALUES (%L, %s, %s, %s, %s, %s, %s, %s, %L, %L, %L)', 'ctest_cand_both', v_election_id, v_round_id, v_person_id, v_office_id, v_district_id, v_party_id, v_coalition_id, 'CTEST-BOTH', 'Fictional Both', 'approved'));
  PERFORM pg_temp.expect_rejected('tour duplique', format('INSERT INTO elections_v2.election_rounds (public_id, election_id, round_number, label, status) VALUES (%L, %s, 1, %L, %L)', 'ctest_round_dup', v_election_id, 'Fictional Round Duplicate', 'preparation'));
  PERFORM pg_temp.expect_rejected('role utilisateur duplique', format('INSERT INTO elections_v2.user_roles (user_id, role_id, election_id, territory_id, valid_from) VALUES (%s, %s, %s, %s, TIMESTAMPTZ %L)', v_user_id, v_role_id, v_election_id, v_country_id, '2026-01-01 00:00:00+00'));
  PERFORM pg_temp.expect_rejected('correction sans motif', format('INSERT INTO elections_v2.result_corrections (public_id, correction_target_type, correction_target_id, source_pv_result_id, requested_by_user_id, reason) VALUES (%L, %L, %s, %s, %s, %L)', 'ctest_correction_blank', 'pv_result', v_result_id, v_result_id, v_user_id, '   '));
  PERFORM pg_temp.expect_rejected('version non positive', format('INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, is_active) VALUES (%L, %s, %L, 0, %L, false)', 'ctest_result_bad_version', v_submission_id, 'verified', 'active'));
  PERFORM pg_temp.expect_rejected('FK vers bureau inexistant', format('INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code) VALUES (%L, %s, %s, %s, %s, 999999999, %L)', 'ctest_expected_bad_fk', v_election_id, v_round_id, v_office_id, v_district_id, 'CTEST-BAD-FK'));
  PERFORM pg_temp.expect_rejected('statut invalide', format('INSERT INTO elections_v2.pv_submissions (public_id, expected_pv_id, election_id, round_id, received_pv_code, transmission_channel, processing_status) VALUES (%L, %s, %s, %s, %L, %L, %L)', 'ctest_submission_bad_status', v_expected_pv_id, v_election_id, v_round_id, 'CTEST-PV', 'manual', 'bad_status'));
  PERFORM pg_temp.expect_rejected('public_id purement numerique', 'INSERT INTO elections_v2.elections (public_id, code, name, election_type, status) VALUES (''123456789012'', ''CTEST-NUM'', ''Fictional Numeric'', ''general'', ''preparation'')');
END $$;

ROLLBACK;
