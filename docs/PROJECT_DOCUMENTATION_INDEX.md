# Project Documentation Index

## Purpose

This index is the single entry point for the Juno7 Elections MVP documentation.
It groups business, technical, security, staging, V2 API, V2 dashboard and donor
demo documents. Status values are:

- `validated`: accepted for the current MVP demonstration scope;
- `provisional`: useful for planning, still subject to governance or operational
  approval;
- `to complete`: intentionally incomplete before production readiness.

## Business And Electoral Model

| Document | Status | Scope |
| --- | --- | --- |
| [Electoral Domain Model](./ELECTORAL_DOMAIN_MODEL.md) | validated | Core electoral entities, open architecture decisions and multi-election model |
| [Electoral Data Dictionary](./ELECTORAL_DATA_DICTIONARY.md) | validated | Tables, fields and controlled vocabulary for the electoral domain |
| [Electoral Workflows](./ELECTORAL_WORKFLOWS.md) | validated | Election, PV, verification and publication workflows |
| [Electoral ERD](./ELECTORAL_ERD.md) | validated | Entity relationship diagram for the V2 electoral model |
| [Electoral Migration Strategy](./ELECTORAL_MIGRATION_STRATEGY.md) | validated | Progressive migration approach and compatibility with historical data |

## V2 Schema And Local Database Validation

| Document | Status | Scope |
| --- | --- | --- |
| [V2 Schema Mapping](./V2_SCHEMA_MAPPING.md) | validated | Mapping from historical structures to the V2 model |
| [V2 Schema Rollback Plan](./V2_SCHEMA_ROLLBACK_PLAN.md) | validated | Non-automatic rollback principles for V2 schema work |
| [V2 Local Database Testing](./V2_LOCAL_DATABASE_TESTING.md) | validated | Reproducible local PostgreSQL validation package |
| [PV Data Model](./PV_DATA_MODEL.md) | validated | Expected PVs, submissions, result layers, corrections and publication boundary |
| [PV Validation Rules](./PV_VALIDATION_RULES.md) | validated | Validation checks, anomalies, human decisions and operational controls |
| [PV Correction Policy](./PV_CORRECTION_POLICY.md) | validated | Versioned corrections, approvals and audit expectations |
| [PV Publication Model](./PV_PUBLICATION_MODEL.md) | validated | Publication batches, items and immutable public snapshots |

## API V2 And Dashboard V2

| Document | Status | Scope |
| --- | --- | --- |
| [API V2 Read-Only](./API_V2_READ_ONLY.md) | validated | GET-only V2 API, local target guard and response envelope |
| [V2 Dashboard Read-Only](./V2_DASHBOARD_READ_ONLY.md) | validated | Read-only dashboard route, sections, states and constraints |
| [V2 Activation Checklist](./V2_ACTIVATION_CHECKLIST.md) | validated | Controlled activation and rollback of `V2_READ_API` and `V2_PUBLIC_UI` |
| [V2 Demo Scenario](./V2_DEMO_SCENARIO.md) | validated | Local demonstration sequence for the V2 dashboard |

## Security, Staging And Production Readiness

| Document | Status | Scope |
| --- | --- | --- |
| [Staging Environment](./STAGING_ENVIRONMENT.md) | provisional | Staging configuration and operational assumptions |
| [Staging Database Setup](./STAGING_DATABASE_SETUP.md) | provisional | Staging database preparation guidance |
| [Production Snapshot Inventory](./PRODUCTION_SNAPSHOT_INVENTORY.md) | provisional | Historical production snapshot inventory used for planning |
| [Sprint 2B Backend Stabilization](./SPRINT_2B_BACKEND_STABILIZATION.md) | validated | Backend stabilization evidence from earlier MVP work |
| [Sprint 2C Frontend Compatibility](./SPRINT_2C_FRONTEND_COMPATIBILITY.md) | validated | Frontend compatibility evidence from earlier MVP work |

## Donor Demonstration Package

| Document | Status | Scope |
| --- | --- | --- |
| [Donor Demo Brief](./DONOR_DEMO_BRIEF.md) | validated | Executive donor brief and demonstration boundary |
| [Donor Demo Script](./DONOR_DEMO_SCRIPT.md) | validated | Speaker script for a 20 to 30 minute donor demo |
| [Donor Technical Overview](./DONOR_TECHNICAL_OVERVIEW.md) | validated | Technical explanation for non-developer stakeholders |
| [Donor Security And Governance](./DONOR_SECURITY_AND_GOVERNANCE.md) | provisional | Governance and security posture, pending official approvals |
| [Donor Roadmap And Budget](./DONOR_ROADMAP_AND_BUDGET.md) | provisional | 12-month roadmap and indicative USD 400,000 planning hypothesis |
| [Donor Demo Checklist](./DONOR_DEMO_CHECKLIST.md) | validated | Pre-demo checks, walkthrough and post-demo actions |
| [Donor Demo Handoff](./DONOR_DEMO_HANDOFF.md) | validated | Operator handoff for the local donor demonstration |
| [MVP Readiness Checklist](./MVP_READINESS_CHECKLIST.md) | provisional | Criteria to declare the MVP ready to show |

## Documents To Complete Before Production

- Official legal definitions for valid, blank, null and expressed votes.
- Official constituency, polling center and polling station referential.
- Production infrastructure and incident response runbook.
- Role and permission matrix for production users.
- Independent security review report.
- Audit access procedure for observers and oversight bodies.

## Maintenance Rule

When a new Sprint changes V2 behavior, update this index in the same commit as
the related documentation. Do not mark planning assumptions as official rules
without stakeholder approval.
