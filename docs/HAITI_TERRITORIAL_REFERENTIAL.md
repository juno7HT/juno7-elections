# Haiti Territorial Referential

This document defines the local national territorial referential used to populate
`elections_v2.territories` for V2 public-read and bridge work.

It is based only on local GeoJSON files committed with the project. It does not
use VPS data, remote databases, election results, candidates, users, logs or
secrets.

## Sources

| File | Role | Observed content |
| --- | --- | --- |
| `frontend/geo/HTI_ADM1.geojson` | Departments | 10 department features with `ISO_Code` values such as `HT-OU` |
| `frontend/geo/HTI_COMMUNES.geojson` | Communes | 140 commune features with stable `shapeName` and `shapeID` values |
| `frontend/geo/HTI_ADM3.geojson` | Duplicate commune source | Byte-for-byte identical to `HTI_COMMUNES.geojson` |

`HTI_ADM3.geojson` must not be treated as a section-communale source in its
current form. It has the same hash, feature count, properties and names as
`HTI_COMMUNES.geojson`.

## Counts

| Entity | Count | Source |
| --- | ---: | --- |
| Departments | 10 | `HTI_ADM1.geojson` |
| Communes | 140 | `HTI_COMMUNES.geojson` |
| True communal sections | 0 | No local source currently identifies them |

## Mapping Strategy

Departments are mapped directly from `HTI_ADM1.geojson`:

- `NAME` is preserved in metadata as `geojson_name`.
- `ISO_Code` is used as the V2 department `code` and `iso_code`.
- The stored department `name` removes only the generic department prefix for
  readability, while the original accented GeoJSON label remains in metadata.

Communes are mapped from `HTI_COMMUNES.geojson`:

- `shapeName` is preserved as the commune name.
- `shapeID` is preserved as the stable GeoJSON code in metadata.
- The parent department is determined by a representative point from the
  commune geometry intersected with the ADM1 department polygons.
- Accents and spelling variants are preserved in `name`; a lowercase
  accent-stripped value is stored in `normalized_name` for matching.

No sections are created because no local file currently distinguishes sections
from communes.

## Import Script

The import is implemented in:

`database/import/import-haiti-territories.js`

The generated mapping is stored in:

`database/import/haiti-territory-mapping.json`

The import writes only to:

`elections_v2.territories`

It is idempotent and uses `INSERT ... ON CONFLICT` against the existing unique
territory constraints. It does not modify migrations 001 to 013.

## Safety Guards

The script refuses:

- non-local PostgreSQL hosts;
- the protected database name `elections2026`;
- database names without a `test` or `local` marker.

The script does not read or write result, candidate, user, role, log or audit
tables.

## Local Run

Example for the disposable local database:

```sh
PGHOST=127.0.0.1 \
PGPORT=55433 \
PGDATABASE=juno7_elections_v2_test \
node database/import/import-haiti-territories.js
```

Verification:

```sh
PGHOST=127.0.0.1 \
PGPORT=55433 \
PGDATABASE=juno7_elections_v2_test \
node database/import/import-haiti-territories.js --verify
```

Expected imported referential counts:

- `country`: 1
- `department`: 10
- `commune`: 140
- `section`: 0

Existing fictional demo territories may still exist in the local database. The
expected counts above apply to rows whose metadata source is
`haiti_geojson_national_referential`.

## Current Anomalies

- `HTI_ADM3.geojson` is not a section source; it duplicates the commune file.
- Section codes and section names are unavailable locally.
- Communes have stable `shapeID` values, but no official commune ISO code is
  present in the GeoJSON.
- No commune was unmappable or ambiguous when intersected with department
  polygons.

## Compatibility

The department map can use the imported department `iso_code` values to match
GeoJSON `ISO_Code`.

The commune map can use preserved commune `name` / `geojson_name` values to
match GeoJSON `shapeName`.

The public bridge should not expose section-level results until a real
section-level source is introduced and validated.
