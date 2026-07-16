\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() = 'elections2026' OR current_database() !~ '(test|local)' THEN
    RAISE EXCEPTION 'Refusing unsafe database %', current_database();
  END IF;
  IF host(inet_server_addr()) <> '127.0.0.1' THEN
    RAISE EXCEPTION 'Refusing non-local server %:%', inet_server_addr(), inet_server_port();
  END IF;
END $$;

DO $$
DECLARE
  v_country_id bigint;
  v_local_id bigint;
  v_election_id bigint;
  v_round_id bigint;
  v_office_id bigint;
  v_district_id bigint;
  v_center_id bigint;
  v_station_id bigint;
  v_user_entry_id bigint;
  v_user_validator_id bigint;
  v_user_publisher_id bigint;
  v_person_a_id bigint;
  v_person_b_id bigint;
  v_party_a_id bigint;
  v_party_b_id bigint;
  v_cand_a_id bigint;
  v_cand_b_id bigint;
  v_expected_pv_id bigint;
  v_submission_id bigint;
  v_document_id bigint;
  v_result_v1_id bigint;
  v_result_v2_id bigint;
  v_result_retained_id bigint;
  v_anomaly_id bigint;
  v_correction_id bigint;
  v_decision_id bigint;
  v_batch_id bigint;
BEGIN
  INSERT INTO elections_v2.territories (public_id, code, name, normalized_name, territory_level, path)
  VALUES ('demo_v2_country', 'DEMO-V2-CTRY', 'Fictional Demo Country', 'fictional demo country', 'country', '/DEMO-V2-CTRY')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_country_id FROM elections_v2.territories WHERE public_id = 'demo_v2_country';

  INSERT INTO elections_v2.territories (public_id, parent_id, code, name, normalized_name, territory_level, path)
  VALUES ('demo_v2_local01', v_country_id, 'DEMO-V2-COMM', 'Fictional Demo Commune', 'fictional demo commune', 'commune', '/DEMO-V2-CTRY/DEMO-V2-COMM')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_local_id FROM elections_v2.territories WHERE public_id = 'demo_v2_local01';

  INSERT INTO elections_v2.elections (public_id, code, name, election_type, status)
  VALUES ('demo_v2_elect01', 'DEMO-V2-ELECT', 'Fictional Demo Election', 'general', 'preparation')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_election_id FROM elections_v2.elections WHERE public_id = 'demo_v2_elect01';

  INSERT INTO elections_v2.election_rounds (public_id, election_id, round_number, label, status)
  VALUES ('demo_v2_round01', v_election_id, 1, 'Fictional Demo Round 1', 'verification')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_round_id FROM elections_v2.election_rounds WHERE public_id = 'demo_v2_round01';

  INSERT INTO elections_v2.electoral_offices (public_id, code, name, scope_level)
  VALUES ('demo_v2_office', 'DEMO-V2-OFF', 'Fictional Demo Office', 'national')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_office_id FROM elections_v2.electoral_offices WHERE public_id = 'demo_v2_office';

  INSERT INTO elections_v2.electoral_districts (public_id, election_id, office_id, primary_territory_id, code, name, district_type, scope_level)
  VALUES ('demo_v2_district', v_election_id, v_office_id, v_country_id, 'DEMO-V2-DIST', 'Fictional Demo District', 'national', 'national')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_district_id FROM elections_v2.electoral_districts WHERE public_id = 'demo_v2_district';

  INSERT INTO elections_v2.polling_centers (public_id, territory_id, code, name)
  VALUES ('demo_v2_center', v_local_id, 'DEMO-V2-CENTER', 'Fictional Demo Center')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_center_id FROM elections_v2.polling_centers WHERE public_id = 'demo_v2_center';

  INSERT INTO elections_v2.polling_stations (public_id, polling_center_id, code, label, registered_voters)
  VALUES ('demo_v2_station', v_center_id, 'DEMO-V2-BV', 'Fictional Demo Station', 100)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_station_id FROM elections_v2.polling_stations WHERE public_id = 'demo_v2_station';

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('demo_v2_user_entry', 'demo-v2-entry@example.invalid', 'Fictional Demo Entry User', 'active')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_user_entry_id FROM elections_v2.users WHERE public_id = 'demo_v2_user_entry';

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('demo_v2_user_valid', 'demo-v2-validator@example.invalid', 'Fictional Demo Validator User', 'active')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_user_validator_id FROM elections_v2.users WHERE public_id = 'demo_v2_user_valid';

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('demo_v2_user_publi', 'demo-v2-publisher@example.invalid', 'Fictional Demo Publisher User', 'active')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_user_publisher_id FROM elections_v2.users WHERE public_id = 'demo_v2_user_publi';

  INSERT INTO elections_v2.persons (public_id, display_name)
  VALUES ('demo_v2_person_a', 'Fictional Demo Candidate A')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_person_a_id FROM elections_v2.persons WHERE public_id = 'demo_v2_person_a';

  INSERT INTO elections_v2.persons (public_id, display_name)
  VALUES ('demo_v2_person_b', 'Fictional Demo Candidate B')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_person_b_id FROM elections_v2.persons WHERE public_id = 'demo_v2_person_b';

  INSERT INTO elections_v2.political_parties (public_id, name, acronym, status)
  VALUES ('demo_v2_party_a', 'Fictional Demo Party A', 'DVA', 'active')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_party_a_id FROM elections_v2.political_parties WHERE public_id = 'demo_v2_party_a';

  INSERT INTO elections_v2.political_parties (public_id, name, acronym, status)
  VALUES ('demo_v2_party_b', 'Fictional Demo Party B', 'DVB', 'active')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_party_b_id FROM elections_v2.political_parties WHERE public_id = 'demo_v2_party_b';

  INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, candidate_code, ballot_name, status)
  VALUES ('demo_v2_cand_a1', v_election_id, v_round_id, v_person_a_id, v_office_id, v_district_id, v_party_a_id, 'DEMO-V2-A', 'Fictional Demo Candidate A', 'approved')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_cand_a_id FROM elections_v2.candidacies WHERE public_id = 'demo_v2_cand_a1';

  INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, candidate_code, ballot_name, status)
  VALUES ('demo_v2_cand_b1', v_election_id, v_round_id, v_person_b_id, v_office_id, v_district_id, v_party_b_id, 'DEMO-V2-B', 'Fictional Demo Candidate B', 'approved')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_cand_b_id FROM elections_v2.candidacies WHERE public_id = 'demo_v2_cand_b1';

  INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code)
  VALUES ('demo_v2_expected', v_election_id, v_round_id, v_office_id, v_district_id, v_station_id, 'DEMO-V2-PV')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_expected_pv_id FROM elections_v2.expected_pvs WHERE public_id = 'demo_v2_expected';

  INSERT INTO elections_v2.pv_submissions (public_id, expected_pv_id, election_id, round_id, received_pv_code, transmission_channel, source_user_id, processing_status, document_quality)
  VALUES ('demo_v2_submission', v_expected_pv_id, v_election_id, v_round_id, 'DEMO-V2-PV', 'manual', v_user_entry_id, 'entered', 'readable')
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_submission_id FROM elections_v2.pv_submissions WHERE public_id = 'demo_v2_submission';

  INSERT INTO elections_v2.pv_documents (public_id, pv_submission_id, storage_uri, mime_type, file_size_bytes, checksum, page_number, created_by_user_id)
  VALUES ('demo_v2_document', v_submission_id, 'memory://demo-v2/fictitious-pv.pdf', 'application/pdf', 2048, 'demo-v2-fake-checksum', 1, v_user_entry_id)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_document_id FROM elections_v2.pv_documents WHERE public_id = 'demo_v2_document';

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('demo_v2_enter_v1', v_submission_id, 'entered', 1, 'superseded', 100, 70, 70, 70, 'manual_entry', v_user_entry_id, false)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_result_v1_id FROM elections_v2.pv_results WHERE public_id = 'demo_v2_enter_v1';

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('demo_v2_vote_a_v1', v_result_v1_id, v_cand_a_id, 40),
         ('demo_v2_vote_b_v1', v_result_v1_id, v_cand_b_id, 30)
  ON CONFLICT (public_id) DO NOTHING;

  INSERT INTO elections_v2.pv_anomalies (public_id, pv_submission_id, pv_result_id, pv_document_id, anomaly_type, severity, description, anomaly_status, assigned_to_user_id, resolution_notes, closed_at)
  VALUES ('demo_v2_anomaly', v_submission_id, v_result_v1_id, v_document_id, 'inconsistent_total', 'medium', 'Fictional demo discrepancy.', 'resolved', v_user_validator_id, 'Resolved by corrected version.', now())
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_anomaly_id FROM elections_v2.pv_anomalies WHERE public_id = 'demo_v2_anomaly';

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('demo_v2_enter_v2', v_submission_id, 'entered', 2, 'active', 100, 72, 72, 72, 'correction', v_user_validator_id, true)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_result_v2_id FROM elections_v2.pv_results WHERE public_id = 'demo_v2_enter_v2';

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('demo_v2_vote_a_v2', v_result_v2_id, v_cand_a_id, 42),
         ('demo_v2_vote_b_v2', v_result_v2_id, v_cand_b_id, 30)
  ON CONFLICT (public_id) DO NOTHING;

  INSERT INTO elections_v2.result_corrections (public_id, correction_target_type, correction_target_id, source_pv_result_id, target_pv_result_id, requested_by_user_id, approved_by_user_id, anomaly_id, reason, correction_status, approved_at, applied_at)
  VALUES ('demo_v2_correction', 'pv_result', v_result_v1_id, v_result_v1_id, v_result_v2_id, v_user_validator_id, v_user_validator_id, v_anomaly_id, 'Fictional demo correction.', 'applied', now(), now())
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_correction_id FROM elections_v2.result_corrections WHERE public_id = 'demo_v2_correction';

  INSERT INTO elections_v2.result_correction_items (correction_id, field_name, old_value, new_value, justification, item_order, validation_status)
  VALUES (v_correction_id, 'candidate_votes:DEMO-V2-A', '{"votes":40}', '{"votes":42}', 'Fictional demo recount.', 1, 'validated')
  ON CONFLICT (correction_id, item_order) DO NOTHING;

  INSERT INTO elections_v2.pv_validations (public_id, pv_submission_id, pv_result_id, validator_user_id, validation_type, validation_decision, comment, validated_version)
  VALUES ('demo_v2_validation1', v_submission_id, v_result_v1_id, v_user_validator_id, 'arithmetic_review', 'needs_correction', 'Fictional correction required.', 1),
         ('demo_v2_validation2', v_submission_id, v_result_v2_id, v_user_validator_id, 'supervisor_review', 'approved', 'Fictional corrected version approved.', 2)
  ON CONFLICT (public_id) DO NOTHING;

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('demo_v2_retained', v_submission_id, 'retained', 1, 'active', 100, 72, 72, 72, 'verification', v_user_validator_id, true)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_result_v2_id FROM elections_v2.pv_results WHERE public_id = 'demo_v2_retained';

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('demo_v2_vote_a_ret', v_result_v2_id, v_cand_a_id, 42),
         ('demo_v2_vote_b_ret', v_result_v2_id, v_cand_b_id, 30)
  ON CONFLICT (public_id) DO NOTHING;

  INSERT INTO elections_v2.pv_decisions (public_id, pv_submission_id, pv_result_id, decision_type, decided_by_user_id, role_code, reason, target_version)
  VALUES ('demo_v2_decision', v_submission_id, v_result_v2_id, 'include', v_user_validator_id, 'fictional_supervisor', 'Fictional demo inclusion.', 1)
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_decision_id FROM elections_v2.pv_decisions WHERE public_id = 'demo_v2_decision';

  INSERT INTO elections_v2.publication_batches (public_id, election_id, round_id, publication_type, version_number, publication_status, prepared_by_user_id, approved_by_user_id, approved_at, published_at)
  VALUES ('demo_v2_batch001', v_election_id, v_round_id, 'provisional', 1, 'published', v_user_publisher_id, v_user_validator_id, now(), now())
  ON CONFLICT (public_id) DO NOTHING;
  SELECT id INTO v_batch_id FROM elections_v2.publication_batches WHERE public_id = 'demo_v2_batch001';

  INSERT INTO elections_v2.publication_batch_items (publication_batch_id, item_type, pv_result_id, item_order, metadata)
  VALUES (v_batch_id, 'pv_result', v_result_v2_id, 1, jsonb_build_object('retained_only', true, 'decision_id', v_decision_id))
  ON CONFLICT (publication_batch_id, item_order) DO NOTHING;

  INSERT INTO elections_v2.published_result_snapshots (public_id, publication_batch_id, aggregation_level, territory_id, district_id, office_id, candidacy_id, votes, registered_voters, voters, valid_ballots, expressed_votes, percentage, ranking, metadata)
  VALUES ('demo_v2_snapshot_a', v_batch_id, 'polling_station', v_local_id, v_district_id, v_office_id, v_cand_a_id, 42, 100, 72, 72, 72, 58.333333, 1, jsonb_build_object('source_pv_result_id', v_result_v2_id)),
         ('demo_v2_snapshot_b', v_batch_id, 'polling_station', v_local_id, v_district_id, v_office_id, v_cand_b_id, 30, 100, 72, 72, 72, 41.666667, 2, jsonb_build_object('source_pv_result_id', v_result_v2_id))
  ON CONFLICT (public_id) DO NOTHING;

  INSERT INTO elections_v2.audit_logs (user_id, role_code, action, entity_table, entity_id, reason, source, request_id, technical_metadata)
  SELECT v_user_entry_id, 'fictional_entry_agent', 'entry', 'pv_submissions', v_submission_id::text, 'Fictional demo PV received.', 'database/testing/seed-v2-demo.sql', 'demo-v2-audit-001', jsonb_build_object('public_id', 'demo_v2_submission')
  WHERE NOT EXISTS (SELECT 1 FROM elections_v2.audit_logs WHERE request_id = 'demo-v2-audit-001');

  INSERT INTO elections_v2.audit_logs (user_id, role_code, action, entity_table, entity_id, reason, source, request_id, technical_metadata)
  SELECT v_user_validator_id, 'fictional_validator', 'verify', 'pv_results', v_result_v1_id::text, 'Fictional demo arithmetic review.', 'database/testing/seed-v2-demo.sql', 'demo-v2-audit-002', jsonb_build_object('public_id', 'demo_v2_enter_v1')
  WHERE NOT EXISTS (SELECT 1 FROM elections_v2.audit_logs WHERE request_id = 'demo-v2-audit-002');

  INSERT INTO elections_v2.audit_logs (user_id, role_code, action, entity_table, entity_id, reason, source, request_id, technical_metadata)
  SELECT v_user_validator_id, 'fictional_validator', 'correct', 'result_corrections', v_correction_id::text, 'Fictional demo correction applied.', 'database/testing/seed-v2-demo.sql', 'demo-v2-audit-003', jsonb_build_object('public_id', 'demo_v2_correction')
  WHERE NOT EXISTS (SELECT 1 FROM elections_v2.audit_logs WHERE request_id = 'demo-v2-audit-003');

  INSERT INTO elections_v2.audit_logs (user_id, role_code, action, entity_table, entity_id, reason, source, request_id, technical_metadata)
  SELECT v_user_publisher_id, 'fictional_publisher', 'publish', 'publication_batches', v_batch_id::text, 'Fictional demo publication batch.', 'database/testing/seed-v2-demo.sql', 'demo-v2-audit-004', jsonb_build_object('public_id', 'demo_v2_batch001')
  WHERE NOT EXISTS (SELECT 1 FROM elections_v2.audit_logs WHERE request_id = 'demo-v2-audit-004');
END $$;

SELECT 'demo_v2_seed_complete' AS status;
