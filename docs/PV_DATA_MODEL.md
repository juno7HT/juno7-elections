# PV Data Model

Date: 2026-07-16

## 1. Scope

The Sprint 5 PV model completes the operational core of `elections_v2` without touching historical tables. It stores expected PVs, received submissions, source documents, layered result data, candidate results, validation checks, anomalies, decisions, corrections and publication snapshots.

No binary document is stored in PostgreSQL during this sprint. Documents are referenced by logical URI and checksum.

## 2. Core Flow

1. `expected_pvs` defines the PV expected for one election, round, office, district and polling station.
2. `pv_submissions` records every received transmission, even when not matched immediately.
3. `pv_documents` references images or files attached to a submission.
4. `pv_results` stores separate result layers: `declared`, `entered`, `verified`, `retained`.
5. `pv_candidate_results` stores votes by candidacy for one result layer/version.
6. `pv_validation_checks` and `pv_anomalies` preserve controls and exceptions.
7. `pv_validations` and `pv_decisions` record human verification and operational decisions.
8. `result_corrections` and `result_correction_items` create auditable version changes.
9. `publication_batches`, `publication_batch_items` and `published_result_snapshots` isolate public output from entry tables.

## 3. Layer Separation

`pv_results.result_layer` is the boundary between data states:

- `declared`: values read from the source PV document.
- `entered`: values entered by an operator.
- `verified`: values reviewed by a verifier.
- `retained`: values accepted for consolidation/publication.

Public surfaces must later read `published_result_snapshots`, not `pv_results` or `pv_candidate_results` directly.

## 4. Universal Numeric Controls

The schema encodes only universal controls:

- numeric counters are integers;
- counters cannot be negative;
- `voters <= registered_voters` when both are present;
- result versions are positive;
- candidate votes are unique per `pv_result_id` and `candidacy_id`.

Legal formulas for valid, blank, null and expressed votes remain open and are intentionally not encoded as irreversible constraints.

## 5. Audit Events To Record

Application audit logging should write to `audit_logs` for:

- PV reception;
- expected PV matching;
- source document addition or replacement;
- result entry;
- validation check execution;
- anomaly creation or resolution;
- correction request, approval and application;
- inclusion or exclusion decision;
- publication batch creation, approval, publication and withdrawal.

Sprint 5 avoids complex triggers. Immutability is enforced by application workflow, versioned rows and append-only audit policy.
