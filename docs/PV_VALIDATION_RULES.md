# PV Validation Rules

Date: 2026-07-16

## 1. Validation Principle

Validation does not overwrite source data. It creates checks, anomalies, validations and decisions that point to a specific submission or result version.

## 2. Automatic And Human Checks

`pv_validation_checks` stores:

- `check_type`;
- `check_status`: `passed`, `failed`, `warning`, `skipped`;
- expected value;
- observed value;
- JSON details;
- system/user executor;
- execution timestamp.

Recommended check types include PV code match, duplicate checksum, readable document, candidate coverage, nonnegative counters, voters within registered voters and candidate vote total comparison.

## 3. Anomalies

`pv_anomalies` tracks open and resolved anomalies:

- duplicate;
- unreadable document;
- inconsistent PV code;
- inconsistent total;
- inconsistent territory;
- unknown candidate;
- entry discrepancy;
- suspected modification;
- other.

Severity levels are `low`, `medium`, `high`, `critical`. Statuses are `open`, `assigned`, `resolved`, `dismissed`, `archived`.

## 4. Human Validation

`pv_validations` records each verifier act:

- target submission or result;
- verifier;
- validation type;
- validation decision;
- verified version;
- comment and metadata.

Validation decisions include `approved`, `rejected`, `contested`, `needs_correction`, `included`, `excluded`.

## 5. Operational Decisions

`pv_decisions` records operational decisions such as include, exclude, retain provisionally, contest, request correction, publish or withdraw from publication. Sensitive decisions must supersede earlier decisions rather than overwrite them.

Every decision requires an author, role, reason, date, target version when relevant and optional link to a previous decision.
