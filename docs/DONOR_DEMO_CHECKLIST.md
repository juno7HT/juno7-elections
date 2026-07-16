# Donor Demo Checklist

## Before The Demo

- Confirm the demo uses only fictitious data.
- Confirm no VPS, remote database or production environment is involved.
- Confirm no migrations will be executed during the donor session.
- Confirm no application code changes are part of the demo.
- Confirm `V2_READ_API=true` only for the local demo session.
- Confirm `V2_PUBLIC_UI=true` only for the local demo session.
- Confirm the dashboard banner is visible:

```text
V2 — DONNÉES DE DÉMONSTRATION
```

## Technical Checks

Run the standard local checks before presenting:

```sh
git diff --check
npm test
npm run validate
```

For local API evidence:

```sh
V2_READ_API_TESTS=1 V2_READ_API=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-read-api.test.js
```

For browser evidence:

```sh
V2_BROWSER_TESTS=1 V2_READ_API=true V2_PUBLIC_UI=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-dashboard-browser.test.js
```

## Content Checks

- Explain that budget numbers are indicative hypotheses.
- Explain that final legal and operational rules remain subject to official
  approval.
- Avoid naming real candidates, parties, polling places or voters.
- Avoid exposing connection strings, credentials, local paths or internal logs on
  the projector unless they are intentionally sanitized.
- State clearly that the demo does not authorize production activation.

## Demo Walkthrough

1. Introduce the problem: national PV collection, validation and transparent
   publication.
2. Show the V2 dashboard and demo banner.
3. Select the fictitious election.
4. Show rounds, offices and candidacies.
5. Explain expected PVs, submissions and source documents.
6. Show PV progress and describe validation checks.
7. Explain anomaly handling and correction versioning.
8. Show latest publication snapshots.
9. Explain why public data is separated from entry tables.
10. Close with roadmap, budget hypothesis and governance decisions.

## Questions To Be Ready For

- What prevents silent result changes?
- Who approves sensitive corrections?
- How are provisional and final publications separated?
- How can observers or auditors verify decisions?
- What remains before production readiness?
- What is included in the USD 400,000 planning hypothesis?

## After The Demo

- Disable `V2_PUBLIC_UI` if the local session should no longer expose the page.
- Disable `V2_READ_API` if the local session should no longer expose the API.
- Record questions, concerns and requested evidence.
- Update the risk register if stakeholders identify new risks.
- Do not push, deploy or connect to remote infrastructure as part of the demo.
