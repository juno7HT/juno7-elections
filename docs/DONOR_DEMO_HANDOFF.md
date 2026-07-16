# Donor Demo Handoff

## Purpose

This handoff prepares a controlled local demonstration of the Juno7 Elections V2
MVP for donor stakeholders. It does not authorize deployment, remote database
access or production activation.

## Demonstration Boundary

- Environment: local machine only.
- Database: local PostgreSQL test database.
- Data: fictitious demonstration data only.
- Application mode: V2 read-only API and V2 public dashboard enabled by flags.
- Deployment: none.
- Migrations during demo: none.
- Write flows during demo: none.

## Required Flags

Enable only for the local demo session:

```sh
V2_READ_API=true
V2_PUBLIC_UI=true
```

Disable after the session unless another approved local test follows.

## Required Local Database

The local demonstration expects:

```sh
PGHOST=127.0.0.1
PGPORT=55433
PGDATABASE=juno7_elections_v2_test
```

The database must already contain the V2 schema and fictitious V2 demo data. Do
not use production data, remote hosts or the historical production database name.

## Required Fictitious Data

The demo needs at least:

- one fictitious election;
- one round;
- one national or territorial office;
- one territory and polling station path;
- fictitious candidates or candidacies;
- one expected PV;
- one submitted PV document reference;
- entered, verified and retained result versions;
- one correction example;
- one publication batch;
- one public snapshot.

## Local Startup Procedure

1. Confirm the working tree has no unrelated local changes.
2. Confirm the local PostgreSQL target is reachable.
3. Start the application locally with the V2 flags enabled and the local database
   environment variables above.
4. Open:

```text
/v2-dashboard
```

5. Confirm the banner is visible:

```text
V2 — DONNÉES DE DÉMONSTRATION
```

## Pre-Demo Verification

Run before the session:

```sh
git diff --check
npm test
npm run validate
V2_READ_API_TESTS=1 V2_READ_API=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-read-api.test.js
V2_BROWSER_TESTS=1 V2_READ_API=true V2_PUBLIC_UI=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-dashboard-browser.test.js
```

Pass criteria:

- tests pass;
- `/v2-dashboard` returns 200 when `V2_PUBLIC_UI=true`;
- dashboard sends only GET requests to `/api/v2/*`;
- no admin token appears in the dashboard;
- no `localStorage` or `sessionStorage` use is present;
- no real candidate, party, voter or polling-place data is shown.

## Demo Responsibilities

| Role | Responsibility |
| --- | --- |
| Presenter | Explain problem, workflow, dashboard and donor value |
| Technical operator | Start local app, verify flags, monitor browser and API behavior |
| Governance lead | Clarify what is validated and what remains subject to approval |
| Note taker | Record questions, risks, follow-ups and requested evidence |
| Backup operator | Keep a copy of commands and rollback steps ready |

## Demo Sequence

1. Introduce the national PV transparency problem.
2. Explain that all demo data is fictitious.
3. Show the V2 dashboard banner.
4. Select the fictitious election.
5. Show rounds, offices and candidacies.
6. Explain PV intake, data entry and verification layers.
7. Explain validation checks, anomalies and correction versioning.
8. Show PV progress and latest publication snapshot.
9. Explain the read-only API and publication boundary.
10. Close with roadmap, budget hypothesis and governance decisions.

## Rollback Procedure

Disable the dashboard first:

```sh
V2_PUBLIC_UI=false
```

Confirm:

- `/v2-dashboard` returns 404;
- `/v2-dashboard.html` returns 404.

Then disable the API if required:

```sh
V2_READ_API=false
```

Confirm:

- `/api/v2/elections` returns 404;
- historical routes remain available.

Do not delete the local database as part of rollback. Preserve it for audit and
repeatable testing unless a separate cleanup task is approved.

## Known Issues And Limits

- The donor demo is local-only and not a production availability test.
- The budget is an indicative planning hypothesis, not a final commitment.
- Legal vote category definitions remain subject to official approval.
- The official constituency and polling station referential must be confirmed.
- Production identity, monitoring, backup and incident response are not complete.
- The browser test assumes a local Chrome installation on the demo machine.

## Handoff Evidence To Keep

- Test command output summaries.
- Screenshot or observation notes from desktop and mobile dashboard checks.
- Questions asked by donors.
- Decisions or assumptions that require stakeholder validation.
- Any deviation from the planned demo flow.
