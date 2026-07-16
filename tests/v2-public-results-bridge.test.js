const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const bridge = require("../src/v2/repositories/public-results-bridge");

const root = path.join(__dirname, "..");
const enabled = process.env.V2_PUBLIC_RESULTS_BRIDGE_TESTS === "1";

function sourceFor(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function routeSource(source, route) {
  const start = source.indexOf(`"${route}"`);
  assert.equal(start >= 0, true, `${route} exists`);
  const routeStart = source.lastIndexOf("app.", start);
  const nextRoute = source.indexOf("\napp.", start + 1);
  return source.slice(routeStart, nextRoute === -1 ? source.length : nextRoute);
}

function demoSnapshots() {
  return [
    {
      public_id: "snapshot_a",
      publication_batch_id: 10,
      aggregation_level: "polling_station",
      territory_id: 1,
      district_id: 1,
      office_id: 1,
      candidacy_id: 5,
      votes: 42,
      metadata: { source_pv_result_id: 77 }
    },
    {
      public_id: "snapshot_b",
      publication_batch_id: 10,
      aggregation_level: "polling_station",
      territory_id: 1,
      district_id: 1,
      office_id: 1,
      candidacy_id: 6,
      votes: 30,
      metadata: { source_pv_result_id: 77 }
    }
  ];
}

test("V2 public results bridge flag is explicit", () => {
  assert.equal(bridge.isV2PublicResultsBridgeEnabled({}), false);
  assert.equal(bridge.isV2PublicResultsBridgeEnabled({ V2_PUBLIC_RESULTS_BRIDGE: "false" }), false);
  assert.equal(bridge.isV2PublicResultsBridgeEnabled({ V2_PUBLIC_RESULTS_BRIDGE: "true" }), true);
});

test("V2 public results bridge source is read-only", () => {
  const source = sourceFor("src/v2/repositories/public-results-bridge.js");
  assert.match(source, /publication_batches/);
  assert.match(source, /published_result_snapshots/);
  assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE|UPSERT|MERGE|DROP|TRUNCATE|ALTER|CREATE)\b/i);
  assert.doesNotMatch(source, /expected_pvs|pv_results|pv_submissions|pv_candidate_results/i);
});

test("historical routes keep fallback SQL when bridge flag is off", () => {
  const source = sourceFor("index.js");
  for (const route of [
    "/api/results/departments-live",
    "/api/results/national-live",
    "/api/results/progress",
    "/api/results/departments-progress"
  ]) {
    const chunk = routeSource(source, route);
    assert.match(chunk, /isV2PublicResultsBridgeEnabled/);
    assert.match(chunk, /results_votes|locations_electoral_units/);
  }

  const communes = routeSource(source, "/api/results/communes");
  assert.match(communes, /FROM results_votes/);
  assert.doesNotMatch(communes, /isV2PublicResultsBridgeEnabled/);
});

test("national-live contract is built from V2 snapshots", () => {
  const body = bridge.buildNationalPayload(demoSnapshots());
  assert.equal(body.ok, true);
  assert.equal(body.totalVotes, 72);
  assert.deepEqual(body.ranking, [
    { candidate: "CANDIDACY_5", votes: 42, pct: 0.5833 },
    { candidate: "CANDIDACY_6", votes: 30, pct: 0.4167 }
  ]);
  assert.equal(body.leader, "CANDIDACY_5");
  assert.equal(body.isTie, false);
});

test("departments-live returns a clean empty contract without department snapshots", () => {
  const body = bridge.buildDepartmentsPayload(demoSnapshots());
  assert.deepEqual(body, { ok: true, items: {} });
});

test("progress contract is built from published snapshot groups", () => {
  const body = bridge.buildProgressPayload(demoSnapshots());
  assert.deepEqual(body, {
    ok: true,
    processed: 1,
    total: 1,
    pct: 100
  });
});

test("departments-progress returns a clean empty contract without department snapshots", () => {
  const body = bridge.buildDepartmentsProgressPayload(demoSnapshots());
  assert.deepEqual(body, { ok: true, items: {} });
});

test("local V2 public results bridge contracts", { skip: enabled ? false : "Set V2_PUBLIC_RESULTS_BRIDGE_TESTS=1 to run local PostgreSQL bridge checks." }, async () => {
  process.env.V2_PUBLIC_RESULTS_BRIDGE = "true";
  process.env.PGHOST = process.env.PGHOST || "127.0.0.1";
  process.env.PGPORT = process.env.PGPORT || "55433";
  process.env.PGDATABASE = process.env.PGDATABASE || "juno7_elections_v2_test";

  const { app } = require("../index.js");

  const national = await app.inject({ method: "GET", url: "/api/results/national-live" });
  assert.equal(national.statusCode, 200);
  assert.equal(national.json().ok, true);
  assert.equal(national.json().totalVotes > 0, true);
  assert.equal(national.json().ranking.length >= 1, true);

  const progress = await app.inject({ method: "GET", url: "/api/results/progress" });
  assert.equal(progress.statusCode, 200);
  assert.equal(progress.json().ok, true);
  assert.equal(progress.json().processed >= 1, true);

  const departments = await app.inject({ method: "GET", url: "/api/results/departments-live" });
  assert.equal(departments.statusCode, 200);
  assert.deepEqual(departments.json(), { ok: true, items: {} });

  const departmentsProgress = await app.inject({ method: "GET", url: "/api/results/departments-progress" });
  assert.equal(departmentsProgress.statusCode, 200);
  assert.deepEqual(departmentsProgress.json(), { ok: true, items: {} });

  const postAttempt = await app.inject({ method: "POST", url: "/api/results/national-live", payload: {} });
  assert.equal(postAttempt.statusCode, 404);

  await app.close();
});
