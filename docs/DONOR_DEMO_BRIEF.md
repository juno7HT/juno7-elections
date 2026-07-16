# Donor Demo Brief

## Purpose

This brief presents the Juno7 Elections V2 demonstration package for international
donors and institutional partners. It is a demonstration package, not a production
deployment authorization.

The package explains how a national election results platform can collect,
validate, correct, audit and publish polling-station results while preserving
traceability from the original proces-verbal (PV) to public read-only snapshots.

## Problem Addressed

Election results operations often face three linked challenges:

- paper PVs arrive from many field locations with variable quality and timing;
- data entry, verification and publication are sometimes mixed in one workflow;
- corrections can become difficult to explain if old values are overwritten.

The V2 model separates these concerns. It keeps expected PVs, submissions,
documents, entered values, verified values, retained values, correction history,
decisions and public snapshots in distinct layers.

## National Coverage Target

The intended coverage is national, subject to official electoral definitions and
final operating decisions. The model supports:

- multiple elections;
- multiple rounds;
- multiple elective offices;
- national and territorial constituencies;
- polling centers and polling stations;
- candidates, parties, coalitions and independent candidacies.

Any geographic counts, staffing volumes or operational deadlines used during a
donor discussion should be marked as planning assumptions until approved by the
competent election authority.

## Operational Roles

The demonstration uses the following role model:

- field teams transmit PV documents and basic reception information;
- data entry operators enter values read from source PVs;
- verifiers compare entered values with source documents and validation checks;
- supervisors decide inclusion, exclusion, provisional retention or correction;
- publication operators prepare read-only batches from retained data;
- auditors review logs, decisions, corrections and publication snapshots.

## PV Workflow

The model follows this lifecycle:

1. define expected PVs by election, round, office and polling station;
2. receive submissions and associated document references;
3. enter PV totals and candidate results in a controlled data layer;
4. run validation checks and record anomalies;
5. validate or request correction without overwriting prior values;
6. apply approved corrections as new versions;
7. decide which PV result version is retained;
8. publish only approved snapshots through a public read-only surface.

## Demonstrable Results

The current local demonstration already shows:

- V2 schema migrations validated on a disposable local PostgreSQL database;
- idempotence checks and database constraint tests;
- a full fictitious PV workflow from election to publication snapshot;
- a read-only V2 API behind `V2_READ_API=true`;
- a public demonstration dashboard behind `V2_PUBLIC_UI=true`;
- browser validation on desktop and mobile viewports;
- no V2 write endpoint in the public read-only API.

## Funding Ask Context

The budget envelope discussed in the roadmap is an indicative planning hypothesis
close to USD 400,000 over 12 months. It is not a final quote, procurement result
or official budget.

The funding objective is to move from local demonstration to a controlled pilot,
then to production readiness with governance, training, operations, security
controls and independent verification.

## Demo Boundary

This package does not deploy software, connect to a remote database, execute
migrations, or modify the application. It is intended to support a professional
donor conversation using local demonstration evidence and documented next steps.
