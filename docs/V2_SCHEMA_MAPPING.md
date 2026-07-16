# V2 Schema Mapping

Date: 2026-07-16

## 1. Purpose

This document maps the current MVP tables to the Sprint 4 V2 schema foundations and the Sprint 5 PV/publication model. It is a planning document only. These migrations do not migrate historical data.

## 2. `locations_electoral_units` To V2 Referential Tables

| Source | Target | Transformation | Risk | Quality Control | Non-Mappable Strategy |
| --- | --- | --- | --- | --- | --- |
| `dept_name` | `elections_v2.territories` level `department` | Normalize spelling, assign stable code and public id | Department names may vary by spelling | Compare distinct departments to official list | Hold row in import exception report |
| `commune_name` | `elections_v2.territories` level `commune` | Attach commune to department parent | Same commune name may exist in different contexts | Validate parent-child path | Require manual parent resolution |
| `section_name` | `elections_v2.territories` level `section` | Attach section to commune parent | Missing or unofficial section names | Count sections per commune and compare source totals | Keep source row unmapped until reviewed |
| `centre_vote_name` | `elections_v2.polling_centers.name` | Create center under the most specific territory | Center names may be duplicated | Unique candidate key by territory and normalized center name | Create exception for duplicate center names |
| `bv_no` | `elections_v2.polling_stations.code` | Create station under polling center | Blank or inconsistent BV numbers | Enforce uniqueness by center and code | Mark station incomplete and exclude from PV generation |
| `pv_code` | `elections_v2.expected_pvs.expected_pv_code` | Map only after election, round, office, district and polling station are resolved | Existing PV code can be missing or duplicated | Count distinct nonblank PV codes | Keep as source evidence; do not invent a PV |

## 3. `candidates` To `persons` And `candidacies`

| Source | Target | Transformation | Risk | Quality Control | Non-Mappable Strategy |
| --- | --- | --- | --- | --- | --- |
| `first_name`, `last_name`, `photo` | `elections_v2.persons` | Create or match person identity | Same person may appear with name variants | Match on normalized names plus manual review | Create provisional person requiring review |
| `ballot_name` | `elections_v2.candidacies.ballot_name` | Preserve ballot display name | Missing ballot name blocks public display | Require nonblank ballot name | Use reviewed display name, not automatic guess |
| `candidate_code` | `elections_v2.candidacies.candidate_code` | Preserve stable candidate code | Null or duplicate codes | Check uniqueness by election, office and district | Assign reviewed import code only after approval |
| `office` | `elections_v2.electoral_offices.code` | Map text office to normalized office | Existing values may vary by capitalization/language | Compare to approved office list | Hold candidature until office is mapped |
| `party_id` | `elections_v2.political_parties.id` | Map historical party to V2 party | Historical party may not exist in V2 yet | Verify historical and V2 party mapping table | Allow independent candidature temporarily |
| `scope_level`, territory fields | `elections_v2.electoral_districts` | Resolve candidate district | District definitions are pending official approval | Compare to validated district registry | Keep candidature in draft/import-exception status |
| `status`, `is_active` | `elections_v2.candidacies.status`, `is_active` | Map approved/pending/rejected style states | Historical status vocabulary may be incomplete | Explicit status mapping table | Default to `draft` pending review |

## 4. Historical `political_parties` To V2 `political_parties`

| Source | Target | Transformation | Risk | Quality Control | Non-Mappable Strategy |
| --- | --- | --- | --- | --- | --- |
| `name` | `elections_v2.political_parties.name` | Preserve official party name | Duplicate or variant names | Normalize and compare duplicate groups | Manual merge decision |
| `acronym` | `elections_v2.political_parties.acronym` | Preserve acronym when unique | Acronym may be null or shared | Unique acronym check where present | Leave null until validated |
| `color`, `logo` | `color`, `logo_url` | Rename logo field to URL semantics | Non-URL logo values may exist | Validate URL-like values separately | Store in metadata until cleaned |
| `address`, `phone`, `email` | Same target fields | Copy contact fields | Contact data may be sensitive or stale | Review before public exposure | Keep internal-only or metadata until approved |

## 5. `results_votes` To Future Sprint 5 PV Model

| Source | Future Target | Transformation | Risk | Quality Control | Non-Mappable Strategy |
| --- | --- | --- | --- | --- | --- |
| `election_id` | `elections_v2.elections` and `elections_v2.election_rounds` | Map MVP numeric id to one approved election and one approved round before grouping | MVP id may not identify a legal election/tour | Explicit election/tour mapping table | Reject the group as `election_id invalide`; no PV is generated |
| territory and BV fields | `elections_v2.territories`, `elections_v2.polling_centers`, `elections_v2.polling_stations` | Resolve department, commune, section, center and BV before creating a PV context | Text fields may not match normalized V2 records | Join by approved source mapping and count unresolved rows | Mark as `territoire non mappable`; keep source evidence outside publication |
| `pv_code` | `elections_v2.expected_pvs` and `elections_v2.pv_submissions` | Group rows by election, round, territory, center, BV and nonblank PV code; match an existing expected PV when possible | Missing or duplicate PV code can merge unrelated rows | Count distinct nonblank PV codes and candidate rows per PV group | Create an unmatched submission/exception; do not invent an expected PV |
| `candidate` | `elections_v2.candidacies.candidate_code` | Resolve candidate code in the election, office, round and district context | Candidate can be letter, name or code | Candidate mapping report by grouped PV | Mark row as `candidate non mappable`; do not create public candidature automatically |
| `votes` | `elections_v2.pv_candidate_results.votes` | Preserve integer votes under a grouped `pv_results` row | Existing rows lack full PV totals and may be partial | Check nonnegative integer and compare candidate sum with available totals | Import as partial `entered` evidence with warning, not as verified or retained data |

Mapping shape:

- One grouped source PV can map to one `expected_pvs` row when the expected PV is already defined.
- One grouped source PV creates or references one `pv_submissions` import evidence row.
- Candidate rows in the group create one `pv_results` row in the `entered` layer and multiple `pv_candidate_results` rows.
- Duplicate PV groups are reported before any publication decision.
- Every rejected or deferred row keeps its original source fields in an import error report for later audit.

## 6. `results_department` To Future Published Aggregations

| Source | Future Target | Transformation | Risk | Quality Control | Non-Mappable Strategy |
| --- | --- | --- | --- | --- | --- |
| `dept_iso` | `elections_v2.territories.iso_code` | Resolve department | ISO variants may exist | Compare to official department ISO list | Mark aggregation historical-only |
| `candidate` | `elections_v2.candidacies.candidate_code` | Resolve candidate | Candidate may be A/B or code | Compare to candidate mapping | Do not publish from unresolved candidate |
| `votes` | Sprint 5 publication aggregation item | Treat as historical aggregate, not PV proof | Aggregate may diverge from PV totals | Compare with PV-derived totals after Sprint 5 | Keep as legacy compatibility only |
| `updated_at` | import/audit metadata | Preserve as source timestamp | Timestamp does not prove verification | Include in audit import metadata | Flag as source metadata only |

## 7. General Import Controls

- Every import should be repeatable in staging before production consideration.
- Every source row should end as mapped, intentionally deferred or exception.
- No Sprint 4 migration imports data.
- No future import should overwrite historical source tables.
- Public result publication must wait for the Sprint 5 PV and publication model.
