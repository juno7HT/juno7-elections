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
- `round_id BIGINT NOT NULL`.
- `office_id BIGINT NOT NULL`.
- `district_id BIGINT NOT NULL`.
- `polling_station_id BIGINT NOT NULL`.
- `pv_code TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `expected_registered_voters INTEGER`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `archived_at TIMESTAMPTZ`.

FK:

- `round_id -> election_rounds.id`.
- `office_id -> electoral_offices.id`.
- `district_id -> electoral_districts.id`.
- `polling_station_id -> polling_stations.id`.

Contraintes:

- `UNIQUE (round_id, office_id, district_id, polling_station_id)`.
- `UNIQUE (round_id, pv_code)`.
- `CHECK (expected_registered_voters IS NULL OR expected_registered_voters >= 0)`.
- `CHECK (status IN ('expected','cancelled','archived'))`.

Index:

- `idx_expected_pvs_station`.
- `idx_expected_pvs_round_status`.

Sensibilite: operationnelle.

Suppression/archivage: annulation ou archivage, pas de suppression apres scrutin.

### pv_submissions

Objectif: reception effective d'un PV.

Colonnes principales:

- `id` PK.
- `expected_pv_id BIGINT`.
- `received_pv_code TEXT NOT NULL`.
- `received_at TIMESTAMPTZ NOT NULL`.
- `channel TEXT NOT NULL`.
- `field_agent_user_id BIGINT`.
- `received_by_user_id BIGINT`.
- `status TEXT NOT NULL`.
- `document_quality TEXT`.
- `potential_duplicate_of_id BIGINT`.
- `technical_source TEXT`.
- `created_at TIMESTAMPTZ NOT NULL`.

FK:

- `expected_pv_id -> expected_pvs.id`.
- `field_agent_user_id -> users.id`.
- `received_by_user_id -> users.id`.
- `potential_duplicate_of_id -> pv_submissions.id`.

Contraintes:

- `CHECK (channel IN ('field_app','web_admin','email','messaging','scan_center','manual','other'))`.
- `CHECK (status IN ('received','in_entry','entered','to_verify','verified','contested','rejected','corrected','included','published','archived'))`.
- `CHECK (document_quality IS NULL OR document_quality IN ('good','readable','partial','poor','unreadable'))`.

Index:

- `idx_pv_submissions_expected`.
- `idx_pv_submissions_status`.
- `idx_pv_submissions_received_at`.
- `idx_pv_submissions_duplicate`.

Sensibilite: elevee; contient donnees operationnelles et traces utilisateurs.

Suppression/archivage: jamais supprimer apres reception; archiver.

### pv_documents

Objectif: documents sources attaches aux PV recus.

Colonnes principales:

- `id` PK.
- `pv_submission_id BIGINT NOT NULL`.
- `storage_uri TEXT NOT NULL`.
- `file_name TEXT`.
- `mime_type TEXT`.
- `sha256 TEXT`.
- `page_count INTEGER`.
- `uploaded_by_user_id BIGINT`.
- `uploaded_at TIMESTAMPTZ NOT NULL`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `uploaded_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (sha256)` si `sha256` non nul.
- `CHECK (page_count IS NULL OR page_count > 0)`.

Index:

- `idx_pv_documents_submission`.
- `idx_pv_documents_sha256`.

Sensibilite: tres elevee; preuve electorale.

Suppression/archivage: conservation immuable; retrait public par permission, pas suppression physique ordinaire.

### pv_results

Objectif: totaux d'un PV par couche de donnees.

Colonnes principales:

- `id` PK.
- `pv_submission_id BIGINT NOT NULL`.
- `data_layer TEXT NOT NULL`.
- `registered_voters INTEGER`.
- `voters INTEGER`.
- `valid_ballots INTEGER`.
- `blank_votes INTEGER`.
- `null_votes INTEGER`.
- `expressed_votes INTEGER`.
- `control_status TEXT NOT NULL`.
- `anomaly_summary TEXT`.
- `created_by_user_id BIGINT`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `superseded_by_id BIGINT`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `created_by_user_id -> users.id`.
- `superseded_by_id -> pv_results.id`.

Contraintes:

- `UNIQUE (pv_submission_id, data_layer)` pour la version courante, ou index unique partiel si versionnement multi-ligne.
- `CHECK (data_layer IN ('declared','entered','verified','retained'))`.
- `CHECK (registered_voters IS NULL OR registered_voters >= 0)`.
- `CHECK (voters IS NULL OR voters >= 0)`.
- `CHECK (valid_ballots IS NULL OR valid_ballots >= 0)`.
- `CHECK (blank_votes IS NULL OR blank_votes >= 0)`.
- `CHECK (null_votes IS NULL OR null_votes >= 0)`.
- `CHECK (expressed_votes IS NULL OR expressed_votes >= 0)`.
- `CHECK (voters IS NULL OR registered_voters IS NULL OR voters <= registered_voters)`.
- `CHECK (control_status IN ('not_checked','passed','warning','failed','overridden'))`.

Index:

- `idx_pv_results_submission_layer`.
- `idx_pv_results_control_status`.

Sensibilite: elevee jusqu'a publication.

Suppression/archivage: versionner, ne pas ecraser.

### pv_candidate_results

Objectif: votes par candidature pour un resultat de PV.

Colonnes principales:

- `id` PK.
- `pv_result_id BIGINT NOT NULL`.
- `candidacy_id BIGINT NOT NULL`.
- `votes INTEGER NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.

FK:

- `pv_result_id -> pv_results.id`.
- `candidacy_id -> candidacies.id`.

Contraintes:

- `UNIQUE (pv_result_id, candidacy_id)`.
- `CHECK (votes >= 0)`.

Index:

- `idx_pv_candidate_results_candidacy`.

Sensibilite: elevee jusqu'a publication.

Suppression/archivage: versionner via un nouvel enregistrement `pv_results`.

### pv_validations

Objectif: decisions de controle et validation d'un PV.

Colonnes principales:

- `id` PK.
- `pv_submission_id BIGINT NOT NULL`.
- `validation_type TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `validated_by_user_id BIGINT NOT NULL`.
- `validated_at TIMESTAMPTZ NOT NULL`.
- `reason TEXT`.
- `notes TEXT`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `validated_by_user_id -> users.id`.

Contraintes:

- `CHECK (validation_type IN ('entry_review','arithmetic_check','document_check','supervisor_review','publication_review'))`.
- `CHECK (status IN ('approved','rejected','contested','needs_correction','included','excluded'))`.

Index:

- `idx_pv_validations_submission`.
- `idx_pv_validations_user_date`.

Sensibilite: elevee.

Suppression/archivage: immuable.

### result_corrections

Objectif: tracer toute correction de resultat.

Colonnes principales:

- `id` PK.
- `pv_submission_id BIGINT NOT NULL`.
- `source_pv_result_id BIGINT`.
- `corrected_pv_result_id BIGINT NOT NULL`.
- `requested_by_user_id BIGINT`.
- `approved_by_user_id BIGINT`.
- `reason TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `created_at TIMESTAMPTZ NOT NULL`.
- `approved_at TIMESTAMPTZ`.

FK:

- `pv_submission_id -> pv_submissions.id`.
- `source_pv_result_id -> pv_results.id`.
- `corrected_pv_result_id -> pv_results.id`.
- `requested_by_user_id -> users.id`.
- `approved_by_user_id -> users.id`.

Contraintes:

- `CHECK (status IN ('requested','approved','rejected','applied','cancelled'))`.
- `CHECK (source_pv_result_id IS NULL OR source_pv_result_id <> corrected_pv_result_id)`.

Index:

- `idx_result_corrections_submission`.
- `idx_result_corrections_status`.

Sensibilite: elevee.

Suppression/archivage: immuable.

### publication_batches

Objectif: versionner les publications publiques.

Colonnes principales:

- `id` PK.
- `election_id BIGINT NOT NULL`.
- `round_id BIGINT`.
- `publication_type TEXT NOT NULL`.
- `status TEXT NOT NULL`.
- `version_label TEXT NOT NULL`.
- `published_at TIMESTAMPTZ`.
- `published_by_user_id BIGINT`.
- `withdrawn_at TIMESTAMPTZ`.
- `withdrawn_by_user_id BIGINT`.
- `withdrawal_reason TEXT`.
- `payload_uri TEXT`.
- `created_at TIMESTAMPTZ NOT NULL`.

FK:

- `election_id -> elections.id`.
- `round_id -> election_rounds.id`.
- `published_by_user_id -> users.id`.
- `withdrawn_by_user_id -> users.id`.

Contraintes:

- `UNIQUE (election_id, round_id, publication_type, version_label)`.
- `CHECK (publication_type IN ('provisional','final','correction','partial'))`.
- `CHECK (status IN ('draft','approved','published','withdrawn','archived'))`.

Index:

- `idx_publication_batches_election_status`.
- `idx_publication_batches_published_at`.

Sensibilite: publique pour les publications; interne pour brouillons/retraits.

Suppression/archivage: retrait ou archivage, pas suppression.

### publication_batch_items

Objectif: lier un batch aux PV ou aggregations retenues.

Colonnes principales:

- `id` PK.
- `publication_batch_id BIGINT NOT NULL`.
- `pv_result_id BIGINT`.
- `district_id BIGINT`.
- `office_id BIGINT`.
- `aggregation_level TEXT NOT NULL`.
- `aggregation_key TEXT`.
- `payload JSONB NOT NULL`.

FK:

- `publication_batch_id -> publication_batches.id`.
- `pv_result_id -> pv_results.id`.
- `district_id -> electoral_districts.id`.
- `office_id -> electoral_offices.id`.

Contraintes:

- `CHECK (aggregation_level IN ('polling_station','polling_center','section','commune','department','district','national'))`.

Index:

- `idx_publication_items_batch`.
- `idx_publication_items_level_key`.

Sensibilite: publique apres publication.

Suppression/archivage: conserve avec le batch.

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
- `votes -> publication_batch_items.payload` ou vue d'aggregation publique.

Usage transitoire: maintenir les routes publiques historiques jusqu'a bascule vers les aggregations publiees.

Suppression: beaucoup plus tard, apres double lecture et comparaison publique.

### results_votes

Decision: migrer et transformer.

Correspondance:

- `election_id -> elections.id` puis `election_rounds.id` via table de correspondance.
- `dept_name`, `commune_name`, `section_name -> territories`.
- `centre_vote_name -> polling_centers.name`.
- `bv_no -> polling_stations.code`.
- `pv_code -> expected_pvs.pv_code` et `pv_submissions.received_pv_code`.
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
- `pv_code -> expected_pvs`.
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
- compteurs PV et votes -> `publication_batch_items.payload` ou vue d'aggregation.
- `source_note -> audit/source`.

Usage transitoire: conserver comme rapports historiques importes.

### election_report_candidates

Decision: archiver et transformer.

Correspondance:

- `report_id -> election_reports.id` puis `publication_batches`.
- `candidate_no`, `party_name`, `candidate_name -> candidacies` avec rapprochement manuel.
- `votes`, `pct -> publication_batch_items.payload`.

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
