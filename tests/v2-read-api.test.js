const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const enabled = process.env.V2_READ_API_TESTS === "1";

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ["-e", script], {
      cwd: root,
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function readV2Source() {
  const files = fs.readdirSync(path.join(root, "src", "v2"), { recursive: true })
    .filter(file => file.endsWith(".js"))
    .map(file => path.join(root, "src", "v2", file));
  return files.map(file => fs.readFileSync(file, "utf8")).join("\n");
}

test("V2 read API source registers only GET routes and contains no write SQL", () => {
  const source = readV2Source();
  assert.doesNotMatch(source, /\.post\s*\(/i);
  assert.doesNotMatch(source, /\.put\s*\(/i);
  assert.doesNotMatch(source, /\.patch\s*\(/i);
  assert.doesNotMatch(source, /\.delete\s*\(/i);
  assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE|UPSERT|MERGE|DROP|TRUNCATE|ALTER|CREATE)\b/i);
});

test("V2 routes are not registered when V2_READ_API is disabled", async () => {
  const script = `
    delete process.env.V2_READ_API;
    delete process.env.V2_DATABASE_URL;
    const { app } = require("./index.js");
    app.inject({ method: "GET", url: "/api/v2/elections" })
      .then((res) => {
        console.log("STATUS:" + res.statusCode);
        return app.close();
      })
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  `;
  const result = await runNode(script, {
    DATABASE_URL: "",
    PGHOST: "127.0.0.1",
    PGPORT: "55433",
    PGDATABASE: "juno7_elections_v2_test"
  });
  assert.match(result.stdout, /STATUS:404/);
});

test("V2 read API refuses unsafe DATABASE_URL values", () => {
  const { buildPoolConfig } = require("../src/v2/db");
  assert.throws(() => buildPoolConfig({
    DATABASE_URL: "postgres://example.com:5432/juno7_elections_v2_test"
  }), /non-local/);
  assert.throws(() => buildPoolConfig({
    DATABASE_URL: "postgres://127.0.0.1:55433/elections2026"
  }), /elections2026/);
  assert.throws(() => buildPoolConfig({
    DATABASE_URL: "postgres://127.0.0.1:55433/juno7_elections"
  }), /test or local/);
});

test("local V2 read API contracts", { skip: enabled ? false : "Set V2_READ_API_TESTS=1 to run local PostgreSQL V2 API checks." }, async () => {
  process.env.V2_READ_API = "true";
  process.env.PGHOST = process.env.PGHOST || "127.0.0.1";
  process.env.PGPORT = process.env.PGPORT || "55433";
  process.env.PGDATABASE = process.env.PGDATABASE || "juno7_elections_v2_test";

  const { app } = require("../index.js");

  const elections = await app.inject({ method: "GET", url: "/api/v2/elections?limit=1&offset=0" });
  assert.equal(elections.statusCode, 200);
  const electionsBody = elections.json();
  assert.equal(electionsBody.ok, true);
  assert.ok(Array.isArray(electionsBody.items));
  assert.equal(electionsBody.meta.limit, 1);
  assert.ok(electionsBody.items.length >= 1);

  const electionPublicId = electionsBody.items[0].publicId;
  const electionDetail = await app.inject({ method: "GET", url: `/api/v2/elections/${electionPublicId}` });
  assert.equal(electionDetail.statusCode, 200);
  assert.equal(electionDetail.json().items[0].publicId, electionPublicId);

  const rounds = await app.inject({ method: "GET", url: `/api/v2/elections/${electionPublicId}/rounds?limit=5` });
  assert.equal(rounds.statusCode, 200);
  assert.ok(Array.isArray(rounds.json().items));

  const territories = await app.inject({ method: "GET", url: "/api/v2/territories?level=country&limit=10" });
  assert.equal(territories.statusCode, 200);
  assert.ok(territories.json().items.every(item => item.territoryLevel === "country"));

  const firstTerritory = territories.json().items[0];
  const children = await app.inject({ method: "GET", url: `/api/v2/territories/${firstTerritory.publicId}/children` });
  assert.equal(children.statusCode, 200);
  assert.equal(children.json().meta.parentPublicId, firstTerritory.publicId);

  const offices = await app.inject({ method: "GET", url: "/api/v2/offices?scopeLevel=national" });
  assert.equal(offices.statusCode, 200);
  assert.ok(offices.json().items.every(item => item.scopeLevel === "national"));

  const candidacies = await app.inject({ method: "GET", url: `/api/v2/candidacies?electionPublicId=${electionPublicId}&status=approved` });
  assert.equal(candidacies.statusCode, 200);
  assert.ok(candidacies.json().items.length >= 1);

  const progress = await app.inject({ method: "GET", url: `/api/v2/pvs/progress?electionPublicId=${electionPublicId}` });
  assert.equal(progress.statusCode, 200);
  assert.ok(progress.json().items.length >= 1);

  const publication = await app.inject({ method: "GET", url: `/api/v2/publications/latest?electionPublicId=${electionPublicId}` });
  assert.equal(publication.statusCode, 200);
  assert.ok(publication.json().items[0].snapshots.length >= 1);

  const invalidFilter = await app.inject({ method: "GET", url: "/api/v2/territories?level=planet" });
  assert.equal(invalidFilter.statusCode, 400);
  assert.equal(invalidFilter.json().ok, false);

  const notFound = await app.inject({ method: "GET", url: "/api/v2/elections/not_found_v2" });
  assert.equal(notFound.statusCode, 404);
  assert.deepEqual(notFound.json().items, []);

  const postAttempt = await app.inject({ method: "POST", url: "/api/v2/elections", payload: {} });
  assert.equal(postAttempt.statusCode, 404);

  await app.close();
});
