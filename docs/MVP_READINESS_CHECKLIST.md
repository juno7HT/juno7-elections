# MVP Readiness Checklist

## Purpose

This checklist defines the minimum evidence required to declare the Juno7
Elections V2 MVP ready to show in a controlled donor demonstration. It does not
declare the system ready for production.

## Readiness Status Legend

- `ready`: required evidence exists for the donor demo.
- `conditional`: acceptable for demo only if the condition is explained.
- `not ready`: must be resolved before showing.

## Core Criteria

| Area | Required Evidence | Status |
| --- | --- | --- |
| Documentation index | [Project Documentation Index](./PROJECT_DOCUMENTATION_INDEX.md) exists and links the core docs | ready |
| Donor brief | [Donor Demo Brief](./DONOR_DEMO_BRIEF.md) explains problem, value and boundary | ready |
| Demo script | [Donor Demo Script](./DONOR_DEMO_SCRIPT.md) gives a repeatable walkthrough | ready |
| Technical overview | [Donor Technical Overview](./DONOR_TECHNICAL_OVERVIEW.md) explains V2 architecture | ready |
| Security posture | [Donor Security And Governance](./DONOR_SECURITY_AND_GOVERNANCE.md) states guardrails and open decisions | conditional |
| Roadmap and budget | [Donor Roadmap And Budget](./DONOR_ROADMAP_AND_BUDGET.md) marks USD 400,000 as an indicative hypothesis | conditional |
| Demo handoff | [Donor Demo Handoff](./DONOR_DEMO_HANDOFF.md) defines operator responsibilities and rollback | ready |

## Technical Criteria

| Criterion | Ready When |
| --- | --- |
| Local database | Local PostgreSQL target `127.0.0.1:55433/juno7_elections_v2_test` is reachable |
| Fictitious data | Demo election, PV workflow and publication snapshot exist with no real electoral data |
| API flag | `V2_READ_API=true` exposes only GET `/api/v2/*` routes |
| UI flag | `V2_PUBLIC_UI=true` exposes `/v2-dashboard` |
| Feature flag rollback | Disabling `V2_PUBLIC_UI` returns dashboard routes to 404 |
| API rollback | Disabling `V2_READ_API` returns V2 API routes to 404 |
| No write flow | Browser and API tests confirm no V2 POST, PUT, PATCH or DELETE route is available |
| Dashboard states | Loading, empty, error and 404 states are demonstrable |
| Browser coverage | Desktop and mobile browser tests pass |
| Historical safety | Historical routes are not changed by the demo package |

## Required Verification Commands

Run and record the result before declaring the MVP ready to show:

```sh
git diff --check
npm test
npm run validate
V2_READ_API_TESTS=1 V2_READ_API=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-read-api.test.js
V2_BROWSER_TESTS=1 V2_READ_API=true V2_PUBLIC_UI=true PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=juno7_elections_v2_test node --test tests/v2-dashboard-browser.test.js
```

All commands must pass for a live donor demo. If an optional browser dependency
is unavailable, switch to a recorded demo only and mark the readiness status as
conditional.

## Content Criteria

Before showing the MVP, confirm:

- all data shown is fictitious or formally approved for demonstration;
- the banner `V2 — DONNÉES DE DÉMONSTRATION` is visible;
- the presenter states that no production deployment is happening;
- the USD 400,000 budget is described as an indicative planning hypothesis;
- no operational count is presented as an official commitment;
- legal and governance decisions are described as open where appropriate;
- no secrets, tokens, local absolute paths or private connection strings appear
  on slides, terminal output or browser screens.

## Responsibilities During Demo

- Presenter controls the narrative and keeps claims within validated scope.
- Technical operator controls local startup, test evidence and rollback.
- Governance lead answers approval and legal-scope questions.
- Note taker records decisions, risks and donor follow-ups.

## Problems Known Before Demo

- Production deployment process is intentionally out of scope.
- Official legal vote definitions are not yet encoded as final rules.
- Official constituency and polling station referential remains to be approved.
- Production identity, monitoring, backup and incident response are incomplete.
- Budget and quarterly deliverables are planning hypotheses.

## Ready To Show Decision

Declare the MVP ready to show only when:

1. all required verification commands pass;
2. the local V2 dashboard works on desktop and mobile;
3. the public dashboard sends no write requests;
4. the demo database contains only fictitious or approved data;
5. rollback has been rehearsed or reviewed;
6. the presenter can clearly distinguish validated evidence from open decisions.

If any criterion fails, postpone the live demo or use a recorded, clearly labeled
walkthrough instead.
