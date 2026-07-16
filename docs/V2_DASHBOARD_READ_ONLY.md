# V2 Dashboard Read-Only

Sprint 8 adds a demonstration dashboard for the V2 read API.

The page is exposed only when:

```sh
V2_PUBLIC_UI=true
```

When the flag is disabled, both `/v2-dashboard` and `/v2-dashboard.html` return 404.
The page is intentionally separate from official historical interfaces.

## Route

- `GET /v2-dashboard`

The direct static path `/v2-dashboard.html` is also guarded by the same feature flag.

## Data Sources

The dashboard reads only these V2 GET endpoints:

- `/api/v2/elections`
- `/api/v2/elections/:publicId`
- `/api/v2/elections/:publicId/rounds`
- `/api/v2/offices`
- `/api/v2/candidacies`
- `/api/v2/pvs/progress`
- `/api/v2/publications/latest`

No admin token is used. The page does not use browser storage.

## Sections

- Elections list.
- Selected election details.
- Rounds.
- Electoral offices.
- Candidacies.
- PV progress.
- Latest publication snapshots.

The page includes the visible banner:

```text
V2 — DONNÉES DE DÉMONSTRATION
```

## States

The dashboard handles:

- loading state while API calls are pending;
- empty state when an API returns no items;
- error state for API failures;
- not-found state for a missing selected election.

## Local Contract Test

Run:

```sh
npm test
```

For the V2 API contract against the local disposable PostgreSQL database:

```sh
V2_READ_API_TESTS=1 \
V2_READ_API=true \
PGHOST=127.0.0.1 \
PGPORT=55433 \
PGDATABASE=juno7_elections_v2_test \
node --test tests/v2-read-api.test.js
```

Sprint 8 does not add migrations, write flows, new frontend dependencies, or changes
to official historical interfaces.
