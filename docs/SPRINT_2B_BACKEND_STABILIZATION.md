# Sprint 2B Backend Stabilization

## Scope

This sprint stabilizes the Fastify backend around `results_votes` without changing PostgreSQL schema, PM2, Nginx, dependencies, or production files.

## Corrected Routes

- `POST /api/submit-results`
  - Kept as a deprecated compatibility route.
  - No longer writes to the missing `results` table.
  - Requires `election_id`, `pv_code`, `candidate` or resolvable `candidate_id`, `votes`, department, commune, and section data.
  - Stores compatible submissions in `results_votes`.

- `POST /api/submit-electoral-result`
  - Uses shared backend validation.
  - Requires admin token.
  - Writes to `results_votes` only.

- `POST /api/admin/vote-entry`
  - Uses shared backend validation.
  - Requires admin token.
  - Writes to `results_votes` only.

- `GET /api/results/departments-live-named`
  - Uses a parameterized optional `office` filter.
  - Returns `{ ok: true, items: [...] }` on success.

## Protected Admin Routes

The following routes now require `x-admin-token`:

- `GET /api/admin/recent`
- `POST /api/admin/party`
- `GET /api/admin/parties`
- `POST /api/admin/candidate`
- `GET /api/admin/candidates`
- `GET /api/admin/electoral-tree`
- `GET /api/admin/vote-entries`
- `POST /api/admin/vote-entry`
- `PUT /api/admin/candidate/:id`
- `POST /api/admin/report`

If `ADMIN_TOKEN` is not configured, admin access is refused and the server logs a configuration error without exposing any secret.

## Validation

Shared result validation now checks:

- `election_id` must be a positive integer string.
- `pv_code` must be non-empty and reasonably bounded.
- `candidate` must be non-empty unless a route resolves `candidate_id`.
- `votes` must be an integer greater than or equal to zero.
- department, commune, and section are required where relevant.
- center and BV are required for `/api/admin/vote-entry`.
- text fields are trimmed and length-limited.

Validation errors return HTTP 400 with a uniform `errors` array.

## No Migration

No database migration was performed. Existing tables remain in place:

- `results_department`
- `results_votes`
- `candidates`
- `political_parties`
- `locations_electoral_units`
- report tables

`results_votes` is the MVP write target for result submissions.

## Remaining Limits

- The database still lacks foreign keys from `results_votes` to elections, candidates, and polling units.
- `results_votes.pv_code` remains nullable at the schema level.
- `results_department` remains for compatibility but is not the target model.
- Admin authentication is token-based and should be replaced before a high-risk deployment.
- Frontend forms still need updates for the stricter `election_id` requirement.
- Frontends using `demo-2026` are not yet compatible with the numeric `election_id` validator.
- `admin.html` does not currently provide all fields required by deprecated `/api/submit-results`, including a numeric `election_id`.
- `admin-modern.html` does not yet send the admin token on protected admin read routes.
- No frontend interface was modified during Sprint 2B.
- No deployment should happen before a frontend compatibility sprint and staging tests.
- There are no integration tests against an isolated test database yet.

## Test Procedure

Run from the MVP worktree:

```bash
node --check index.js
node --test tests/backend-helpers.test.js
git diff --check
```

These tests exercise pure helpers and do not write to PostgreSQL.

## Risks Before PM2 Restart

Before any production restart:

1. Confirm frontend payloads use a positive integer `election_id`.
2. Confirm admin UI supplies `x-admin-token` on all protected admin reads and writes.
3. Run read-only smoke tests for public result routes.
4. Run admin smoke tests in staging or with a non-production database before POST testing.
5. Confirm `/api/results/departments-live-named` no longer returns 500 in staging.
6. Prepare rollback to the saved production snapshot and Git bundle.
