# Juno7 Elections - Electoral Migration Strategy

Date: 2026-07-16

## 1. Objectif

Cette strategie propose une migration progressive depuis le MVP actuel vers le modele electoral cible, sans perte de donnees et sans interruption de la plateforme.

Elle respecte les contraintes de Sprint 3:

- pas de modification PostgreSQL pendant cette phase;
- pas de migration executee;
- pas de suppression de table existante;
- pas de modification backend ou frontend;
- compatibilite progressive avec `results_votes`;
- separation stricte entre donnees officielles, recues, verifiees et publiees.

## 2. Etat de depart

Le systeme actuel repose principalement sur:

- `locations_electoral_units` pour la cascade territoriale;
- `results_votes` pour les saisies et aggregations live;
- `candidates` et `political_parties` pour une administration MVP;
- `results_department` pour des routes historiques de resultats departementaux;
- `election_reports` et `election_report_candidates` pour des rapports officiels manuels.

Le backend depend de ces tables directement. Les frontends officiels `admin.html` et `admin-electoral.html` doivent continuer a fonctionner pendant la transition.

## 3. Principes de migration

1. Ajouter avant de remplacer.
2. Lire en double avant d'ecrire en double.
3. Ecrire en double avant de basculer la lecture publique.
4. Ne jamais ecraser les donnees source.
5. Journaliser chaque import, correction et publication.
6. Conserver `results_votes` comme source historique MVP jusqu'a reconciliation complete.
7. Publier depuis des batches versionnes, pas depuis les tables de saisie.

## 4. Correspondance des tables actuelles

| Table actuelle | Decision | Destination cible | Commentaire |
| --- | --- | --- | --- |
| `results_department` | Deprecier, archiver | `publication_batches`, `publication_batch_items`, vues publiques | Aggregation historique sans PV ni election/tour |
| `results_votes` | Migrer, transformer | `pv_submissions`, `pv_results`, `pv_candidate_results` | Source principale de compatibilite MVP |
| `locations_electoral_units` | Transformer | `territories`, `polling_centers`, `polling_stations`, `expected_pvs` | Referentiel aplati a normaliser |
| `candidates` | Migrer, transformer | `persons`, `candidacies`, `electoral_offices`, `electoral_districts` | Separation personne/candidature |
| `political_parties` | Conserver, enrichir | `political_parties` cible | Renommer `logo` en `logo_url` a terme, ajouter statut |
| `election_reports` | Archiver, transformer | `publication_batches`, `publication_batch_items` | Rapports manuels a traiter comme publications importees |
| `election_report_candidates` | Archiver, transformer | `publication_batch_items`, rapprochement `candidacies` | Necessite rapprochement manuel si noms divergents |

## 5. Migration progressive proposee

### Phase 0 - Documentation et gel conceptuel

Etat: Sprint 3.

Actions:

- valider le modele metier;
- valider dictionnaire et ERD;
- lister les arbitrages restants;
- ne rien executer en base.

Sortie:

- documents cibles;
- message de commit propose;
- aucune migration.

### Phase 1 - Tables cibles en staging seulement

Actions futures:

- creer les tables cibles dans une base staging isolee;
- ajouter des contraintes defensives;
- ajouter les roles MVP;
- importer un petit jeu de donnees de demonstration.

Conditions:

- base contenant explicitement `staging`;
- `NODE_ENV=staging`;
- aucun acces production;
- scripts transactionnels.

Sortie:

- schema cible validable sans toucher production.

### Phase 2 - Referentiels

Actions futures:

- dedupliquer les territoires depuis `locations_electoral_units`;
- creer pays, departements, communes et sections;
- creer centres et bureaux;
- creer circonscriptions par poste;
- creer `expected_pvs` depuis `pv_code`.

Controle:

- nombre de PV attendus par `locations_electoral_units.pv_code`;
- couverture departement/commune/section;
- detection des `pv_code` nuls ou dupliques;
- rapports d'ecarts sans correction automatique.

Sortie:

- referentiel cible complet;
- API cascade peut encore lire l'ancien schema.

### Phase 3 - Candidatures

Actions futures:

- creer `electoral_offices` depuis les valeurs `office`;
- creer `persons` depuis `candidates`;
- conserver `political_parties`;
- creer `electoral_districts` selon `scope_level`, departement, commune et section;
- creer `candidacies` avec `candidate_code` et `ballot_name`.

Controle:

- chaque `results_votes.candidate` doit etre resolu vers une candidature ou signale;
- chaque candidature approuvee doit avoir un poste et une circonscription;
- les noms de bulletin restent stables pour l'affichage.

Sortie:

- annuaire candidat cible pret pour double lecture.

### Phase 4 - Import des resultats MVP

Actions futures:

- pour chaque couple `(election_id, pv_code)` de `results_votes`, creer ou rapprocher un enregistrement `pv_submissions`;
- creer une couche `entered` dans `pv_results`;
- creer les lignes `pv_candidate_results`;
- associer la submission a `expected_pvs` quand possible;
- journaliser l'import.

Mapping:

- `results_votes.election_id` -> table de correspondance election/tour temporaire;
- `results_votes.pv_code` -> `expected_pvs.pv_code`;
- `results_votes.candidate` -> `candidacies.candidate_code`;
- `results_votes.votes` -> `pv_candidate_results.votes`;
- `updated_at` -> date de creation importee ou metadonnee d'audit.

Controle:

- unicite `(election_id, pv_code, candidate)` deja presente en staging;
- verification des votes negatifs;
- comparaison somme par PV;
- rapport des candidats inconnus;
- rapport des PV inconnus.

Sortie:

- donnees MVP lisibles dans le modele cible, sans supprimer l'ancien.

### Phase 5 - Double ecriture controlee

Actions futures:

- les saisies continuent a remplir `results_votes`;
- une couche d'adaptation ecrit aussi dans `pv_submissions` et `pv_results`;
- les erreurs d'ecriture cible sont journalisees et n'interrompent pas immediatement le MVP tant que la bascule n'est pas validee.

Controle:

- comparaison quotidienne entre `results_votes` et `pv_candidate_results`;
- aucune difference non expliquee avant bascule.

Sortie:

- confiance dans le modele cible en production ou preproduction.

### Phase 6 - Bascule des lectures internes

Actions futures:

- les dashboards admin lisent les tables cibles;
- `results_votes` reste mis a jour par compatibilite;
- les routes historiques deviennent des adaptateurs ou vues.

Controle:

- equivalence des totaux departementaux, communaux et nationaux;
- equivalence de la progression PV.

Sortie:

- exploitation interne basee sur PV et validations.

### Phase 7 - Publication versionnee

Actions futures:

- creer `publication_batches`;
- publier uniquement depuis `pv_results.data_layer = 'retained'`;
- exposer l'API publique depuis le dernier batch `published`;
- conserver `results_department` uniquement pour compatibilite historique.

Controle:

- aucun PV non inclus dans les batches publics;
- chaque batch a un auteur, une date et un statut;
- retrait de publication teste.

Sortie:

- separation effective entre saisie, verification et publication.

### Phase 8 - Depreciation puis archivage

Actions futures:

- marquer les routes et tables historiques comme depreciees;
- exporter les donnees source;
- conserver les tables historiques en lecture seule;
- supprimer beaucoup plus tard uniquement apres decision formelle.

Tables concernees:

- `results_department`;
- `results_votes`;
- `locations_electoral_units`;
- `election_reports`;
- `election_report_candidates`;
- certains champs de `candidates`.

## 6. Strategie specifique pour results_votes

### Lecture source

Regrouper par:

- `election_id`;
- `pv_code`;
- `dept_name`;
- `commune_name`;
- `section_name`;
- `centre_vote_name`;
- `bv_no`.

Chaque groupe represente une submission PV candidate.

### Creation cible

1. Trouver ou creer le territoire.
2. Trouver ou creer le centre.
3. Trouver ou creer le bureau.
4. Trouver ou creer le PV attendu.
5. Creer une submission importee.
6. Creer un `pv_results` couche `entered`.
7. Inserer les votes par candidature.
8. Ajouter un `audit_logs` d'import.

### Donnees insuffisantes

Si `pv_code` manque:

- ne pas fusionner arbitrairement;
- creer une anomalie d'import;
- demander arbitrage.

Si `candidate` ne correspond pas:

- creer un rapport de candidat inconnu;
- ne pas inventer une candidature publique;
- permettre un mapping manuel.

Si les totaux PV manquent:

- importer uniquement les votes par candidat;
- laisser `registered_voters`, `voters`, `valid_ballots`, `blank_votes`, `null_votes` a `NULL`;
- marquer les controles comme `not_checked` ou `warning`.

## 7. Reconciliation et controles

Avant chaque bascule:

- compter les PV distincts dans `locations_electoral_units` et `expected_pvs`;
- compter les PV distincts dans `results_votes` et `pv_submissions`;
- comparer les totaux par candidat;
- comparer les totaux par departement;
- comparer les totaux nationaux;
- lister les PV sans bureau;
- lister les bureaux sans PV attendu;
- lister les candidatures inconnues;
- lister les doublons documentaires;
- lister les corrections post-validation.

## 8. Risques et parades

| Risque | Impact | Parade |
| --- | --- | --- |
| `election_id` texte dans ancien script | Mapping ambigu | table de correspondance et validation numerique avant migration |
| Candidats saisis comme lettres A/B/C | Perte de sens electoral | mapping manuel obligatoire vers `candidate_code` |
| PV sans code ou code duplique | Doublons ou pertes | rapport d'anomalies, pas de fusion automatique |
| Territoires orthographies divergentes | Mauvaise aggregation | normalisation et rapprochement humain |
| Rapports officiels divergents | Conflit public | les traiter comme publications importees, pas comme source PV |
| Absence de totaux inscrits/votants | Controles incomplets | autoriser valeurs `NULL`, statut `warning` |
| Frontends historiques | Rupture utilisateur | adaptateurs API et double lecture |

## 9. Decisions restantes

- Choisir `BIGSERIAL` ou `UUID` comme identifiant primaire cible.
- Determiner si `election_rounds` suffit pour representer le scrutin ou si une table `polling_events` separee est necessaire.
- Definir la regle legale exacte entre bulletins valides, suffrages exprimes, votes blancs et votes par candidat.
- Definir le statut public des centres et bureaux de vote.
- Definir la retention legale des documents PV et audit logs.
- Valider la liste officielle des postes et niveaux de circonscription en Haiti.
- Decider si les corrections doivent etre approuvees a deux niveaux pour certains postes.

## 10. Non-actions pendant Sprint 3

Ne pas:

- lancer `psql`;
- executer les scripts SQL;
- modifier `index.js`;
- modifier les pages frontend;
- installer des dependances;
- demarrer un serveur;
- stage, commit ou push.
