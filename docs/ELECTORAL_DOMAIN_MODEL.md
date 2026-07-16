# Juno7 Elections - Electoral Domain Model

Date: 2026-07-16

## 1. Portee

Ce document definit le modele metier cible de Juno7 Elections pour gerer plusieurs elections haitiennes dans le temps, plusieurs tours, plusieurs postes electifs, des candidatures nationales ou territoriales, la reception des proces-verbaux, la verification, les corrections, les aggregations et les publications publiques.

Cette phase est documentaire. Elle ne modifie pas PostgreSQL, ne lance aucune migration et ne change ni le backend ni les interfaces.

## 2. Inventaire de l'existant

### Tables deja presentes

`results_department`

- Champs: `id`, `dept_iso`, `candidate`, `votes`, `updated_at`.
- Usage: routes publiques historiques `/api/results`, `/api/national`, `/results/departments` et route admin `/api/admin/recent`.
- Role actuel: aggregation departementale simplifiee.
- Limite: aucune election, aucun tour, aucun poste, aucun PV, aucun candidat reference par cle et aucune separation entre donnees recues, verifiees et publiees.

`results_votes`

- Champs staging: `id`, `election_id`, `dept_name`, `commune_name`, `section_name`, `centre_vote_name`, `bv_no`, `pv_code`, `candidate`, `votes`, `updated_at`.
- Contraintes staging: `election_id > 0`, `pv_code` non vide, `votes >= 0`, unicite `(election_id, pv_code, candidate)`.
- Script racine plus ancien: `election_id` est `TEXT`, `votes` n'a pas de `CHECK`, et `pv_code` n'est pas contraint non vide.
- Usage: cible MVP des saisies par PV via `/api/submit-results`, `/api/submit-electoral-result`, `/api/admin/vote-entry`; source des aggregations live par departement, commune, national et progression.
- Role actuel: ligne de resultat par candidat et par code PV.
- Limite: confond la saisie, le resultat retenu et le resultat publie; `candidate` est un code texte; `pv_code` remplace une vraie entite PV; le territoire est duplique en texte.

`locations_electoral_units`

- Champs: `id`, `dept_name`, `commune_name`, `section_name`, `centre_vote_name`, `bv_no`, `pv_code`, `source_doc`, `is_active`.
- Usage: cascade territoriale `/api/electoral/*`, arbre admin `/api/admin/electoral-tree`, denominator de progression des PV.
- Role actuel: referentiel aplati departement -> commune -> section -> centre -> bureau/PV.
- Limite: pas de cle stable de territoire, pas de centre/bureau normalise, pas d'election ni tour, unicite de `pv_code` seulement dans le schema staging.

`political_parties`

- Champs: `id`, `name`, `acronym`, `color`, `logo`, `address`, `phone`, `email`, `created_at`.
- Usage: administration des partis, jointure d'affichage des candidats.
- Limite: pas de statut, pas de periode de validite, pas d'historique, pas de distinction parti/coalition.

`candidates`

- Champs: `id`, `first_name`, `last_name`, `ballot_name`, `office`, `department`, `commune`, `photo`, `party_id`, `candidate_code`, `scope_level`, `country_name`, `dept_name`, `commune_name`, `section_name`, `status`, `is_active`, `created_at`.
- Usage: administration des candidats, resolution optionnelle de `candidate_id`, annuaire public, nommage des resultats live.
- Limite: confond personne candidate et candidature a une election; `office` et territoire sont du texte; pas de lien a election, tour, circonscription ou poste electif normalise.

`election_reports`

- Champs: `id`, `election_date`, `round_label`, `election_type`, `office`, `territory_level`, `territory_name`, compteurs PV, compteurs votes, `source_note`, `created_at`.
- Usage: creation et consultation de rapports officiels.
- Limite: rapport denormalise, sans lien avec PV, election, tour, circonscription ou publication.

`election_report_candidates`

- Champs: `id`, `report_id`, `candidate_no`, `party_name`, `candidate_name`, `votes`, `pct`, `created_at`.
- Usage: details candidats d'un rapport officiel.
- Limite: pas de FK declaree dans le script staging, pas de lien vers `candidates` ou une candidature cible.

### Pages et routes dependantes

- `frontend/admin-electoral.html`: interface officielle MVP de saisie par cascade. Lit `/api/electoral/departments`, `/communes`, `/sections`, `/bvs`; ecrit `/api/submit-electoral-result`.
- `frontend/admin.html`: dashboard officiel MVP. Lit les partis, candidats et mises a jour; ecrit partis et candidats; redirige la saisie PV vers `/admin-electoral`.
- `frontend/admin-report.html`: prototype de rapport officiel. Ecrit `/api/admin/report`.
- `frontend/admin-modern.html`: prototype non officiel. Lit plusieurs routes admin sans jeton dans certains blocs et contient des scripts dupliques.
- `frontend/admin-communes.html`: interface ancienne reference des routes `/api/submit-commune-results` et `/api/communes/recent`, absentes de `index.js`.
- Routes publiques: les cartes et resultats lisent encore `results_department` ou des aggregations live de `results_votes`.

## 3. Incoherences et concepts confondus

- `results_department` et `results_votes` representent deux modeles de resultats concurrents.
- `results_votes.election_id` est entier positif dans le schema staging mais texte dans `create_results_votes.sql`.
- `candidate` dans `results_votes` peut etre un code candidat, une lettre statique ou un nom de bulletin selon l'interface.
- Le PV est un simple `pv_code`; il n'a pas de statut, document source, recepteur, controle, correction ou inclusion publique.
- Les territoires sont dupliques sous forme de texte dans plusieurs tables.
- `candidates` melange identite personnelle, presentation sur bulletin, poste, territoire, statut administratif et election implicite.
- Les rapports officiels sont deconnectes des donnees de PV et peuvent diverger silencieusement des resultats saisis.
- L'authentification admin est un jeton global; les roles metier ne sont pas representes.
- Il n'existe pas de journal d'audit immuable.

## 4. Concepts manquants

- Election durable dans le temps.
- Tour de scrutin explicite.
- Poste electif normalise.
- Circonscription electorale distincte du territoire administratif.
- Bureau de vote comme unite de vote.
- PV attendu, soumis, documente, saisi, verifie, corrige, retenu et publie.
- Candidature liee a une personne, un poste, une election/tour et une circonscription.
- Donnees declarees, saisies, verifiees, retenues et publiees.
- Workflow de validation et contestation.
- Publication par batch avec retrait et version.
- Roles, permissions et audit trail.

## 5. Cycle electoral cible

Le cycle de vie cible s'applique a une election et a chacun de ses tours.

1. Preparation
   - Creation de l'election, du calendrier previsionnel, des postes electifs et des territoires de reference.
   - Chargement ou verification du referentiel centres/bureaux.

2. Configuration
   - Definition des tours, circonscriptions, regles de candidature, regles de controle et niveaux de publication.
   - Generation des PV attendus par bureau, poste, circonscription et tour.

3. Candidatures
   - Enregistrement des personnes, partis, coalitions et dossiers de candidature.
   - Validation administrative, attribution du numero/code bulletin et ordre d'affichage.

4. Scrutin a venir
   - Gel progressif du referentiel applicable au tour.
   - Preparation des agents terrain et canaux de transmission.

5. Scrutin ouvert
   - Suivi operationnel, sans publication de resultats non autorisee.

6. Depouillement
   - Production locale des PV dans les bureaux de vote.
   - Les resultats restent des donnees declarees sur document.

7. Reception des PV
   - Enregistrement du PV recu, de son document source, du canal, de l'heure et de l'agent.
   - Detection de doublon potentiel et controle de qualite documentaire.

8. Verification
   - Saisie controlee, verification humaine, controles arithmetiques et rapprochement avec le PV attendu.
   - Qualification des anomalies et ecarts.

9. Consolidation
   - Selection des resultats retenus.
   - Corrections justifiees et auditables.

10. Publication provisoire
    - Creation d'un batch de publication versionne.
    - Exposition publique des aggregations retenues, avec statut provisoire.

11. Contestation
    - Suspension, correction ou maintien des PV contestes selon decisions documentees.

12. Publication definitive
    - Nouveau batch de publication definitive.
    - Verrouillage des donnees retenues sauf procedure exceptionnelle.

13. Archivage
    - Conservation des PV, documents, validations, corrections, publications et audit logs.
    - Les donnees ne sont pas supprimees; elles sont archivees ou depreciees.

## 6. Definitions metier

`Election`

- Evenement electoral global dans le temps, par exemple elections generales 2026.
- Contient un ou plusieurs tours et un ou plusieurs postes electifs.

`Scrutin`

- Operation de vote concrete pour un tour donne, souvent employee comme synonyme operationnel de tour.
- Dans le modele de donnees, le scrutin est porte par `election_rounds`.

`Tour`

- Instance datee d'une election: premier tour, second tour, reprise locale, tour partiel.
- Porte le statut operationnel du cycle.

`Poste electif`

- Fonction a pourvoir: president, senateur, depute, maire, CASEC, ASEC, autre.
- Definit la portee habituelle: nationale, departementale, communale ou circonscription specifique.

`Circonscription`

- Perimetre electoral dans lequel une candidature concourt et dans lequel les resultats sont consolides.
- Peut correspondre a un territoire administratif, a un regroupement de territoires ou a une circonscription specifique.

`Candidature`

- Dossier electoral d'une personne pour un poste, une election/tour et une circonscription.
- Ne doit pas etre confondu avec l'identite generale de la personne.

`Unite de vote`

- Bureau de vote ou niveau le plus fin ou un PV est attendu.

`Proces-verbal`

- Unite centrale de preuve. Il relie un bureau de vote, un tour, un poste/circonscription, un document source et les resultats declares.

`Saisie`

- Transcription des donnees du PV par un operateur.
- Elle ne vaut pas validation.

`Validation`

- Acte de verification ou decision metier qui qualifie le PV et les resultats saisis.

`Publication`

- Exposition controlee et versionnee de resultats retenus ou aggreges.
- Une publication n'est pas une modification des donnees source.

## 7. Hierarchie territoriale et electorale

### Territoire administratif

Structure geographique de reference:

- pays;
- departement;
- arrondissement si necessaire;
- commune;
- section communale.

Le territoire administratif sert a localiser les citoyens, les centres et les bureaux. Il n'est pas toujours identique a une circonscription electorale.

### Circonscription electorale

Perimetre de competition et de consolidation pour un poste electif. Exemples:

- president: circonscription nationale;
- senateur: departement;
- depute: circonscription legislative specifique;
- maire: commune;
- CASEC/ASEC: section communale ou autre perimetre legal.

### Unite de vote

Lieu operationnel ou le vote est depouille:

- centre de vote;
- bureau de vote.

Le bureau de vote est le niveau naturel du PV attendu.

### Unite de centralisation

Niveau ou les PV sont regroupes pour controle et consolidation:

- centre;
- commune;
- departement;
- national;
- cellule specifique de verification.

### Niveau d'aggregation

Niveau public ou interne pour calculer des totaux:

- bureau;
- centre;
- section communale;
- commune;
- departement;
- circonscription;
- national.

## 8. Entites candidates et politiques

Le modele cible distingue:

- `persons`: identite generale d'une personne.
- `political_parties`: organisation politique permanente.
- `coalitions`: regroupement electoral ou politique, eventuellement lie a plusieurs partis.
- `candidacies`: inscription d'une personne a une election/tour, un poste et une circonscription.
- `electoral_offices`: referentiel des postes.
- `electoral_districts`: perimetres electoraux.

Une meme personne peut avoir plusieurs candidatures dans le temps. Une candidature porte son statut, son numero de bulletin, son ordre d'affichage, son parti ou sa coalition, sa couleur de campagne et sa presentation publique.

## 9. Le PV comme unite centrale de preuve

Le PV cible est represente par:

- `expected_pvs`: PV attendu pour un bureau, un tour, un poste/circonscription.
- `pv_submissions`: reception effective d'un PV.
- `pv_documents`: image, PDF ou document source attache a une submission.
- `pv_results`: totaux du PV saisis, verifies et retenus.
- `pv_candidate_results`: votes par candidature pour un PV.
- `pv_validations`: decisions de verification, rejet, contestation, inclusion ou publication.
- `result_corrections`: corrections justifiees et reliees a l'etat precedent.

Statuts recommandes:

- `expected`;
- `received`;
- `in_entry`;
- `entered`;
- `to_verify`;
- `verified`;
- `contested`;
- `rejected`;
- `corrected`;
- `included`;
- `published`;
- `archived`.

## 10. Resultats et controles

Le modele separe cinq couches:

1. Donnees declarees sur le PV: valeurs visibles ou extraites du document.
2. Donnees saisies: transcription humaine ou assistee.
3. Donnees verifiees: donnees acceptees par un verificateur.
4. Donnees retenues: donnees incluses dans la consolidation officielle.
5. Aggregations publiees: totaux versionnes exposes au public.

Champs de resultat minimaux:

- inscrits;
- votants;
- bulletins valides;
- votes blancs;
- votes nuls;
- votes par candidature;
- total des suffrages exprimes;
- anomalies;
- ecarts de controle;
- taux de participation.

Regles minimales:

- aucun vote negatif;
- votes entiers;
- les votes par candidat sont uniques par candidature et PV;
- la somme des votes candidats doit etre compatible avec les bulletins valides ou les suffrages exprimes selon la regle du poste;
- les votants ne peuvent pas depasser les inscrits;
- les bulletins valides, blancs et nuls doivent etre compatibles avec les votants;
- un PV recu doit correspondre a un PV attendu ou etre marque hors referentiel;
- les doublons de PV sont detectes par code, bureau, tour, poste et empreinte documentaire;
- toute correction apres verification doit etre justifiee, versionnee et auditee;
- aucune modification silencieuse apres validation;
- les resultats publics proviennent uniquement des donnees retenues dans un batch de publication.

## 11. Roles MVP

- Administrateur systeme: configuration technique, utilisateurs, roles, securite.
- Administrateur electoral: configuration elections, tours, postes, referentiels, candidatures.
- Superviseur national: vue globale, arbitrage, consolidation nationale.
- Superviseur departemental: suivi et validation dans son perimetre.
- Agent terrain: transmission de PV et documents.
- Operateur data entry: saisie des donnees PV.
- Verificateur: controle, validation, contestation, rejet ou demande de correction.
- Observateur lecture seule: consultation interne sans modification.
- Responsable publication: creation, validation, publication et retrait des batches publics.

## 12. Principes de gouvernance

- Les donnees sources ne sont jamais ecrasees.
- Les corrections creent des enregistrements distincts et auditables.
- Les publications sont versionnees.
- Les retraits de publication sont traces et ne suppriment pas les batches.
- Les tables operationnelles privilegient l'archivage logique a la suppression physique.
- Les tables sensibles doivent capturer l'utilisateur, le role, la date, l'adresse technique ou l'identifiant de session lorsque pertinent.

## 13. Decision de compatibilite

`results_votes` reste le point de depart de migration. Il doit etre considere comme une table de donnees saisies MVP, non comme un modele final de publication. La migration progressive doit deduire ou creer:

- un enregistrement `election_rounds` a partir de `election_id`;
- des territoires a partir des colonnes texte;
- des bureaux et PV attendus a partir de `locations_electoral_units`;
- des candidatures a partir de `candidate` et `candidates.candidate_code`;
- des lignes `pv_results` et `pv_candidate_results` a partir des lignes `results_votes`.

## 14. Décisions d’architecture restant à approuver

Les points suivants restent des decisions d'architecture ou de gouvernance a valider. Ils ne sont pas transformes en regles officielles dans ce document.

| Decision ouverte | Impact | Risque si decision trop tardive | Partie prenante a valider | Moment limite de decision |
| --- | --- | --- | --- | --- |
| Choix entre `BIGSERIAL` et `UUID` pour les cles primaires | Influence la conception SQL, les imports, les API, les journaux d'audit et les exports publics | Migration couteuse si le choix change apres creation des tables cibles et integration des API | Direction technique, administrateur base de donnees, responsable securite | Avant toute migration de schema cible en staging |
| Definition legale des bulletins valides, blancs, nuls et suffrages exprimes | Determine les controles arithmetiques, les taux publics et les regles de rejet ou d'alerte | Resultats contestables, corrections massives ou publication incoherente si les formules changent tard | Responsable electoral, juriste electoral, auditeurs | Avant configuration des controles de PV et avant publication provisoire |
| Visibilite publique des centres et bureaux de vote | Determine ce que l'API publique, les exports et les cartes peuvent exposer | Exposition excessive de donnees operationnelles ou, inversement, manque de transparence publique | Responsable electoral, responsable securite, communication publique | Avant conception de l'API publique et des exports |
| Duree de conservation des PV et journaux d'audit | Influence stockage, couts, conformite, archivage et politiques d'acces | Suppression prematuree de preuves ou accumulation non gouvernee de donnees sensibles | Responsable electoral, juriste, responsable securite, administrateur systeme | Avant reception de PV reels ou import de documents sources |
| Liste officielle des postes electifs | Structure `electoral_offices`, candidatures, circonscriptions, bulletins et publications | Reconfiguration de postes, candidats et resultats apres saisie initiale | Autorite electorale, responsable metier Juno7, administrateur electoral | Avant ouverture de la phase candidatures |
| Definition officielle des circonscriptions | Structure les `electoral_districts`, le rattachement territorial, les candidatures et les aggregations | Mauvais rattachement de candidatures ou de PV, aggregations non defensables | Autorite electorale, responsable cartographie/electoral, auditeurs | Avant generation des PV attendus |
| Niveau d'approbation necessaire pour les corrections sensibles | Determine le workflow de `result_corrections`, les roles et les verrous post-validation | Corrections insuffisamment controlees ou blocage operationnel pendant la verification | Superviseur national, responsable publication, responsable audit, responsable electoral | Avant verification officielle des premiers PV |
| Regles de publication provisoire et definitive | Determine les statuts, les batches, les retraits et les criteres d'inclusion publique | Publication prematuree, retrait mal trace ou confusion entre resultats provisoires et definitifs | Responsable publication, superviseur national, juriste electoral, direction editoriale | Avant activation de la premiere publication publique |
