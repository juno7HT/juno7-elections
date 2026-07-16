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
  v_result_v3_id bigint;
  v_anomaly_id bigint;
  v_correction_id bigint;
  v_decision_id bigint;
  v_batch_id bigint;
  v_snapshot_votes integer;
  v_later_votes integer;
  v_public_objects integer;
BEGIN
  INSERT INTO elections_v2.territories (public_id, code, name, normalized_name, territory_level, path)
  VALUES ('twf_country_001', 'TWF-CTRY', 'Fictional Workflow Country', 'fictional workflow country', 'country', '/TWF-CTRY')
  RETURNING id INTO v_country_id;

  INSERT INTO elections_v2.territories (public_id, parent_id, code, name, normalized_name, territory_level, path)
  VALUES ('twf_local_001', v_country_id, 'TWF-COMM', 'Fictional Workflow Commune', 'fictional workflow commune', 'commune', '/TWF-CTRY/TWF-COMM')
  RETURNING id INTO v_local_id;

  INSERT INTO elections_v2.elections (public_id, code, name, election_type, status)
  VALUES ('twf_election_01', 'TWF-ELECT', 'Fictional Workflow Election', 'general', 'preparation')
  RETURNING id INTO v_election_id;

  INSERT INTO elections_v2.election_rounds (public_id, election_id, round_number, label, status)
  VALUES ('twf_round_001', v_election_id, 1, 'Fictional Workflow Round', 'verification')
  RETURNING id INTO v_round_id;

  INSERT INTO elections_v2.electoral_offices (public_id, code, name, scope_level)
  VALUES ('twf_office_001', 'TWF-OFF', 'Fictional Workflow Office', 'national')
  RETURNING id INTO v_office_id;

  INSERT INTO elections_v2.electoral_districts (public_id, election_id, office_id, primary_territory_id, code, name, district_type, scope_level)
  VALUES ('twf_district01', v_election_id, v_office_id, v_country_id, 'TWF-DIST', 'Fictional Workflow District', 'national', 'national')
  RETURNING id INTO v_district_id;

  INSERT INTO elections_v2.polling_centers (public_id, territory_id, code, name)
  VALUES ('twf_center_001', v_local_id, 'TWF-CENTER', 'Fictional Workflow Center')
  RETURNING id INTO v_center_id;

  INSERT INTO elections_v2.polling_stations (public_id, polling_center_id, code, label, registered_voters)
  VALUES ('twf_station_01', v_center_id, 'TWF-BV', 'Fictional Workflow Station', 100)
  RETURNING id INTO v_station_id;

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('twf_user_entry', 'twf-entry@example.invalid', 'Fictional Workflow Entry', 'active')
  RETURNING id INTO v_user_entry_id;

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('twf_user_valid', 'twf-validator@example.invalid', 'Fictional Workflow Validator', 'active')
  RETURNING id INTO v_user_validator_id;

  INSERT INTO elections_v2.users (public_id, email, display_name, status)
  VALUES ('twf_user_publi', 'twf-publisher@example.invalid', 'Fictional Workflow Publisher', 'active')
  RETURNING id INTO v_user_publisher_id;

  INSERT INTO elections_v2.persons (public_id, display_name)
  VALUES ('twf_person_a01', 'Fictional Workflow Candidate A')
  RETURNING id INTO v_person_a_id;

  INSERT INTO elections_v2.persons (public_id, display_name)
  VALUES ('twf_person_b01', 'Fictional Workflow Candidate B')
  RETURNING id INTO v_person_b_id;

  INSERT INTO elections_v2.political_parties (public_id, name, acronym, status)
  VALUES ('twf_party_a01', 'Fictional Workflow Party A', 'TWA', 'active')
  RETURNING id INTO v_party_a_id;

  INSERT INTO elections_v2.political_parties (public_id, name, acronym, status)
  VALUES ('twf_party_b01', 'Fictional Workflow Party B', 'TWB', 'active')
  RETURNING id INTO v_party_b_id;

  INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, candidate_code, ballot_name, status)
  VALUES ('twf_candidacy_a', v_election_id, v_round_id, v_person_a_id, v_office_id, v_district_id, v_party_a_id, 'TWF-CAND-A', 'Fictional Workflow Candidate A', 'approved')
  RETURNING id INTO v_cand_a_id;

  INSERT INTO elections_v2.candidacies (public_id, election_id, round_id, person_id, office_id, district_id, party_id, candidate_code, ballot_name, status)
  VALUES ('twf_candidacy_b', v_election_id, v_round_id, v_person_b_id, v_office_id, v_district_id, v_party_b_id, 'TWF-CAND-B', 'Fictional Workflow Candidate B', 'approved')
  RETURNING id INTO v_cand_b_id;

  INSERT INTO elections_v2.expected_pvs (public_id, election_id, round_id, office_id, district_id, polling_station_id, expected_pv_code)
  VALUES ('twf_expected_01', v_election_id, v_round_id, v_office_id, v_district_id, v_station_id, 'TWF-PV-001')
  RETURNING id INTO v_expected_pv_id;

  INSERT INTO elections_v2.pv_submissions (public_id, expected_pv_id, election_id, round_id, received_pv_code, transmission_channel, source_user_id, processing_status, document_quality)
  VALUES ('twf_submission1', v_expected_pv_id, v_election_id, v_round_id, 'TWF-PV-001', 'manual', v_user_entry_id, 'entered', 'readable')
  RETURNING id INTO v_submission_id;

  INSERT INTO elections_v2.pv_documents (public_id, pv_submission_id, storage_uri, mime_type, file_size_bytes, checksum, page_number, created_by_user_id)
  VALUES ('twf_document_01', v_submission_id, 'memory://twf/fictitious-pv.pdf', 'application/pdf', 2048, 'twf-fake-checksum', 1, v_user_entry_id)
  RETURNING id INTO v_document_id;

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('twf_entered_v1', v_submission_id, 'entered', 1, 'superseded', 100, 70, 70, 70, 'manual_entry', v_user_entry_id, false)
  RETURNING id INTO v_result_v1_id;

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('twf_vote_a_v1', v_result_v1_id, v_cand_a_id, 40),
         ('twf_vote_b_v1', v_result_v1_id, v_cand_b_id, 30);

  INSERT INTO elections_v2.pv_validation_checks (public_id, pv_submission_id, pv_result_id, check_type, check_status, expected_value, observed_value)
  VALUES ('twf_check_001', v_submission_id, v_result_v1_id, 'candidate_sum_vs_document_total', 'failed', '{"expected":72}', '{"observed":70}');

  INSERT INTO elections_v2.pv_anomalies (public_id, pv_submission_id, pv_result_id, pv_document_id, anomaly_type, severity, description, anomaly_status, assigned_to_user_id, resolution_notes, closed_at)
  VALUES ('twf_anomaly_01', v_submission_id, v_result_v1_id, v_document_id, 'inconsistent_total', 'medium', 'Fictional workflow discrepancy.', 'resolved', v_user_validator_id, 'Resolved by corrected version.', now())
  RETURNING id INTO v_anomaly_id;

  INSERT INTO elections_v2.pv_validations (public_id, pv_submission_id, pv_result_id, validator_user_id, validation_type, validation_decision, comment, validated_version)
  VALUES ('twf_validation1', v_submission_id, v_result_v1_id, v_user_validator_id, 'arithmetic_review', 'needs_correction', 'Fictional correction required.', 1);

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('twf_entered_v2', v_submission_id, 'entered', 2, 'active', 100, 72, 72, 72, 'correction', v_user_validator_id, true)
  RETURNING id INTO v_result_v2_id;

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('twf_vote_a_v2', v_result_v2_id, v_cand_a_id, 42),
         ('twf_vote_b_v2', v_result_v2_id, v_cand_b_id, 30);

  INSERT INTO elections_v2.result_corrections (public_id, correction_target_type, correction_target_id, source_pv_result_id, target_pv_result_id, requested_by_user_id, approved_by_user_id, anomaly_id, reason, correction_status, approved_at, applied_at)
  VALUES ('twf_correction1', 'pv_result', v_result_v1_id, v_result_v1_id, v_result_v2_id, v_user_validator_id, v_user_validator_id, v_anomaly_id, 'Fictional workflow correction.', 'applied', now(), now())
  RETURNING id INTO v_result_v3_id;

  INSERT INTO elections_v2.result_correction_items (correction_id, field_name, old_value, new_value, justification, item_order, validation_status)
  VALUES (v_result_v3_id, 'candidate_votes:TWF-CAND-A', '{"votes":40}', '{"votes":42}', 'Fictional recount.', 1, 'validated');

  INSERT INTO elections_v2.pv_validations (public_id, pv_submission_id, pv_result_id, validator_user_id, validation_type, validation_decision, comment, validated_version)
  VALUES ('twf_validation2', v_submission_id, v_result_v2_id, v_user_validator_id, 'supervisor_review', 'approved', 'Fictional corrected version approved.', 2);

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('twf_retained_01', v_submission_id, 'retained', 1, 'active', 100, 72, 72, 72, 'verification', v_user_validator_id, true)
  RETURNING id INTO v_result_retained_id;

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('twf_vote_a_retained', v_result_retained_id, v_cand_a_id, 42),
         ('twf_vote_b_retained', v_result_retained_id, v_cand_b_id, 30);

  INSERT INTO elections_v2.pv_decisions (public_id, pv_submission_id, pv_result_id, decision_type, decided_by_user_id, role_code, reason, target_version)
  VALUES ('twf_decision_inc', v_submission_id, v_result_retained_id, 'include', v_user_validator_id, 'fictional_supervisor', 'Fictional inclusion.', 1)
  RETURNING id INTO v_decision_id;

  INSERT INTO elections_v2.publication_batches (public_id, election_id, round_id, publication_type, version_number, publication_status, prepared_by_user_id, approved_by_user_id, approved_at, published_at)
  VALUES ('twf_batch_001', v_election_id, v_round_id, 'provisional', 1, 'published', v_user_publisher_id, v_user_validator_id, now(), now())
  RETURNING id INTO v_batch_id;

  INSERT INTO elections_v2.publication_batch_items (publication_batch_id, item_type, pv_result_id, item_order, metadata)
  VALUES (v_batch_id, 'pv_result', v_result_retained_id, 1, jsonb_build_object('retained_only', true, 'decision_id', v_decision_id));

  INSERT INTO elections_v2.published_result_snapshots (public_id, publication_batch_id, aggregation_level, territory_id, district_id, office_id, candidacy_id, votes, registered_voters, voters, valid_ballots, expressed_votes, percentage, ranking, metadata)
  VALUES ('twf_snapshot_a', v_batch_id, 'polling_station', v_local_id, v_district_id, v_office_id, v_cand_a_id, 42, 100, 72, 72, 72, 58.333333, 1, jsonb_build_object('source_pv_result_id', v_result_retained_id)),
         ('twf_snapshot_b', v_batch_id, 'polling_station', v_local_id, v_district_id, v_office_id, v_cand_b_id, 30, 100, 72, 72, 72, 41.666667, 2, jsonb_build_object('source_pv_result_id', v_result_retained_id));

  INSERT INTO elections_v2.pv_results (public_id, pv_submission_id, result_layer, version_number, result_status, registered_voters, voters, valid_ballots, expressed_votes, data_source, created_by_user_id, is_active)
  VALUES ('twf_entered_v3', v_submission_id, 'entered', 3, 'draft', 100, 80, 80, 80, 'manual_entry', v_user_entry_id, false)
  RETURNING id INTO v_result_v3_id;

  INSERT INTO elections_v2.pv_candidate_results (public_id, pv_result_id, candidacy_id, votes)
  VALUES ('twf_vote_a_v3', v_result_v3_id, v_cand_a_id, 50),
         ('twf_vote_b_v3', v_result_v3_id, v_cand_b_id, 30);

  INSERT INTO elections_v2.audit_logs (user_id, role_code, action, entity_table, entity_id, reason, source, request_id)
  VALUES (v_user_entry_id, 'fictional_entry', 'entry', 'pv_results', v_result_v1_id::text, 'Fictional initial entry.', 'test-v2-workflow', 'twf-audit-001'),
         (v_user_validator_id, 'fictional_validator', 'correct', 'result_corrections', v_result_v2_id::text, 'Fictional correction.', 'test-v2-workflow', 'twf-audit-002'),
         (v_user_validator_id, 'fictional_supervisor', 'approve', 'pv_decisions', v_decision_id::text, 'Fictional inclusion.', 'test-v2-workflow', 'twf-audit-003'),
         (v_user_publisher_id, 'fictional_publisher', 'publish', 'publication_batches', v_batch_id::text, 'Fictional publication.', 'test-v2-workflow', 'twf-audit-004');

  IF NOT EXISTS (SELECT 1 FROM elections_v2.pv_results WHERE id = v_result_v1_id AND voters = 70) THEN
    RAISE EXCEPTION 'Old result version was not preserved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM elections_v2.result_corrections WHERE source_pv_result_id = v_result_v1_id AND target_pv_result_id = v_result_v2_id) THEN
    RAISE EXCEPTION 'Correction did not link source and target versions';
  END IF;
  IF EXISTS (
    SELECT 1 FROM elections_v2.publication_batch_items bi
    JOIN elections_v2.pv_results pr ON pr.id = bi.pv_result_id
    WHERE bi.publication_batch_id = v_batch_id
      AND (pr.result_layer <> 'retained' OR pr.id <> v_result_retained_id)
  ) THEN
    RAISE EXCEPTION 'Publication batch contains non-retained result';
  END IF;

  SELECT SUM(votes) INTO v_snapshot_votes
  FROM elections_v2.published_result_snapshots
  WHERE publication_batch_id = v_batch_id;

  SELECT SUM(votes) INTO v_later_votes
  FROM elections_v2.pv_candidate_results
  WHERE pv_result_id = v_result_v3_id;

  IF v_snapshot_votes <> 72 OR v_later_votes <> 80 OR v_snapshot_votes = v_later_votes THEN
    RAISE EXCEPTION 'Snapshot independence failed: snapshot %, later %', v_snapshot_votes, v_later_votes;
  END IF;
  IF EXISTS (
    SELECT 1 FROM elections_v2.published_result_snapshots
    WHERE publication_batch_id = v_batch_id
    GROUP BY publication_batch_id
    HAVING SUM(votes) <> MAX(expressed_votes)
       OR SUM(percentage) <> 100.000000
  ) THEN
    RAISE EXCEPTION 'Snapshot totals are not coherent';
  END IF;
  IF (SELECT COUNT(*) FROM elections_v2.audit_logs WHERE request_id LIKE 'twf-audit-%') <> 4 THEN
    RAISE EXCEPTION 'Audit trail is incomplete';
  END IF;
  SELECT COUNT(*) INTO v_public_objects
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'i');
  IF v_public_objects <> 0 THEN
    RAISE EXCEPTION 'Unexpected objects in public schema: %', v_public_objects;
  END IF;

  RAISE NOTICE 'PASS: V2 workflow, snapshot independence, audit trail and public-schema checks validated.';
END $$;

ROLLBACK;
