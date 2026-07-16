# Juno7 Elections - Electoral Workflows

Date: 2026-07-16

## 1. Cycle de vie electoral

Le cycle cible est pilote par `elections.status` et `election_rounds.status`. Une election peut contenir plusieurs tours et plusieurs postes electifs.

| Phase | Description | Entites principales | Sortie attendue |
| --- | --- | --- | --- |
| Preparation | Initialisation de l'election et du referentiel | `elections`, `territories`, `electoral_offices` | Election creee, territoire charge |
| Configuration | Definition des tours, circonscriptions, centres et bureaux | `election_rounds`, `electoral_districts`, `polling_centers`, `polling_stations` | Scrutin configure |
| Candidatures | Depot, controle et validation des candidatures | `persons`, `political_parties`, `coalitions`, `candidacies` | Candidatures approuvees ou rejetees |
| Scrutin a venir | Gel operationnel avant vote | `expected_pvs`, `user_roles` | PV attendus generes |
| Scrutin ouvert | Vote en cours | `election_rounds` | Suivi operationnel |
| Depouillement | Production locale des PV | `expected_pvs` | PV papier ou numerique disponible |
| Reception des PV | Transmission et enregistrement | `pv_submissions`, `pv_documents` | PV recu et qualifie |
| Verification | Saisie, controles et validation | `pv_results`, `pv_candidate_results`, `pv_validations` | Donnees verifiees ou contestees |
| Consolidation | Selection des donnees retenues | `pv_results`, `result_corrections` | Resultats retenus |
| Publication provisoire | Version publique provisoire | `publication_batches`, `publication_batch_items` | Resultats publics provisoires |
| Contestation | Traitement des recours et corrections | `pv_validations`, `result_corrections` | Decisions tracees |
| Publication definitive | Version finale | `publication_batches` | Resultats publics definitifs |
| Archivage | Conservation et gel | toutes tables metier, `audit_logs` | Dossier electoral archivé |

## 2. Workflow complet d'un PV

### 2.1 Generation du PV attendu

1. Un tour est configure.
2. Les postes et circonscriptions applicables sont valides.
3. Les bureaux de vote actifs sont associes au tour.
4. Le systeme cree un `expected_pvs` par combinaison:
   - tour;
   - poste;
   - circonscription;
   - bureau de vote.
5. Chaque PV attendu recoit un `pv_code` unique dans le tour.

Statut: `expected`.

### 2.2 Reception

1. Un agent terrain ou un centre de scan transmet un document.
2. Le systeme cree `pv_submissions`.
3. Le document est attache dans `pv_documents`.
4. Le systeme tente de rapprocher `received_pv_code` d'un `expected_pvs.pv_code`.
5. Les controles initiaux qualifient:
   - canal de transmission;
   - heure de reception;
   - qualite du document;
   - doublon potentiel;
   - PV hors referentiel.

Statuts possibles: `received`, `contested`, `rejected`.

### 2.3 Saisie

1. Un operateur data entry ouvre une submission recue.
2. Il saisit les compteurs du PV dans `pv_results` avec `data_layer = 'entered'`.
3. Il saisit les votes par candidature dans `pv_candidate_results`.
4. Les controles automatiques detectent anomalies et ecarts.
5. Le PV passe en `entered` ou `to_verify`.

Regles:

- L'operateur ne valide pas son propre PV comme verificateur final.
- Une saisie ne remplace pas le document source.
- Une saisie corrigee cree une nouvelle version ou une correction tracee.

### 2.4 Verification

1. Un verificateur compare le document source, les donnees declarees et les donnees saisies.
2. Il cree une decision dans `pv_validations`.
3. Si les controles passent, un `pv_results` de couche `verified` est cree ou approuve.
4. Si une erreur existe, le PV est marque `needs_correction`, `contested` ou `rejected`.

Statuts possibles:

- `verified`;
- `contested`;
- `rejected`;
- `corrected`.

### 2.5 Correction

1. Une correction est demandee avec motif.
2. Le resultat source est reference dans `result_corrections.source_pv_result_id`.
3. Un nouveau resultat corrige est cree dans `pv_results`.
4. Les votes par candidature corriges sont recrees dans `pv_candidate_results`.
5. Un superviseur ou verificateur autorise approuve la correction.
6. La correction passe a `applied`.

Regles:

- Aucune correction ne modifie silencieusement une ligne verifiee.
- Le motif est obligatoire.
- L'ancienne et la nouvelle valeur sont reprises dans `audit_logs`.

### 2.6 Inclusion

1. Le superviseur decide que le PV verifie ou corrige est retenu.
2. Un `pv_results` de couche `retained` existe.
3. Une validation `included` est creee.
4. Le PV devient eligible aux aggregations publiques.

Statut: `included`.

### 2.7 Publication

1. Le responsable publication cree un `publication_batches` de type `provisional`, `final`, `partial` ou `correction`.
2. Les items de publication sont generes depuis les resultats retenus uniquement.
3. Le batch est controle par un superviseur national.
4. Le batch passe a `published`.
5. L'API publique lit ce batch publie, pas les tables de saisie.

Statut: `published`.

### 2.8 Retrait ou remplacement

1. Un batch publie peut etre retire avec motif.
2. `withdrawn_at`, `withdrawn_by_user_id` et `withdrawal_reason` sont renseignes.
3. Un nouveau batch corrige peut etre publie.
4. L'audit conserve les deux versions.

## 3. Workflow des candidatures

1. Creation ou rapprochement d'une `person`.
2. Creation du parti ou de la coalition si necessaire.
3. Creation d'une `candidacy` pour:
   - election;
   - tour si applicable;
   - poste electif;
   - circonscription.
4. Statut initial: `draft` ou `submitted`.
5. Controle administratif.
6. Attribution:
   - `candidate_code`;
   - `ballot_number`;
   - `display_order`;
   - couleur ou identite visuelle.
7. Decision:
   - `approved`;
   - `rejected`;
   - `withdrawn`.

Regle importante: une personne n'est pas supprimee ou modifiee pour changer une candidature. La candidature porte le contexte electoral.

## 4. Workflow territorial

1. Import du territoire administratif dans `territories`.
2. Import ou creation des centres de vote dans `polling_centers`.
3. Import ou creation des bureaux dans `polling_stations`.
4. Creation des circonscriptions dans `electoral_districts`.
5. Liaison des circonscriptions aux territoires via `electoral_district_territories`.
6. Gel du referentiel applicable au tour.

Difference cle:

- Le territoire administratif localise.
- La circonscription determine qui concourt et comment consolider.
- Le bureau de vote produit le PV.
- Le niveau d'aggregation determine la lecture publique ou interne.

## 5. Workflow des resultats

### Couches de donnees

| Couche | Table | Description |
| --- | --- | --- |
| Declaree | `pv_results.data_layer = 'declared'` | Valeurs lues sur document, OCR ou extraction |
| Saisie | `pv_results.data_layer = 'entered'` | Transcription par operateur |
| Verifiee | `pv_results.data_layer = 'verified'` | Donnees approuvees par verification |
| Retenue | `pv_results.data_layer = 'retained'` | Donnees incluses dans consolidation |
| Publiee | `publication_batches` | Aggregation versionnee exposee au public |

### Controles minimaux

- `votes >= 0` pour chaque candidature.
- Tous les votes sont entiers.
- Une candidature ne peut apparaitre qu'une fois par resultat de PV.
- `voters <= registered_voters` lorsque les deux valeurs existent.
- `valid_ballots + blank_votes + null_votes` doit etre compatible avec `voters`.
- La somme des votes par candidat doit etre compatible avec `valid_ballots` ou `expressed_votes`.
- Un PV ne peut etre inclus qu'apres verification ou correction approuvee.
- Un PV rejete ne peut pas etre publie.
- Un PV conteste ne peut etre publie qu'apres decision explicite.
- Toute modification post-validation cree une correction et un audit.

## 6. Workflow d'audit

Chaque action sensible cree une entree append-only dans `audit_logs`.

Actions couvertes:

- creation;
- saisie;
- modification;
- verification;
- approbation;
- rejet;
- correction;
- publication;
- retrait d'une publication;
- archivage.

Chaque entree capture:

- utilisateur;
- role;
- date;
- objet concerne;
- ancienne valeur;
- nouvelle valeur;
- motif;
- source;
- adresse IP ou identifiant de session lorsque pertinent.

## 7. Groupes API cibles

### Elections

Operations:

- lister elections;
- creer election;
- modifier configuration;
- changer statut;
- archiver.

Permissions:

- lecture: observateur autorise, superviseurs, administrateurs;
- ecriture: `electoral_admin`, `system_admin`.

### Referentiel territorial

Operations:

- lister territoires;
- importer territoire;
- lister centres et bureaux;
- activer/desactiver;
- creer circonscriptions.

Permissions:

- lecture: roles internes;
- ecriture: `electoral_admin`, `national_supervisor`.

### Partis et candidatures

Operations:

- CRUD partis;
- CRUD coalitions;
- creer personne;
- creer candidature;
- valider/rejeter candidature;
- publier liste officielle.

Permissions:

- ecriture: `electoral_admin`, `national_supervisor`;
- lecture publique des candidatures approuvees.

### Unites electorales

Operations:

- lister centres;
- lister bureaux;
- verifier couverture par circonscription;
- generer PV attendus.

Permissions:

- ecriture: `electoral_admin`;
- lecture: superviseurs, agents autorises.

### Reception des PV

Operations:

- enregistrer PV recu;
- attacher document;
- declarer canal;
- detecter doublon;
- qualifier document.

Permissions:

- `field_agent`, `data_entry_operator`, `department_supervisor`.

### Saisie

Operations:

- creer saisie;
- sauvegarder brouillon;
- soumettre a verification;
- consulter ses saisies.

Permissions:

- `data_entry_operator`;
- supervision lecture: `department_supervisor`, `national_supervisor`.

### Verification

Operations:

- verifier PV;
- approuver;
- rejeter;
- contester;
- demander correction.

Permissions:

- `verifier`;
- `department_supervisor`;
- `national_supervisor`.

### Corrections

Operations:

- demander correction;
- saisir correction;
- approuver/rejeter correction;
- consulter historique.

Permissions:

- demande: `verifier`, superviseurs;
- approbation: superviseurs autorises.

### Aggregations

Operations:

- calculer totaux;
- comparer couches;
- detecter ecarts;
- geler resultat retenu.

Permissions:

- `national_supervisor`;
- `publication_manager` en lecture pre-publication.

### Publication

Operations:

- creer batch;
- previsualiser;
- approuver;
- publier;
- retirer;
- archiver.

Permissions:

- `publication_manager`;
- approbation possible par `national_supervisor`.

### API publique

Operations:

- lire elections publiees;
- lire resultats par niveau;
- lire metadonnees de publication;
- telecharger exports publics.

Permissions:

- public, lecture seulement.

### Audit

Operations:

- rechercher logs;
- exporter logs;
- consulter historique d'un PV ou batch.

Permissions:

- `system_admin`;
- `national_supervisor`;
- auditeurs autorises en lecture.

### Administration

Operations:

- gerer utilisateurs;
- gerer roles;
- gerer perimetres;
- desactiver acces.

Permissions:

- `system_admin`.
