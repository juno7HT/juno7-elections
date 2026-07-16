# V2 Demo Scenario

This scenario demonstrates the V2 read-only dashboard with fictional data only.

## Setup

Use the local disposable PostgreSQL database:

```sh
PGHOST=127.0.0.1
PGPORT=55433
PGDATABASE=juno7_elections_v2_test
V2_READ_API=true
V2_PUBLIC_UI=true
```

Start the application locally, then open:

```text
/v2-dashboard
```

## Walkthrough

1. Confirm the banner `V2 — DONNÉES DE DÉMONSTRATION` is visible.
2. Confirm the elections list is visible.
3. Select the fictional demo election.
4. Review the selected election details:
   - public identifier;
   - code;
   - election type;
   - status.
5. Review the rounds section and confirm the fictional round appears.
6. Review the electoral offices section.
7. Review the candidacies section and confirm fictional candidates are listed.
8. Review PV progress:
   - expected PV count;
   - submissions;
   - retained results;
   - published results.
9. Review the latest publication snapshot and confirm rankings, votes, and percentages.
10. Resize to a mobile viewport and confirm the same sections remain usable.

## Negative Checks

- Open `/v2-dashboard` with `V2_PUBLIC_UI` disabled and confirm 404.
- Attempt `POST /api/v2/elections` and confirm 404.
- Confirm browser network traffic uses GET only for `/api/v2/*`.
- Confirm the browser console has no blocking JavaScript error.

## Expected Outcome

The demo proves that V2 can be activated as a read-only experience:

- no write route is exposed;
- no admin token is used;
- no browser storage is used;
- no migration is executed;
- snapshots are read through the V2 publication endpoint.
