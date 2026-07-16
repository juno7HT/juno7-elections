# PV Publication Model

Date: 2026-07-16

## 1. Publication Boundary

Publication is a versioned export boundary. Public readers should consume `published_result_snapshots`, not operational entry, validation or correction tables.

## 2. Publication Batches

`publication_batches` represents one publication lot:

- election and optional round;
- publication type: `provisional`, `corrected`, `final`, `withdrawal`;
- version number;
- status: `draft`, `prepared`, `approved`, `published`, `withdrawn`, `archived`;
- preparer and approver;
- dates;
- public note;
- optional checksum.

The pair of election/round/type/version is unique.

## 3. Batch Items

`publication_batch_items` records the objects included in a batch: expected PV, submission, result, decision or aggregate snapshot. These references make the publication auditable.

## 4. Published Snapshots

`published_result_snapshots` stores immutable public result rows:

- aggregation level;
- territory or district;
- office;
- candidacy;
- votes and relevant totals;
- percentage and ranking when calculated;
- metadata and calculation date.

Snapshots preserve what was published even if later corrections create a new batch.

## 5. Withdrawal

Withdrawal is represented by a batch of type `withdrawal` or by changing a publication batch status in an approved application workflow. The previous snapshot remains preserved for audit.
