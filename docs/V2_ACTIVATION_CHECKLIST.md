# V2 Activation Checklist

This checklist controls local or staging activation of the read-only V2 experience.
It does not authorize production deployment by itself.

## Preconditions

- Confirm the target PostgreSQL server is local or an explicitly approved staging server.
- Confirm the database name is not `elections2026`.
- Confirm the database name contains `test`, `local`, or an approved staging marker.
- Confirm migrations 001 to 013 were already applied by an approved migration process.
- Confirm no pending local Git changes are unrelated to V2 activation.
- Confirm `npm test` and `npm run validate` pass.
- Confirm the V2 API contract test passes against the intended target.
- Confirm the dashboard browser test passes on desktop and mobile viewports.

## Enable Read API

Set:

```sh
V2_READ_API=true
```

Then confirm:

- `GET /api/v2/elections` returns `{ ok: true, items, meta }`.
- `POST /api/v2/elections` returns 404.
- API errors do not expose SQL text, connection strings, or secrets.
- Existing historical routes still respond as before.

## Enable Public Dashboard

Set:

```sh
V2_PUBLIC_UI=true
```

Then confirm:

- `GET /v2-dashboard` returns 200.
- The banner `V2 — DONNÉES DE DÉMONSTRATION` is visible.
- Desktop and mobile layouts are usable.
- The page sends only GET requests to `/api/v2/*`.
- The page does not use admin tokens, `localStorage`, or `sessionStorage`.

## Validation Commands

```sh
git diff --check
npm test
npm run validate
V2_READ_API_TESTS=1 V2_READ_API=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-read-api.test.js
V2_BROWSER_TESTS=1 V2_READ_API=true V2_PUBLIC_UI=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-dashboard-browser.test.js
```

## Rollback

Disable the dashboard first:

```sh
V2_PUBLIC_UI=false
```

Confirm:

- `GET /v2-dashboard` returns 404.
- `GET /v2-dashboard.html` returns 404.

Then disable the read API if required:

```sh
V2_READ_API=false
```

Confirm:

- `GET /api/v2/elections` returns 404.
- Historical routes remain available.

No database cleanup is part of this rollback. Data remains intact.

## Approval Gate

Before any non-local activation, approval is required from:

- product owner;
- engineering lead;
- database owner;
- election governance representative.

The activation window, target database, responsible operator, and rollback contact
must be recorded before changing flags outside a local machine.
