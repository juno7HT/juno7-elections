# Donor Security And Governance

## Security Position

The current V2 demonstration is intentionally conservative. It validates the
model, API and dashboard locally while avoiding production deployment, remote
database access and write flows in the public V2 surface.

## Data Protection Principles

- Use fictitious data for demonstrations unless an approved authority authorizes
  another dataset.
- Do not store secrets, credentials or private keys in documentation or source.
- Avoid exposing SQL text, connection strings or sensitive operational details in
  public error responses.
- Keep public publication data separated from operational entry and validation
  tables.
- Preserve prior versions and correction history for audit.

## Read-Only Public Surface

The donor-facing demonstration relies on:

- `V2_READ_API=true` to expose GET-only API routes;
- `V2_PUBLIC_UI=true` to expose the dashboard;
- no V2 POST, PUT, PATCH or DELETE route;
- no admin token in the public dashboard;
- no browser storage for privileged data.

Rollback is controlled by disabling `V2_PUBLIC_UI` first, then `V2_READ_API` if
required.

## Governance Decisions Still Required

The following decisions should be approved before any production use:

- official list of elective offices;
- official constituency and polling-station referential;
- legal definitions of valid, blank, null and expressed votes;
- public visibility rules for centers and polling stations;
- approval levels for sensitive corrections;
- retention period for PV documents and audit logs;
- provisional, corrected and final publication rules;
- independent audit access and reporting process.

## Audit And Accountability

The V2 model supports traceability through:

- expected PV records;
- submission and document references;
- validation checks and anomalies;
- human validations and operational decisions;
- versioned corrections with old and new values;
- publication batches and immutable snapshots;
- audit logs for key workflow events.

The governance process should define who can create, approve, apply and review
each of these records.

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Late legal definition of vote categories | Rework of validation and publication formulas | Obtain legal validation before production configuration |
| Unapproved constituency referential | Incomplete or contested coverage | Freeze official referential before pilot |
| Weak correction governance | Loss of confidence in revised results | Require approvals, reasons and audit logs |
| Insufficient field training | Delays and inconsistent PV submissions | Run pilot training and simulation exercises |
| Premature public activation | Misinterpretation of demonstration data | Keep flags off until approval and display clear demo banners |
| Missing independent audit review | Reduced donor and public confidence | Include audit body in acceptance process |

## Donor Assurance Measures

Recommended assurance activities include:

- independent security review before any production activation;
- tabletop exercise for correction and publication incidents;
- evidence pack for migration, validation and browser tests;
- documented rollback exercise for both V2 flags;
- quarterly governance review with stakeholders.

## Current Boundary

This document does not claim that the platform is production certified. It
describes the guardrails already demonstrated and the governance work needed
before controlled activation outside a local environment.
