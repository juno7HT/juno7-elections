# API V2 Read-Only

Sprint 7 introduces a dedicated read-only API surface for the `elections_v2` schema.
It is isolated from historical routes and is only registered when:

```sh
V2_READ_API=true
```

## Local Target Guard

The V2 API refuses unsafe database targets before serving requests:

- `DATABASE_URL` or `V2_DATABASE_URL` must point to `127.0.0.1`, `localhost`, or `::1`.
- If `DATABASE_URL` is not provided, `PGHOST` must be local.
- The database name must contain `test` or `local`.
- The database name `elections2026` is explicitly refused.
- No credentials are hard-coded by the application.

The local Sprint 6 target is:

```sh
PGHOST=127.0.0.1
PGPORT=55433
PGDATABASE=juno7_elections_v2_test
```

## Registered Endpoints

All V2 endpoints are GET-only:

- `GET /api/v2/elections`
- `GET /api/v2/elections/:publicId`
- `GET /api/v2/elections/:publicId/rounds`
- `GET /api/v2/territories`
- `GET /api/v2/territories/:publicId/children`
- `GET /api/v2/offices`
- `GET /api/v2/candidacies`
- `GET /api/v2/pvs/progress`
- `GET /api/v2/publications/latest`

No V2 POST, PUT, PATCH or DELETE route is registered.

## Response Format

Successful responses use:

```json
{
  "ok": true,
  "items": [],
  "meta": {
    "limit": 50,
    "offset": 0,
    "count": 0
  }
}
```

Validation and not-found responses keep the same envelope:

```json
{
  "ok": false,
  "items": [],
  "meta": {
    "error": "Validation failed"
  }
}
```

Database errors are logged server-side and returned as a generic internal error without
SQL text, connection strings or secrets.

## Pagination And Filters

List endpoints support simple pagination:

- `limit`: integer from 1 to 100, default `50`.
- `offset`: integer greater than or equal to 0, default `0`.

Filters are allow-listed per endpoint. Unsupported values return HTTP 400.

Examples:

```sh
GET /api/v2/elections?status=verification&limit=20
GET /api/v2/territories?level=commune&active=true
GET /api/v2/candidacies?electionPublicId=demo_v2_elect01&status=approved
GET /api/v2/publications/latest?electionPublicId=demo_v2_elect01&type=provisional
```

## Local Test Command

Run the read-only API contract tests against the local disposable PostgreSQL database:

```sh
V2_READ_API_TESTS=1 \
V2_READ_API=true \
PGHOST=127.0.0.1 \
PGPORT=55433 \
PGDATABASE=juno7_elections_v2_test \
node --test tests/v2-read-api.test.js
```

The tests use `app.inject`, validate pagination, filters, 404 handling, the feature
flag, local target refusal, and confirm there is no V2 write route or write SQL in
the dedicated V2 source tree.
