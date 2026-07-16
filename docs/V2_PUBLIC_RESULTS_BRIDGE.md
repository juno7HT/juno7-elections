# V2 Public Results Bridge

## Purpose

The V2 public results bridge lets the historical public result routes read from
published V2 snapshots without changing the historical frontend.

It is controlled by:

```sh
V2_PUBLIC_RESULTS_BRIDGE=true
```

When the flag is absent or not equal to `true`, the historical routes keep their
existing behavior and continue to read the historical public tables.

## Routes

The bridge applies only to:

- `GET /api/results/national-live`
- `GET /api/results/departments-live`
- `GET /api/results/progress`
- `GET /api/results/departments-progress`

No POST, PUT, PATCH or DELETE route is added.

## Data Boundary

The bridge reads only:

- `elections_v2.publication_batches`
- `elections_v2.published_result_snapshots`

It does not read V2 intake, entry, validation, correction or candidate-result
tables. Public output remains based on published snapshots.

## Snapshot Structure Observed Locally

The local disposable database currently has these relevant snapshot columns:

- `publication_batch_id`
- `aggregation_level`
- `territory_id`
- `district_id`
- `office_id`
- `candidacy_id`
- `votes`
- `percentage`
- `ranking`
- `metadata`

The observed local `aggregation_level` values are:

- `polling_station`

No department-level published snapshots are currently present in the local demo
database.

## Historical Contracts Preserved

`/api/results/national-live` returns:

```json
{
  "ok": true,
  "totalVotes": 72,
  "ranking": [],
  "leader": "CANDIDACY_5",
  "isTie": false
}
```

`/api/results/departments-live` returns:

```json
{
  "ok": true,
  "items": {}
}
```

The empty department object is intentional when no department-level snapshots are
published. The bridge does not invent departmental results from polling-station
snapshots because the required department ISO mapping is not present in the
published snapshot rows.

`/api/results/progress` returns a compatible progress envelope derived from
published snapshot groups:

```json
{
  "ok": true,
  "processed": 1,
  "total": 1,
  "pct": 100
}
```

`/api/results/departments-progress` returns:

```json
{
  "ok": true,
  "items": {}
}
```

## Current Limitation

The historical map expects department keys such as `HT-OU`, `HT-ND` and `HT-SE`.
The current local V2 snapshots do not include department-level rows or ISO
metadata, so the national projection can be populated but the departmental map
cannot be colored from published V2 data yet.

To enable departmental map coloring later, publication must include department
snapshots with a stable ISO value in snapshot metadata or another approved public
snapshot field.

## Rollback

Disable the flag:

```sh
V2_PUBLIC_RESULTS_BRIDGE=false
```

or remove it from the environment. The routes then use their historical data
source again.
