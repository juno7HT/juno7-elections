"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const { Client } = require("pg");
const {
  SOURCE,
  buildMapping,
  validateLocalDatabaseEnv
} = require("../database/import/import-haiti-territories");

const repoRoot = path.resolve(__dirname, "..");
const adm3Path = path.join(repoRoot, "frontend", "geo", "HTI_ADM3.geojson");
const communesPath = path.join(repoRoot, "frontend", "geo", "HTI_COMMUNES.geojson");
const mappingPath = path.join(repoRoot, "database", "import", "haiti-territory-mapping.json");
const scriptPath = path.join(repoRoot, "database", "import", "import-haiti-territories.js");

async function sha256(filePath) {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

test("HTI_ADM3 is the same local source as HTI_COMMUNES, not a section source", async () => {
  const [adm3Hash, communesHash, adm3Source] = await Promise.all([
    sha256(adm3Path),
    sha256(communesPath),
    fs.readFile(adm3Path, "utf8")
  ]);

  const adm3 = JSON.parse(adm3Source);
  assert.equal(adm3Hash, communesHash);
  assert.equal(adm3.features.length, 140);
  assert.deepEqual(Object.keys(adm3.features[0].properties), [
    "shapeName",
    "shapeISO",
    "shapeID",
    "shapeGroup",
    "shapeType"
  ]);
});

test("Haiti territory mapping covers departments and 140 communes without sections", async () => {
  const mapping = JSON.parse(await fs.readFile(mappingPath, "utf8"));

  assert.equal(mapping.source, SOURCE);
  assert.equal(mapping.departments.length, 10);
  assert.equal(mapping.communes.length, 140);
  assert.equal(mapping.sections.length, 0);
  assert.equal(mapping.analysis.adm3IsCommunesDuplicate, true);
  assert.equal(mapping.analysis.trueSectionCount, 0);
  assert.equal(mapping.analysis.unmappedCommuneCount, 0);
  assert.equal(mapping.analysis.ambiguousCommuneCount, 0);

  const departmentCodes = new Set(mapping.departments.map((department) => department.code));
  assert.equal(departmentCodes.size, 10);

  for (const commune of mapping.communes) {
    assert.ok(commune.name);
    assert.ok(commune.code.startsWith("HT-COM-"));
    assert.ok(departmentCodes.has(commune.departmentCode), commune.name);
    assert.ok(commune.geojsonName);
    assert.ok(commune.geojsonCode);
    assert.equal(typeof commune.representativePoint.latitude, "number");
    assert.equal(typeof commune.representativePoint.longitude, "number");
  }
});

test("generated mapping is reproducible from the local GeoJSON files", async () => {
  const generated = buildMapping();
  const stored = JSON.parse(await fs.readFile(mappingPath, "utf8"));

  assert.equal(generated.hashes.adm1, stored.hashes.adm1);
  assert.equal(generated.hashes.communes, stored.hashes.communes);
  assert.equal(generated.hashes.adm3, stored.hashes.adm3);
  assert.deepEqual(
    generated.communes.map((commune) => [commune.name, commune.departmentCode]),
    stored.communes.map((commune) => [commune.name, commune.departmentCode])
  );
});

test("territory import script refuses unsafe database targets", () => {
  assert.throws(
    () => validateLocalDatabaseEnv({
      PGHOST: "example.com",
      PGDATABASE: "juno7_elections_v2_test"
    }),
    /Refusing non-local PostgreSQL host/
  );

  assert.throws(
    () => validateLocalDatabaseEnv({
      PGHOST: "127.0.0.1",
      PGDATABASE: "elections2026"
    }),
    /Refusing protected production database name/
  );

  assert.throws(
    () => validateLocalDatabaseEnv({
      PGHOST: "127.0.0.1",
      PGDATABASE: "juno7_elections"
    }),
    /without test\/local marker/
  );
});

test("territory import source contains no destructive SQL", async () => {
  const source = await fs.readFile(scriptPath, "utf8");

  assert.doesNotMatch(source, /\b(DROP|TRUNCATE|DELETE\s+FROM|ALTER\s+SYSTEM)\b/i);
  assert.doesNotMatch(source, /\bresults_votes\b|\bcandidates\b|\busers\b|\baudit\b/i);
});

test("local Haiti territory import is opt-in", { skip: !process.env.HAITI_TERRITORY_IMPORT_TESTS }, async () => {
  validateLocalDatabaseEnv(process.env);

  const client = new Client();
  await client.connect();
  try {
    const counts = await client.query(`
      SELECT territory_level, COUNT(*)::int AS count
      FROM elections_v2.territories
      WHERE metadata->>'source' = $1
      GROUP BY territory_level
      ORDER BY territory_level
    `, [SOURCE]);

    const byLevel = Object.fromEntries(counts.rows.map((row) => [row.territory_level, row.count]));
    assert.equal(byLevel.country, 1);
    assert.equal(byLevel.department, 10);
    assert.equal(byLevel.commune, 140);
    assert.equal(byLevel.section || 0, 0);

    const duplicates = await client.query(`
      SELECT territory_level, code, COUNT(*)::int AS count
      FROM elections_v2.territories
      WHERE metadata->>'source' = $1
      GROUP BY territory_level, code
      HAVING COUNT(*) > 1
    `, [SOURCE]);
    assert.equal(duplicates.rows.length, 0);
  } finally {
    await client.end();
  }
});
