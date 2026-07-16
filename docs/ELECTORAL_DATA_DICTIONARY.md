# Juno7 Elections - Electoral Data Dictionary

Date: 2026-07-16

## 1. Principes de nommage

- Les tables sont au pluriel.
- Les cles primaires sont `id BIGSERIAL` ou `UUID` selon la future decision technique; ce dictionnaire emploie `BIGSERIAL` pour rester proche du schema actuel.
- Les cles etrangeres utilisent le suffixe `_id`.
- Les statuts sont des champs `TEXT` contraints par `CHECK` dans une premiere phase, puis peuvent devenir des types enumeres.
- Les dates d'evenement utilisent `TIMESTAMPTZ`; les dates calendaires utilisent `DATE`.
- Les suppressions physiques sont evitees pour les donnees electorales; on utilise `archived_at`, `is_active` ou un statut.

## 2. Tables cibles

### elections

Objectif: representer un evenement electoral durable.

Colonnes principales:

- `id` PK.
- `code TEXT NOT NULL`.
- `name TEXT NOT NULL`.
- `description TEXT`.
- `country_territory_id BIGINT NOT NULL`.
- `status TEXT NOT NULL`.
- `starts_on DATE`.
- `ends_on DATE`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `country_territory_id -> territories.id`.

Contraintes:

- `UNIQUE (code)`.
- `CHECK (status IN ('preparation','configuration','candidacies','upcoming','open','counting','pv_reception','verification','consolidation','provisional_published','contestation','final_published','archived'))`.

Index:

- `idx_elections_status`.
- `idx_elections_country_status`.

Sensibilite: publique pour le nom et le statut; interne pour la configuration.

Suppression/archivage: archivage logique uniquement.

### election_rounds

Objectif: representer un tour ou scrutin operationnel d'une election.

Colonnes principales:

- `id` PK.
- `election_id BIGINT NOT NULL`.
- `round_number INTEGER NOT NULL`.
- `label TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `polling_date DATE`.
- `opens_at TIMESTAMPTZ`.
- `closes_at TIMESTAMPTZ`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `election_id -> elections.id`.

Contraintes:

- `UNIQUE (election_id, round_number)`.
- `CHECK (round_number > 0)`.
- `CHECK (status IN ('preparation','configuration','candidacies','upcoming','open','counting','pv_reception','verification','consolidation','provisional_published','contestation','final_published','archived'))`.

Index:

- `idx_election_rounds_election_status`.
- `idx_election_rounds_polling_date`.

Sensibilite: mixte; calendrier public apres validation.

Suppression/archivage: archivage logique.

### electoral_offices

Objectif: definir les postes electifs.

Colonnes principales:

- `id` PK.
- `code TEXT NOT NULL`.
- `name TEXT NOT NULL`.
- `default_scope_level TEXT NOT NULL`.
- `description TEXT`.
- `is_active BOOLEAN NOT NULL`.

Contraintes:

- `UNIQUE (code)`.
- `CHECK (default_scope_level IN ('national','department','commune','section','district'))`.

Index:

- `idx_electoral_offices_active`.

Sensibilite: publique.

Suppression/archivage: desactivation par `is_active`.

### territories

Objectif: referentiel administratif hierarchique.

Colonnes principales:

- `id` PK.
- `parent_id BIGINT`.
- `level TEXT NOT NULL`.
- `code TEXT`.
- `name TEXT NOT NULL`.
- `normalized_name TEXT`.
- `iso_code TEXT`.
- `is_active BOOLEAN NOT NULL`.
- `valid_from DATE`.
- `valid_to DATE`.

FK:

- `parent_id -> territories.id`.

Contraintes:

- `UNIQUE (level, code)` si `code` non nul.
- `CHECK (level IN ('country','department','arrondissement','commune','section'))`.
- `CHECK (id <> parent_id)`.

Index:

- `idx_territories_parent`.
- `idx_territories_level_name`.
- `idx_territories_iso_code`.

Sensibilite: publique.

Suppression/archivage: desactivation ou fin de validite.

### electoral_districts

Objectif: definir les circonscriptions electorales.

Colonnes principales:

- `id` PK.
- `election_id BIGINT NOT NULL`.
- `office_id BIGINT NOT NULL`.
- `code TEXT NOT NULL`.
- `name TEXT NOT NULL`.
- `scope_level TEXT NOT NULL`.
- `primary_territory_id BIGINT`.
- `is_active BOOLEAN NOT NULL`.

FK:

- `election_id -> elections.id`.
- `office_id -> electoral_offices.id`.
- `primary_territory_id -> territories.id`.

Contraintes:

- `UNIQUE (election_id, office_id, code)`.
- `CHECK (scope_level IN ('national','department','commune','section','district'))`.

Index:

- `idx_electoral_districts_election_office`.
- `idx_electoral_districts_territory`.

Sensibilite: publique apres configuration.

Suppression/archivage: desactivation.

### electoral_district_territories

Objectif: lier une circonscription a un ou plusieurs territoires administratifs.

Colonnes principales:

- `id` PK.
- `district_id BIGINT NOT NULL`.
- `territory_id BIGINT NOT NULL`.

FK:

- `district_id -> electoral_districts.id`.
- `territory_id -> territories.id`.

Contraintes:

- `UNIQUE (district_id, territory_id)`.

Index:

- `idx_district_territories_territory`.

Sensibilite: publique.

Suppression/archivage: suppression possible avant gel; archivage apres usage electoral.

### polling_centers

Objectif: representer les centres de vote.

Colonnes principales:

- `id` PK.
- `territory_id BIGINT NOT NULL`.
- `code TEXT`.
- `name TEXT NOT NULL`.
- `address TEXT`.
- `latitude NUMERIC(10,7)`.
- `longitude NUMERIC(10,7)`.
- `is_active BOOLEAN NOT NULL`.

FK:

- `territory_id -> territories.id`.

Contraintes:

- `UNIQUE (territory_id, code)` si `code` non nul.

Index:

- `idx_polling_centers_territory`.
- `idx_polling_centers_name`.

Sensibilite: publique ou operationnelle selon politique.

Suppression/archivage: desactivation.

### polling_stations

Objectif: representer les bureaux de vote, unite de vote et niveau naturel du PV.

Colonnes principales:

- `id` PK.
- `polling_center_id BIGINT NOT NULL`.
- `code TEXT NOT NULL`.
- `label TEXT`.
- `registered_voters INTEGER`.
- `is_active BOOLEAN NOT NULL`.

FK:

- `polling_center_id -> polling_centers.id`.

Contraintes:

- `UNIQUE (polling_center_id, code)`.
- `CHECK (registered_voters IS NULL OR registered_voters >= 0)`.

Index:

- `idx_polling_stations_center`.

Sensibilite: operationnelle; peut devenir publique.

Suppression/archivage: desactivation.

### political_parties

Objectif: referentiel des partis.

Colonnes principales:

- `id` PK.
- `name TEXT NOT NULL`.
- `acronym TEXT`.
- `color TEXT`.
- `logo_url TEXT`.
- `address TEXT`.
- `phone TEXT`.
- `email TEXT`.
- `status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

Contraintes:

- `UNIQUE (name)`.
- `UNIQUE (acronym)` si `acronym` non nul.
- `CHECK (status IN ('draft','active','suspended','archived'))`.

Index:

- `idx_political_parties_status`.

Sensibilite: mixte; contacts internes a proteger.

Suppression/archivage: archivage logique.

### coalitions

Objectif: representer les regroupements ou coalitions.

Colonnes principales:

- `id` PK.
- `name TEXT NOT NULL`.
- `acronym TEXT`.
- `color TEXT`.
- `logo_url TEXT`.
- `status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

Contraintes:

- `UNIQUE (name)`.
- `CHECK (status IN ('draft','active','suspended','archived'))`.

Index:

- `idx_coalitions_status`.

Sensibilite: publique avec metadonnees internes.

Suppression/archivage: archivage logique.

### coalition_members

Objectif: lier les coalitions a leurs partis membres.

Colonnes principales:

- `id` PK.
- `coalition_id BIGINT NOT NULL`.
- `party_id BIGINT NOT NULL`.
- `valid_from DATE`.
- `valid_to DATE`.

FK:

- `coalition_id -> coalitions.id`.
- `party_id -> political_parties.id`.

Contraintes:

- `UNIQUE (coalition_id, party_id, valid_from)`.

Index:

- `idx_coalition_members_party`.

Sensibilite: publique/interne selon periode.

Suppression/archivage: fin de validite.

### persons

Objectif: identite generale d'une personne candidate.

Colonnes principales:

- `id` PK.
- `first_name TEXT`.
- `last_name TEXT`.
- `display_name TEXT NOT NULL`.
- `birth_date DATE`.
- `photo_url TEXT`.
- `external_ref TEXT`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

Contraintes:

- `UNIQUE (external_ref)` si disponible.

Index:

- `idx_persons_display_name`.

Sensibilite: donnees personnelles; acces restreint avant publication.

Suppression/archivage: anonymisation ou archivage selon obligation legale.

### candidacies

Objectif: candidature electorale d'une personne pour un poste, une election/tour et une circonscription.

Colonnes principales:

- `id` PK.
- `election_id BIGINT NOT NULL`.
- `round_id BIGINT`.
- `person_id BIGINT NOT NULL`.
- `office_id BIGINT NOT NULL`.
- `district_id BIGINT NOT NULL`.
- `party_id BIGINT`.
- `coalition_id BIGINT`.
- `candidate_code TEXT NOT NULL`.
- `ballot_name TEXT NOT NULL`.
- `ballot_number TEXT`.
- `display_order INTEGER`.
- `campaign_color TEXT`.
- `status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `election_id -> elections.id`.
- `round_id -> election_rounds.id`.
- `person_id -> persons.id`.
- `office_id -> electoral_offices.id`.
- `district_id -> electoral_districts.id`.
- `party_id -> political_parties.id`.
- `coalition_id -> coalitions.id`.

Contraintes:

- `UNIQUE (election_id, office_id, district_id, candidate_code)`.
- `UNIQUE (election_id, office_id, district_id, ballot_number)` si `ballot_number` non nul.
- `CHECK (display_order IS NULL OR display_order > 0)`.
- `CHECK (status IN ('draft','submitted','pending','approved','rejected','withdrawn','archived'))`.
- `CHECK (party_id IS NULL OR coalition_id IS NULL)` pour eviter double etiquette principale.

Index:

- `idx_candidacies_election_office_district`.
- `idx_candidacies_person`.
- `idx_candidacies_status`.

Sensibilite: donnees personnelles et electorales; publique apres approbation.

Suppression/archivage: archivage logique.

### expected_pvs

Objectif: PV attendu pour un bureau, un tour, un poste et une circonscription.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `election_id BIGINT NOT NULL`.
- `round_id BIGINT NOT NULL`.
- `office_id BIGINT NOT NULL`.
- `district_id BIGINT NOT NULL`.
- `polling_station_id BIGINT NOT NULL`.
- `expected_pv_code TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `metadata JSONB NOT NULL`.
- `is_active BOOLEAN NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `election_id -> elections.id`.
- `round_id -> election_rounds.id`.
- `office_id -> electoral_offices.id`.
- `district_id -> electoral_districts.id`.
- `polling_station_id -> polling_stations.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `UNIQUE (election_id, round_id, office_id, district_id, polling_station_id)`.
- `UNIQUE (round_id, expected_pv_code)`.
- `CHECK` sur format de `public_id`.
- `CHECK (length(btrim(expected_pv_code)) > 0)`.
- `CHECK (status IN ('expected','cancelled','archived'))`.

Index:

- `idx_v2_expected_pvs_context`.
- `idx_v2_expected_pvs_station`.
- `idx_v2_expected_pvs_status`.

Sensibilite: operationnelle.

Suppression/archivage: annulation ou archivage, pas de suppression apres scrutin.

### pv_submissions

Objectif: reception effective d'un PV.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `expected_pv_id BIGINT`.
- `election_id BIGINT`.
- `round_id BIGINT`.
- `received_pv_code TEXT`.
- `transmission_channel TEXT NOT NULL`.
- `received_at TIMESTAMPTZ NOT NULL`.
- `field_agent_user_id BIGINT`.
- `source_user_id BIGINT`.
- `processing_status TEXT NOT NULL`.
- `document_quality TEXT`.
- `content_hash TEXT`.
- `potential_duplicate_of_id BIGINT`.
- `notes TEXT`.
- `technical_metadata JSONB NOT NULL`.
- `is_active BOOLEAN NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `expected_pv_id -> expected_pvs.id`.
- `election_id -> elections.id`.
- `round_id -> election_rounds.id`.
- `field_agent_user_id -> users.id`.
- `source_user_id -> users.id`.
- `potential_duplicate_of_id -> pv_submissions.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (transmission_channel IN ('field_app','web_admin','email','messaging','scan_center','manual','other'))`.
- `CHECK (processing_status IN ('received','matched','in_entry','entered','to_verify','verified','contested','rejected','corrected','included','published','archived'))`.
- `CHECK (document_quality IS NULL OR document_quality IN ('good','readable','partial','poor','unreadable'))`.
- `CHECK (potential_duplicate_of_id IS NULL OR potential_duplicate_of_id <> id)`.
- `CHECK (received_pv_code IS NULL OR length(btrim(received_pv_code)) > 0)`.

Index:

- `idx_v2_pv_submissions_expected`.
- `idx_v2_pv_submissions_status`.
- `idx_v2_pv_submissions_received_at`.
- `idx_v2_pv_submissions_duplicate`.
- `idx_v2_pv_submissions_content_hash`.

Sensibilite: elevee; contient donnees operationnelles et traces utilisateurs.

Suppression/archivage: jamais supprimer apres reception; archiver.

### pv_documents

Objectif: documents sources attaches aux PV recus.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT NOT NULL`.
- `storage_uri TEXT NOT NULL`.
- `mime_type TEXT`.
- `file_size_bytes BIGINT`.
- `checksum TEXT`.
- `page_number INTEGER`.
- `document_order INTEGER NOT NULL`.
- `status TEXT NOT NULL`.
- `metadata JSONB NOT NULL`.
- `created_by_user_id BIGINT`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `created_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (length(btrim(storage_uri)) > 0)`.
- `CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)`.
- `CHECK (page_number IS NULL OR page_number > 0)`.
- `CHECK (document_order > 0)`.
- `CHECK (status IN ('active','replaced','rejected','archived'))`.

Index:

- `idx_v2_pv_documents_submission`.
- `idx_v2_pv_documents_checksum`.
- `idx_v2_pv_documents_status`.

Sensibilite: tres elevee; preuve electorale.

Suppression/archivage: conservation immuable; retrait public par permission, pas suppression physique ordinaire.

### pv_results

Objectif: totaux d'un PV par couche de donnees.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT NOT NULL`.
- `result_layer TEXT NOT NULL`.
- `version_number INTEGER NOT NULL`.
- `result_status TEXT NOT NULL`.
- `registered_voters INTEGER`.
- `voters INTEGER`.
- `valid_ballots INTEGER`.
- `blank_votes INTEGER`.
- `null_votes INTEGER`.
- `expressed_votes INTEGER`.
- `envelopes_count INTEGER`.
- `ballots_count INTEGER`.
- `data_source TEXT NOT NULL`.
- `source_notes TEXT`.
- `created_by_user_id BIGINT`.
- `updated_by_user_id BIGINT`.
- `metadata JSONB NOT NULL`.
- `is_active BOOLEAN NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `created_by_user_id -> users.id`.
- `updated_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `UNIQUE (pv_submission_id, result_layer, version_number)`.
- `CHECK` sur format de `public_id`.
- `CHECK (result_layer IN ('declared','entered','verified','retained'))`.
- `CHECK (result_status IN ('draft','active','superseded','rejected','archived'))`.
- `CHECK (version_number > 0)`.
- `CHECK (registered_voters IS NULL OR registered_voters >= 0)`.
- `CHECK (voters IS NULL OR voters >= 0)`.
- `CHECK (valid_ballots IS NULL OR valid_ballots >= 0)`.
- `CHECK (blank_votes IS NULL OR blank_votes >= 0)`.
- `CHECK (null_votes IS NULL OR null_votes >= 0)`.
- `CHECK (expressed_votes IS NULL OR expressed_votes >= 0)`.
- `CHECK (envelopes_count IS NULL OR envelopes_count >= 0)`.
- `CHECK (ballots_count IS NULL OR ballots_count >= 0)`.
- `CHECK (voters IS NULL OR registered_voters IS NULL OR voters <= registered_voters)`.
- `CHECK (data_source IN ('pv_document','manual_entry','double_entry','verification','correction','import'))`.

Index:

- `idx_v2_pv_results_submission_layer`.
- `idx_v2_pv_results_active_layer`.
- `idx_v2_pv_results_status`.

Sensibilite: elevee jusqu'a publication.

Suppression/archivage: versionner, ne pas ecraser.

### pv_candidate_results

Objectif: votes par candidature pour un resultat de PV.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_result_id BIGINT NOT NULL`.
- `candidacy_id BIGINT NOT NULL`.
- `votes INTEGER NOT NULL`.
- `entry_order INTEGER`.
- `observations TEXT`.
- `metadata JSONB NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.

FK:

- `pv_result_id -> pv_results.id`.
- `candidacy_id -> candidacies.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `UNIQUE (pv_result_id, candidacy_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (votes >= 0)`.
- `CHECK (entry_order IS NULL OR entry_order > 0)`.

Index:

- `idx_v2_pv_candidate_results_result`.
- `idx_v2_pv_candidate_results_candidacy`.

Sensibilite: elevee jusqu'a publication.

Suppression/archivage: versionner via un nouvel enregistrement `pv_results`.

### pv_validation_checks

Objectif: resultats de controles automatiques ou humains sur une submission ou une version de resultat.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT`.
- `pv_result_id BIGINT`.
- `check_type TEXT NOT NULL`.
- `check_status TEXT NOT NULL`.
- `expected_value JSONB`.
- `observed_value JSONB`.
- `details JSONB NOT NULL`.
- `executed_by_system BOOLEAN NOT NULL`.
- `executed_by_user_id BIGINT`.
- `executed_at TIMESTAMPTZ NOT NULL`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `pv_result_id -> pv_results.id`.
- `executed_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (length(btrim(check_type)) > 0)`.
- `CHECK (check_status IN ('passed','failed','warning','skipped'))`.
- `CHECK (pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL)`.

Suppression/archivage: conserver comme preuve de controle.

### pv_anomalies

Objectif: anomalies ouvertes ou resolues pendant reception, saisie, verification ou correction.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT`.
- `pv_result_id BIGINT`.
- `pv_document_id BIGINT`.
- `anomaly_type TEXT NOT NULL`.
- `severity TEXT NOT NULL`.
- `description TEXT NOT NULL`.
- `anomaly_status TEXT NOT NULL`.
- `assigned_to_user_id BIGINT`.
- `resolution_notes TEXT`.
- `opened_at TIMESTAMPTZ NOT NULL`.
- `closed_at TIMESTAMPTZ`.
- `metadata JSONB NOT NULL`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `pv_result_id -> pv_results.id`.
- `pv_document_id -> pv_documents.id`.
- `assigned_to_user_id -> users.id`.

Contraintes:

- `CHECK (anomaly_type IN ('duplicate','unreadable_document','inconsistent_pv_code','inconsistent_total','inconsistent_territory','unknown_candidate','entry_discrepancy','suspected_modification','other'))`.
- `CHECK (severity IN ('low','medium','high','critical'))`.
- `CHECK (anomaly_status IN ('open','assigned','resolved','dismissed','archived'))`.
- `CHECK (closed_at IS NULL OR closed_at >= opened_at)`.
- `CHECK (pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL OR pv_document_id IS NOT NULL)`.

Suppression/archivage: conserver l'historique; fermer ou archiver.

### pv_validations

Objectif: decisions de controle et validation d'un PV.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT`.
- `pv_result_id BIGINT`.
- `validator_user_id BIGINT NOT NULL`.
- `validation_type TEXT NOT NULL`.
- `validation_decision TEXT NOT NULL`.
- `comment TEXT`.
- `validated_version INTEGER`.
- `metadata JSONB NOT NULL`.
- `validated_at TIMESTAMPTZ NOT NULL`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `pv_result_id -> pv_results.id`.
- `validator_user_id -> users.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (validation_type IN ('entry_review','document_review','arithmetic_review','supervisor_review','publication_review'))`.
- `CHECK (validation_decision IN ('approved','rejected','contested','needs_correction','included','excluded'))`.
- `CHECK (validated_version IS NULL OR validated_version > 0)`.
- `CHECK (pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL)`.

Index:

- `idx_v2_pv_validations_submission`.
- `idx_v2_pv_validations_result`.
- `idx_v2_pv_validations_user_date`.

Sensibilite: elevee.

Suppression/archivage: immuable.

### pv_decisions

Objectif: decisions operationnelles versionnees sur l'inclusion, l'exclusion, la contestation, la publication ou le retrait.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `pv_submission_id BIGINT`.
- `pv_result_id BIGINT`.
- `decision_type TEXT NOT NULL`.
- `decision_status TEXT NOT NULL`.
- `decided_by_user_id BIGINT NOT NULL`.
- `role_code TEXT NOT NULL`.
- `reason TEXT NOT NULL`.
- `decided_at TIMESTAMPTZ NOT NULL`.
- `target_version INTEGER`.
- `approval_level TEXT NOT NULL`.
- `previous_decision_id BIGINT`.
- `metadata JSONB NOT NULL`.
- `is_active BOOLEAN NOT NULL`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `pv_result_id -> pv_results.id`.
- `decided_by_user_id -> users.id`.
- `previous_decision_id -> pv_decisions.id`.

Contraintes:

- `CHECK (decision_type IN ('include','exclude','retain_provisionally','contest','request_correction','publish','withdraw_from_publication'))`.
- `CHECK (decision_status IN ('active','superseded','cancelled','archived'))`.
- `CHECK (length(btrim(reason)) > 0)`.
- `CHECK (pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL)`.
- `CHECK (previous_decision_id IS NULL OR previous_decision_id <> id)`.

Suppression/archivage: nouvelle decision ou supersession, pas d'ecrasement.

### result_corrections

Objectif: tracer toute correction de resultat.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `correction_target_type TEXT NOT NULL`.
- `correction_target_id BIGINT NOT NULL`.
- `source_pv_result_id BIGINT`.
- `target_pv_result_id BIGINT`.
- `requested_by_user_id BIGINT NOT NULL`.
- `approved_by_user_id BIGINT`.
- `anomaly_id BIGINT`.
- `reason TEXT NOT NULL`.
- `correction_status TEXT NOT NULL`.
- `requested_at TIMESTAMPTZ NOT NULL`.
- `approved_at TIMESTAMPTZ`.
- `applied_at TIMESTAMPTZ`.
- `sensitivity_level TEXT NOT NULL`.
- `metadata JSONB NOT NULL`.

FK:

- `source_pv_result_id -> pv_results.id`.
- `target_pv_result_id -> pv_results.id`.
- `requested_by_user_id -> users.id`.
- `approved_by_user_id -> users.id`.
- `anomaly_id -> pv_anomalies.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (correction_target_type IN ('pv_result','pv_candidate_result','pv_submission','pv_decision'))`.
- `CHECK (length(btrim(reason)) > 0)`.
- `CHECK (correction_status IN ('requested','approved','rejected','applied','cancelled'))`.
- `CHECK (sensitivity_level IN ('standard','sensitive','critical'))`.
- `CHECK (source_pv_result_id IS NULL OR target_pv_result_id IS NULL OR source_pv_result_id <> target_pv_result_id)`.

Index:

- `idx_v2_result_corrections_target`.
- `idx_v2_result_corrections_status`.
- `idx_v2_result_corrections_anomaly`.

Sensibilite: elevee.

Suppression/archivage: immuable.

### result_correction_items

Objectif: detail champ par champ d'une correction approuvee ou rejetee.

Colonnes principales:

- `id` PK.
- `correction_id BIGINT NOT NULL`.
- `field_name TEXT NOT NULL`.
- `old_value JSONB`.
- `new_value JSONB`.
- `justification TEXT NOT NULL`.
- `item_order INTEGER NOT NULL`.
- `validation_status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.

FK:

- `correction_id -> result_corrections.id`.

Contraintes:

- `UNIQUE (correction_id, item_order)`.
- `CHECK (length(btrim(field_name)) > 0)`.
- `CHECK (length(btrim(justification)) > 0)`.
- `CHECK (item_order > 0)`.
- `CHECK (validation_status IN ('pending','validated','rejected'))`.

Suppression/archivage: immuable avec l'en-tete de correction.

### publication_batches

Objectif: versionner les publications publiques.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `election_id BIGINT NOT NULL`.
- `round_id BIGINT`.
- `publication_type TEXT NOT NULL`.
- `version_number INTEGER NOT NULL`.
- `publication_status TEXT NOT NULL`.
- `prepared_by_user_id BIGINT`.
- `approved_by_user_id BIGINT`.
- `prepared_at TIMESTAMPTZ NOT NULL`.
- `approved_at TIMESTAMPTZ`.
- `published_at TIMESTAMPTZ`.
- `withdrawn_at TIMESTAMPTZ`.
- `public_note TEXT`.
- `batch_checksum TEXT`.
- `metadata JSONB NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `updated_at TIMESTAMPTZ NOT NULL`.

FK:

- `election_id -> elections.id`.
- `round_id -> election_rounds.id`.
- `prepared_by_user_id -> users.id`.
- `approved_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `UNIQUE (election_id, round_id, publication_type, version_number)`.
- `CHECK` sur format de `public_id`.
- `CHECK (publication_type IN ('provisional','corrected','final','withdrawal'))`.
- `CHECK (publication_status IN ('draft','prepared','approved','published','withdrawn','archived'))`.
- `CHECK (version_number > 0)`.
- `CHECK` sur l'ordre preparation, approbation, publication et retrait.

Index:

- `idx_v2_publication_batches_context`.
- `idx_v2_publication_batches_status`.
- `idx_v2_publication_batches_published_at`.

Sensibilite: publique pour les publications; interne pour brouillons/retraits.

Suppression/archivage: retrait ou archivage, pas suppression.

### publication_batch_items

Objectif: lier un batch aux objets sources retenus pour publication.

Colonnes principales:

- `id` PK.
- `publication_batch_id BIGINT NOT NULL`.
- `item_type TEXT NOT NULL`.
- `expected_pv_id BIGINT`.
- `pv_submission_id BIGINT`.
- `pv_result_id BIGINT`.
- `pv_decision_id BIGINT`.
- `item_order INTEGER NOT NULL`.
- `metadata JSONB NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.

FK:

- `publication_batch_id -> publication_batches.id`.
- `expected_pv_id -> expected_pvs.id`.
- `pv_submission_id -> pv_submissions.id`.
- `pv_result_id -> pv_results.id`.
- `pv_decision_id -> pv_decisions.id`.

Contraintes:

- `UNIQUE (publication_batch_id, item_order)`.
- `CHECK (item_type IN ('expected_pv','pv_submission','pv_result','pv_decision','aggregate_snapshot'))`.
- `CHECK (item_order > 0)`.
- `CHECK (expected_pv_id IS NOT NULL OR pv_submission_id IS NOT NULL OR pv_result_id IS NOT NULL OR pv_decision_id IS NOT NULL)`.

Index:

- `idx_v2_publication_items_batch`.
- `idx_v2_publication_items_pv_result`.
- `idx_v2_publication_items_decision`.

Sensibilite: publique apres publication.

Suppression/archivage: conserve avec le batch.

### published_result_snapshots

Objectif: instantane public immuable des resultats calcules pour un batch publie.

Colonnes principales:

- `id` PK.
- `public_id TEXT NOT NULL`.
- `publication_batch_id BIGINT NOT NULL`.
- `aggregation_level TEXT NOT NULL`.
- `territory_id BIGINT`.
- `district_id BIGINT`.
- `office_id BIGINT`.
- `candidacy_id BIGINT`.
- `votes INTEGER`.
- `registered_voters INTEGER`.
- `voters INTEGER`.
- `valid_ballots INTEGER`.
- `blank_votes INTEGER`.
- `null_votes INTEGER`.
- `expressed_votes INTEGER`.
- `percentage NUMERIC(9,6)`.
- `ranking INTEGER`.
- `calculated_at TIMESTAMPTZ NOT NULL`.
- `metadata JSONB NOT NULL`.

FK:

- `publication_batch_id -> publication_batches.id`.
- `territory_id -> territories.id`.
- `district_id -> electoral_districts.id`.
- `office_id -> electoral_offices.id`.
- `candidacy_id -> candidacies.id`.

Contraintes:

- `UNIQUE (public_id)`.
- `CHECK` sur format de `public_id`.
- `CHECK (aggregation_level IN ('polling_station','polling_center','section','commune','department','district','national'))`.
- `CHECK` non negatif sur `votes`, `registered_voters`, `voters`, `valid_ballots`, `blank_votes`, `null_votes`, `expressed_votes`.
- `CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100))`.
- `CHECK (ranking IS NULL OR ranking > 0)`.
- `CHECK (voters IS NULL OR registered_voters IS NULL OR voters <= registered_voters)`.

Index:

- `idx_v2_published_snapshots_batch`.
- `idx_v2_published_snapshots_level`.
- `idx_v2_published_snapshots_candidate`.
- `idx_v2_published_snapshots_territory`.

Sensibilite: publique apres publication; interne avant validation du batch.

Suppression/archivage: conserver avec le batch publie ou retire.

### users

Objectif: utilisateurs applicatifs.

Colonnes principales:

- `id` PK.
- `email TEXT`.
- `display_name TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

Contraintes:

- `UNIQUE (email)` si `email` non nul.
- `CHECK (status IN ('active','disabled','archived'))`.

Index:

- `idx_users_status`.

Sensibilite: donnees personnelles et securite.

Suppression/archivage: desactivation puis archivage.

### roles

Objectif: referentiel des roles MVP.

Colonnes principales:

- `id` PK.
- `code TEXT NOT NULL`.
- `name TEXT NOT NULL`.
- `description TEXT`.

Contraintes:

- `UNIQUE (code)`.

Roles minimaux:

- `system_admin`;
- `electoral_admin`;
- `national_supervisor`;
- `department_supervisor`;
- `field_agent`;
- `data_entry_operator`;
- `verifier`;
- `readonly_observer`;
- `publication_manager`.

Sensibilite: interne.

Suppression/archivage: roles systemes non supprimables.

### user_roles

Objectif: associer utilisateurs, roles et perimetres.

Colonnes principales:

- `id` PK.
- `user_id BIGINT NOT NULL`.
- `role_id BIGINT NOT NULL`.
- `territory_id BIGINT`.
- `election_id BIGINT`.
- `valid_from TIMESTAMPTZ`.
- `valid_to TIMESTAMPTZ`.

FK:

- `user_id -> users.id`.
- `role_id -> roles.id`.
- `territory_id -> territories.id`.
- `election_id -> elections.id`.

Contraintes:

- `UNIQUE (user_id, role_id, territory_id, election_id, valid_from)`.

Index:

- `idx_user_roles_user`.
- `idx_user_roles_scope`.

Sensibilite: securite.

Suppression/archivage: fin de validite.

### audit_logs

Objectif: journal immuable des actions metier et techniques importantes.

Colonnes principales:

- `id` PK.
- `occurred_at TIMESTAMPTZ NOT NULL`.
- `user_id BIGINT`.
- `role_code TEXT`.
- `action TEXT NOT NULL`.
- `entity_type TEXT NOT NULL`.
- `entity_id TEXT NOT NULL`.
- `old_value JSONB`.
- `new_value JSONB`.
- `reason TEXT`.
- `source TEXT`.
- `ip_address INET`.
- `session_id TEXT`.
- `request_id TEXT`.

FK:

- `user_id -> users.id`.

Contraintes:

- `CHECK (action IN ('create','entry','update','verify','approve','reject','correct','publish','withdraw_publication','archive','login','logout'))`.

Index:

- `idx_audit_logs_entity`.
- `idx_audit_logs_user_date`.
- `idx_audit_logs_action_date`.
- `idx_audit_logs_request_id`.

Sensibilite: tres elevee.

Suppression/archivage: append-only; retention definie par gouvernance.

## 3. Tables actuelles et correspondance cible

### results_department

Decision: deprecier puis archiver.

Correspondance:

- `dept_iso -> territories.iso_code` au niveau departement.
- `candidate -> candidacies.candidate_code` apres resolution.
- `votes -> published_result_snapshots.votes` apres constitution d'un batch de publication.

Usage transitoire: maintenir les routes publiques historiques jusqu'a bascule vers les aggregations publiees.

Suppression: beaucoup plus tard, apres double lecture et comparaison publique.

### results_votes

Decision: migrer et transformer.

Correspondance:

- `election_id -> elections.id` puis `election_rounds.id` via table de correspondance.
- `dept_name`, `commune_name`, `section_name -> territories`.
- `centre_vote_name -> polling_centers.name`.
- `bv_no -> polling_stations.code`.
- `pv_code -> expected_pvs.expected_pv_code` et `pv_submissions.received_pv_code`.
- `candidate -> candidacies.candidate_code`.
- `votes -> pv_candidate_results.votes`.
- `updated_at -> pv_results.created_at` ou trace d'import.

Usage transitoire: table source de compatibilite pour saisie MVP; pas source finale de publication.

Suppression: beaucoup plus tard apres migration verifiee et periode de reconciliation.

### locations_electoral_units

Decision: transformer en referentiel normalise.

Correspondance:

- `dept_name`, `commune_name`, `section_name -> territories`.
- `centre_vote_name -> polling_centers`.
- `bv_no -> polling_stations`.
- `pv_code -> expected_pvs.expected_pv_code`.
- `source_doc -> audit/import source`.
- `is_active -> is_active/status`.

Usage transitoire: garder les API cascade existantes jusqu'a creation d'une API referentiel.

### candidates

Decision: migrer et transformer.

Correspondance:

- `first_name`, `last_name`, `photo -> persons`.
- `ballot_name`, `candidate_code`, `status`, `is_active -> candidacies`.
- `office -> electoral_offices.code`.
- `party_id -> political_parties.id`.
- `scope_level`, `country_name`, `dept_name`, `commune_name`, `section_name -> electoral_districts` et `territories`.

Usage transitoire: garder comme table d'administration MVP; enrichir par mapping plutot que modifier directement.

### political_parties

Decision: conserver puis enrichir.

Correspondance:

- La table actuelle est proche du referentiel cible.
- `logo -> logo_url`.
- ajouter a terme `status`, `archived_at` et audit.

Usage transitoire: table stable, mais contacts a traiter comme donnees sensibles.

### election_reports

Decision: archiver et transformer.

Correspondance:

- `election_date`, `round_label`, `election_type -> elections/election_rounds`.
- `office -> electoral_offices`.
- `territory_level`, `territory_name -> electoral_districts/territories`.
- compteurs PV et votes -> `published_result_snapshots` apres constitution d'un batch de publication.
- `source_note -> audit/source`.

Usage transitoire: conserver comme rapports historiques importes.

### election_report_candidates

Decision: archiver et transformer.

Correspondance:

- `report_id -> election_reports.id` puis `publication_batches`.
- `candidate_no`, `party_name`, `candidate_name -> candidacies` avec rapprochement manuel.
- `votes`, `pct -> published_result_snapshots.votes` et `published_result_snapshots.percentage`.

Usage transitoire: conserver pour consultation des rapports deja crees.

## 4. Permissions API cibles par role

| Domaine | Operations principales | Roles autorises |
| --- | --- | --- |
| Elections | creer, configurer, archiver | `system_admin`, `electoral_admin` |
| Tours | ouvrir, changer statut, cloturer | `electoral_admin`, `national_supervisor` |
| Referentiel territorial | importer, corriger, desactiver | `electoral_admin`, `national_supervisor` |
| Partis et candidatures | creer, valider, rejeter, archiver | `electoral_admin`, `national_supervisor` |
| PV reception | recevoir, attacher document, marquer doublon | `field_agent`, `data_entry_operator`, `department_supervisor` |
| Saisie | creer donnees saisies | `data_entry_operator` |
| Verification | verifier, contester, rejeter, demander correction | `verifier`, `department_supervisor`, `national_supervisor` |
| Corrections | demander, approuver, appliquer | `verifier`, `department_supervisor`, `national_supervisor` |
| Aggregations | recalculer, comparer, geler | `national_supervisor`, `publication_manager` |
| Publication | creer batch, approuver, publier, retirer | `publication_manager`, `national_supervisor` |
| API publique | lire resultats publies | public |
| Audit | lire et exporter | `system_admin`, `national_supervisor`, auditeurs autorises |
| Administration | utilisateurs, roles, perimetres | `system_admin` |
