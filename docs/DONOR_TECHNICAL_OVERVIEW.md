# Donor Technical Overview

## Summary

Juno7 Elections V2 is an isolated election results model and read-only
demonstration layer. It is designed to preserve traceability from expected PVs and
source submissions to validated, retained and published result snapshots.

The current package is local-only. It does not deploy infrastructure and does not
modify the production application environment.

## Architecture Layers

### Data Model

The `elections_v2` schema separates:

- electoral structure: elections, rounds, offices, territories and polling places;
- political entities: parties, coalitions, candidates and candidacies;
- PV intake: expected PVs, submissions and source document references;
- result layers: declared, entered, verified and retained values;
- validation: checks, anomalies, validations and operational decisions;
- correction: versioned correction headers and itemized field changes;
- publication: batches, batch items and immutable public snapshots;
- audit: event records for sensitive workflow steps.

Historical tables remain separate. The V2 work does not require writing to
historical result tables.

### Read-Only API

The V2 API is registered only when:

```sh
V2_READ_API=true
```

It exposes GET-only endpoints:

- `GET /api/v2/elections`
- `GET /api/v2/elections/:publicId`
- `GET /api/v2/elections/:publicId/rounds`
- `GET /api/v2/territories`
- `GET /api/v2/territories/:publicId/children`
- `GET /api/v2/offices`
- `GET /api/v2/candidacies`
- `GET /api/v2/pvs/progress`
- `GET /api/v2/publications/latest`

Responses use a uniform envelope:

```json
{
  "ok": true,
  "items": [],
  "meta": {}
}
```

There are no V2 POST, PUT, PATCH or DELETE routes.

### Public Dashboard

The V2 dashboard is registered only when:

```sh
V2_PUBLIC_UI=true
```

It is available at:

```text
GET /v2-dashboard
```

The dashboard is a demonstration interface. It reads only from `/api/v2/*`, shows
the visible banner `V2 — DONNÉES DE DÉMONSTRATION`, and does not use admin tokens,
`localStorage` or `sessionStorage`.

## Local Validation Evidence

The Sprint 6 to Sprint 9 work demonstrates:

- migrations 001 to 013 applied on a disposable local PostgreSQL database;
- second-pass idempotence checks;
- database constraint tests;
- a complete fictitious PV workflow;
- read-only API contract tests;
- dashboard contract tests;
- real Chrome browser validation on desktop and mobile;
- confirmation that the dashboard sends no write requests to `/api/v2/*`.

## Safety Controls In Current Demo

For the local demonstration, the V2 API refuses unsafe database targets:

- host must be local;
- database name must contain `test` or `local`;
- `elections2026` is explicitly refused;
- no credentials are hard-coded.

These controls are appropriate for local validation. A production rollout would
need a separate approved configuration and security review.

## Integration Path

The recommended path is progressive:

1. preserve the current historical application unchanged;
2. complete V2 governance decisions and operational procedures;
3. pilot V2 in a controlled environment with fictitious or approved test data;
4. validate field, entry, verification and publication workflows;
5. complete security, availability and observability work;
6. approve production activation through documented change control.

## Non-Goals Of This Package

This donor package does not:

- deploy any server;
- connect to a remote database;
- execute migrations;
- change application routes;
- approve production activation;
- certify legal election procedures.
