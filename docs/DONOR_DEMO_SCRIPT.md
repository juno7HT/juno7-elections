# Donor Demo Script

## Audience

This script is for a 20 to 30 minute demonstration with donors, election support
partners, civil society observers or institutional stakeholders.

## Opening Message

"This demonstration shows a read-only V2 election results workflow. It focuses on
traceability, separation of duties and public transparency. The data is fictitious,
the environment is local, and no production deployment is being performed."

## Demo Preparation

Before the session, confirm:

- the local disposable PostgreSQL database is available;
- `V2_READ_API=true`;
- `V2_PUBLIC_UI=true`;
- the dashboard is reachable locally;
- the browser test has passed on desktop and mobile viewports;
- no real candidate, party, location or voter data is used.

## Demonstration Flow

### 1. National Problem And Coverage

Explain that the platform is designed for national coverage, while final
jurisdictional definitions remain subject to official approval. Emphasize
support for multiple elections, rounds, offices and territorial levels.

Expected message:

"The system is structured to scale from a demonstration election to national
coverage without mixing operational entry data with public publication data."

### 2. Election And Round Selection

Open the V2 dashboard and show the visible banner:

```text
V2 — DONNÉES DE DÉMONSTRATION
```

Select the fictitious demonstration election. Show that the dashboard loads:

- election details;
- rounds;
- offices;
- candidacies.

Expected message:

"The dashboard consumes only GET endpoints. It does not contain an admin token and
does not send write requests."

### 3. Field And Data Entry Workflow

Describe how field teams transmit PV documents and how data entry operators enter
values from those source documents. Explain that document files are represented by
logical references and checksums in the model.

Expected message:

"The source document, the entered result and the verified result are separate
records. This is important for auditability."

### 4. Validation And Anomalies

Show or describe PV progress. Explain validation checks:

- PV code match;
- duplicate detection;
- nonnegative counters;
- voters not exceeding registered voters;
- candidate result consistency;
- anomaly recording.

Expected message:

"A failed check does not erase data. It creates a traceable anomaly and a decision
path."

### 5. Corrections And Versioning

Explain that corrections create new result versions. Previous values remain
queryable and correction items record old and new values with justification.

Expected message:

"The platform is designed so that a correction is visible, justified and
auditable. It does not silently replace the earlier version."

### 6. Publication Snapshot

Show the latest publication section. Explain that the public dashboard reads from
publication snapshots, not directly from data entry tables.

Expected message:

"Published results are snapshots. Later operational changes do not retroactively
change what was published."

### 7. Safety Guardrails

Explain:

- read-only V2 API;
- feature flags for API and UI;
- local target refusal rules during testing;
- explicit refusal of the historical production database name;
- no deployment performed by the demo package.

Expected message:

"The demonstration is intentionally conservative. Activation is controlled by
flags and rollback is as simple as disabling the UI flag, then the API flag."

## Closing Message

"The current work proves the core model, local database validation, read-only API
and dashboard demonstration. The next phase is not just engineering. It is
governance, pilot operations, field training, security review and production
readiness."

## Questions To Invite

- Which electoral authority validates the official constituency list?
- Which legal definitions govern valid, blank, null and expressed votes?
- Which correction levels require supervisor or commission approval?
- Which publication milestones should be provisional, corrected or final?
- Which independent audit body should review logs and publication batches?
