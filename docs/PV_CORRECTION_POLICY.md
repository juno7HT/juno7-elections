# PV Correction Policy

Date: 2026-07-16

## 1. Principle

Corrections are versioned, justified and auditable. A verified, retained or published result must not be silently edited.

## 2. Correction Header

`result_corrections` records:

- corrected object type and id;
- source and target result versions when applicable;
- requester;
- approver;
- required reason;
- status;
- request, approval and application dates;
- sensitivity level;
- optional anomaly reference.

Statuses are `requested`, `approved`, `rejected`, `applied`, `cancelled`.

## 3. Correction Items

`result_correction_items` records each field change:

- field name;
- old JSONB value;
- new JSONB value;
- required justification;
- order;
- validation status.

## 4. Version Rule

Applying a correction creates a new logical result version. Previous values remain queryable through the old result row and the correction items.

## 5. Approval Rule

No correction should be applied without:

- a reason;
- at least one correction item;
- an authorized approval for sensitive or critical corrections;
- an audit log entry.

The approval level and legal thresholds remain governance decisions and are not hard-coded beyond safe status and date checks.
