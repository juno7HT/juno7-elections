# Juno7 Elections - Electoral ERD

Date: 2026-07-16

## 1. Vue d'ensemble

Le diagramme ci-dessous represente le modele cible. Il separe:

- elections et tours;
- territoires administratifs et circonscriptions electorales;
- personnes et candidatures;
- PV attendus, PV recus, documents, resultats, validations et corrections;
- publications publiques versionnees;
- utilisateurs, roles et audit.

## 2. Diagramme Mermaid ER

```mermaid
erDiagram
    TERRITORIES ||--o{ TERRITORIES : "parent"
    TERRITORIES ||--o{ ELECTIONS : "country"
    ELECTIONS ||--o{ ELECTION_ROUNDS : "has"
    ELECTORAL_OFFICES ||--o{ ELECTORAL_DISTRICTS : "defines"
    ELECTIONS ||--o{ ELECTORAL_DISTRICTS : "scopes"
    TERRITORIES ||--o{ ELECTORAL_DISTRICTS : "primary territory"
    ELECTORAL_DISTRICTS ||--o{ ELECTORAL_DISTRICT_TERRITORIES : "contains"
    TERRITORIES ||--o{ ELECTORAL_DISTRICT_TERRITORIES : "member"
    TERRITORIES ||--o{ POLLING_CENTERS : "hosts"
    POLLING_CENTERS ||--o{ POLLING_STATIONS : "contains"

    POLITICAL_PARTIES ||--o{ COALITION_MEMBERS : "member"
    COALITIONS ||--o{ COALITION_MEMBERS : "groups"
    PERSONS ||--o{ CANDIDACIES : "stands as"
    ELECTIONS ||--o{ CANDIDACIES : "has"
    ELECTION_ROUNDS ||--o{ CANDIDACIES : "optional round"
    ELECTORAL_OFFICES ||--o{ CANDIDACIES : "for office"
    ELECTORAL_DISTRICTS ||--o{ CANDIDACIES : "in district"
    POLITICAL_PARTIES ||--o{ CANDIDACIES : "endorses"
    COALITIONS ||--o{ CANDIDACIES : "endorses"

    ELECTION_ROUNDS ||--o{ EXPECTED_PVS : "expects"
    ELECTORAL_OFFICES ||--o{ EXPECTED_PVS : "for office"
    ELECTORAL_DISTRICTS ||--o{ EXPECTED_PVS : "for district"
    POLLING_STATIONS ||--o{ EXPECTED_PVS : "produces"
    EXPECTED_PVS ||--o{ PV_SUBMISSIONS : "received as"
    PV_SUBMISSIONS ||--o{ PV_SUBMISSIONS : "potential duplicate"
    PV_SUBMISSIONS ||--o{ PV_DOCUMENTS : "has source"
    PV_SUBMISSIONS ||--o{ PV_RESULTS : "has result layers"
    PV_RESULTS ||--o{ PV_RESULTS : "superseded by"
    PV_RESULTS ||--o{ PV_CANDIDATE_RESULTS : "details"
    CANDIDACIES ||--o{ PV_CANDIDATE_RESULTS : "receives votes"
    PV_SUBMISSIONS ||--o{ PV_VALIDATIONS : "reviewed by"
    PV_SUBMISSIONS ||--o{ RESULT_CORRECTIONS : "corrected by"
    PV_RESULTS ||--o{ RESULT_CORRECTIONS : "source result"
    PV_RESULTS ||--o{ RESULT_CORRECTIONS : "corrected result"

    ELECTIONS ||--o{ PUBLICATION_BATCHES : "publishes"
    ELECTION_ROUNDS ||--o{ PUBLICATION_BATCHES : "round publication"
    PUBLICATION_BATCHES ||--o{ PUBLICATION_BATCH_ITEMS : "contains"
    PV_RESULTS ||--o{ PUBLICATION_BATCH_ITEMS : "published result"
    ELECTORAL_DISTRICTS ||--o{ PUBLICATION_BATCH_ITEMS : "aggregation district"
    ELECTORAL_OFFICES ||--o{ PUBLICATION_BATCH_ITEMS : "aggregation office"

    USERS ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ USER_ROLES : "grants"
    TERRITORIES ||--o{ USER_ROLES : "scope"
    ELECTIONS ||--o{ USER_ROLES : "scope"
    USERS ||--o{ PV_SUBMISSIONS : "field or receiver"
    USERS ||--o{ PV_DOCUMENTS : "uploaded"
    USERS ||--o{ PV_RESULTS : "entered"
    USERS ||--o{ PV_VALIDATIONS : "validated"
    USERS ||--o{ RESULT_CORRECTIONS : "requested or approved"
    USERS ||--o{ PUBLICATION_BATCHES : "published or withdrawn"
    USERS ||--o{ AUDIT_LOGS : "actor"

    TERRITORIES {
        bigint id PK
        bigint parent_id FK
        text level
        text code
        text name
        text normalized_name
        text iso_code
        boolean is_active
        date valid_from
        date valid_to
    }

    ELECTIONS {
        bigint id PK
        text code UK
        text name
        text description
        bigint country_territory_id FK
        text status
        date starts_on
        date ends_on
        timestamptz created_at
        timestamptz archived_at
    }

    ELECTION_ROUNDS {
        bigint id PK
        bigint election_id FK
        integer round_number
        text label
        text status
        date polling_date
        timestamptz opens_at
        timestamptz closes_at
        timestamptz created_at
        timestamptz archived_at
    }

    ELECTORAL_OFFICES {
        bigint id PK
        text code UK
        text name
        text default_scope_level
        text description
        boolean is_active
    }

    ELECTORAL_DISTRICTS {
        bigint id PK
        bigint election_id FK
        bigint office_id FK
        text code
        text name
        text scope_level
        bigint primary_territory_id FK
        boolean is_active
    }

    ELECTORAL_DISTRICT_TERRITORIES {
        bigint id PK
        bigint district_id FK
        bigint territory_id FK
    }

    POLLING_CENTERS {
        bigint id PK
        bigint territory_id FK
        text code
        text name
        text address
        numeric latitude
        numeric longitude
        boolean is_active
    }

    POLLING_STATIONS {
        bigint id PK
        bigint polling_center_id FK
        text code
        text label
        integer registered_voters
        boolean is_active
    }

    POLITICAL_PARTIES {
        bigint id PK
        text name UK
        text acronym UK
        text color
        text logo_url
        text address
        text phone
        text email
        text status
        timestamptz created_at
        timestamptz archived_at
    }

    COALITIONS {
        bigint id PK
        text name UK
        text acronym
        text color
        text logo_url
        text status
        timestamptz created_at
        timestamptz archived_at
    }

    COALITION_MEMBERS {
        bigint id PK
        bigint coalition_id FK
        bigint party_id FK
        date valid_from
        date valid_to
    }

    PERSONS {
        bigint id PK
        text first_name
        text last_name
        text display_name
        date birth_date
        text photo_url
        text external_ref UK
        timestamptz created_at
        timestamptz archived_at
    }

    CANDIDACIES {
        bigint id PK
        bigint election_id FK
        bigint round_id FK
        bigint person_id FK
        bigint office_id FK
        bigint district_id FK
        bigint party_id FK
        bigint coalition_id FK
        text candidate_code
        text ballot_name
        text ballot_number
        integer display_order
        text campaign_color
        text status
        timestamptz created_at
        timestamptz archived_at
    }

    EXPECTED_PVS {
        bigint id PK
        bigint round_id FK
        bigint office_id FK
        bigint district_id FK
        bigint polling_station_id FK
        text pv_code
        text status
        integer expected_registered_voters
        timestamptz created_at
        timestamptz archived_at
    }

    PV_SUBMISSIONS {
        bigint id PK
        bigint expected_pv_id FK
        text received_pv_code
        timestamptz received_at
        text channel
        bigint field_agent_user_id FK
        bigint received_by_user_id FK
        text status
        text document_quality
        bigint potential_duplicate_of_id FK
        text technical_source
        timestamptz created_at
    }

    PV_DOCUMENTS {
        bigint id PK
        bigint pv_submission_id FK
        text storage_uri
        text file_name
        text mime_type
        text sha256 UK
        integer page_count
        bigint uploaded_by_user_id FK
        timestamptz uploaded_at
    }

    PV_RESULTS {
        bigint id PK
        bigint pv_submission_id FK
        text data_layer
        integer registered_voters
        integer voters
        integer valid_ballots
        integer blank_votes
        integer null_votes
        integer expressed_votes
        text control_status
        text anomaly_summary
        bigint created_by_user_id FK
        timestamptz created_at
        bigint superseded_by_id FK
    }

    PV_CANDIDATE_RESULTS {
        bigint id PK
        bigint pv_result_id FK
        bigint candidacy_id FK
        integer votes
        timestamptz created_at
    }

    PV_VALIDATIONS {
        bigint id PK
        bigint pv_submission_id FK
        text validation_type
        text status
        bigint validated_by_user_id FK
        timestamptz validated_at
        text reason
        text notes
    }

    RESULT_CORRECTIONS {
        bigint id PK
        bigint pv_submission_id FK
        bigint source_pv_result_id FK
        bigint corrected_pv_result_id FK
        bigint requested_by_user_id FK
        bigint approved_by_user_id FK
        text reason
        text status
        timestamptz created_at
        timestamptz approved_at
    }

    PUBLICATION_BATCHES {
        bigint id PK
        bigint election_id FK
        bigint round_id FK
        text publication_type
        text status
        text version_label
        timestamptz published_at
        bigint published_by_user_id FK
        timestamptz withdrawn_at
        bigint withdrawn_by_user_id FK
        text withdrawal_reason
        text payload_uri
        timestamptz created_at
    }

    PUBLICATION_BATCH_ITEMS {
        bigint id PK
        bigint publication_batch_id FK
        bigint pv_result_id FK
        bigint district_id FK
        bigint office_id FK
        text aggregation_level
        text aggregation_key
        jsonb payload
    }

    USERS {
        bigint id PK
        text email UK
        text display_name
        text status
        timestamptz created_at
        timestamptz archived_at
    }

    ROLES {
        bigint id PK
        text code UK
        text name
        text description
    }

    USER_ROLES {
        bigint id PK
        bigint user_id FK
        bigint role_id FK
        bigint territory_id FK
        bigint election_id FK
        timestamptz valid_from
        timestamptz valid_to
    }

    AUDIT_LOGS {
        bigint id PK
        timestamptz occurred_at
        bigint user_id FK
        text role_code
        text action
        text entity_type
        text entity_id
        jsonb old_value
        jsonb new_value
        text reason
        text source
        inet ip_address
        text session_id
        text request_id
    }
```

## 3. Verification des relations essentielles

- Chaque election cible un pays dans `territories`.
- Chaque tour appartient a une election.
- Chaque circonscription appartient a une election et a un poste.
- Chaque centre appartient a un territoire administratif.
- Chaque bureau appartient a un centre.
- Chaque candidature appartient a une personne, une election, un poste et une circonscription.
- Chaque PV attendu appartient a un tour, un poste, une circonscription et un bureau.
- Chaque PV recu peut etre rapproche d'un PV attendu.
- Chaque resultat de PV appartient a une submission.
- Chaque resultat par candidat appartient a une candidature.
- Chaque publication appartient a une election et peut cibler un tour.
- Chaque action sensible peut etre rattachee a un utilisateur et a l'audit.

## 4. Notes de conception

- `publication_batch_items.payload` permet de publier des aggregations sans dupliquer toutes les tables analytiques des le MVP cible.
- Les couches de `pv_results` remplacent la confusion actuelle entre donnees saisies, verifiees et publiees.
- `expected_pvs` permet de calculer la progression sans deduire les PV attendus des seuls resultats recus.
- `candidacies` separe le contexte electoral de l'identite generale dans `persons`.
- `electoral_district_territories` evite de forcer toute circonscription a correspondre a un seul territoire administratif.
