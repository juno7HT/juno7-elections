const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migrationDir = path.join(root, 'database', 'migrations', 'v2');
const pvMigrationFiles = [
  '008_create_pv_intake.sql',
  '009_create_pv_results.sql',
  '010_create_pv_validation_and_corrections.sql',
  '011_create_publication_model.sql',
  '012_create_pv_indexes.sql',
  '013_pv_schema_validation.sql'
];
const pvTables = [
  'expected_pvs',
  'pv_submissions',
  'pv_documents',
  'pv_results',
  'pv_candidate_results',
  'pv_validation_checks',
  'pv_anomalies',
  'pv_validations',
  'pv_decisions',
  'result_corrections',
  'result_correction_items',
  'publication_batches',
  'publication_batch_items',
  'published_result_snapshots'
];

async function read(file) {
  return fs.readFile(path.join(root, file), 'utf8');
}

async function readMigration(file) {
  return fs.readFile(path.join(migrationDir, file), 'utf8');
}

async function readPvMigrations() {
  const parts = await Promise.all(pvMigrationFiles.map((file) => readMigration(file)));
  return parts.join('\n');
}

test('PV migrations 008 to 013 are present', async () => {
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of pvMigrationFiles) {
    assert.equal(files.includes(file), true, file);
  }
});

test('PV migrations keep numeric order', async () => {
  const numbers = pvMigrationFiles.map((file) => Number(file.slice(0, 3)));
  assert.deepEqual(numbers, [8, 9, 10, 11, 12, 13]);
});

test('PV migrations contain no destructive table removal token', async () => {
  const source = await readPvMigrations();
  assert.doesNotMatch(source, new RegExp('\\bD' + 'ROP\\b', 'i'));
});

test('PV migrations contain no table-emptying token', async () => {
  const source = await readPvMigrations();
  assert.doesNotMatch(source, new RegExp('\\bTRUN' + 'CATE\\b', 'i'));
});

test('PV migrations contain no production database reference', async () => {
  const source = await readPvMigrations();
  assert.doesNotMatch(source, new RegExp('elections' + '2026', 'i'));
});

test('PV migrations create all PV tables', async () => {
  const source = await readPvMigrations();
  for (const table of pvTables) {
    assert.match(
      source,
      new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+elections_v2\\.${table}\\b`, 'i'),
      table
    );
  }
});

test('PV migrations include non-negative constraints', async () => {
  const source = await readPvMigrations();
  const constraints = [
    'pv_results_registered_voters_check',
    'pv_results_voters_check',
    'pv_results_valid_ballots_check',
    'pv_candidate_results_votes_check',
    'published_result_snapshots_votes_check'
  ];
  for (const constraint of constraints) {
    assert.match(source, new RegExp(`CONSTRAINT\\s+${constraint}\\b`, 'i'), constraint);
  }
});

test('PV candidate result uniqueness is enforced', async () => {
  const source = await readMigration('009_create_pv_results.sql');
  assert.match(source, /pv_candidate_results_result_candidacy_unique/i);
  assert.match(source, /UNIQUE\s*\(\s*pv_result_id,\s*candidacy_id\s*\)/i);
});

test('PV validation and anomaly tables are present', async () => {
  const source = await readMigration('010_create_pv_validation_and_corrections.sql');
  for (const table of ['pv_validation_checks', 'pv_anomalies', 'pv_validations', 'pv_decisions']) {
    assert.match(source, new RegExp(`elections_v2\\.${table}\\b`, 'i'), table);
  }
});

test('PV corrections are versioned and itemized', async () => {
  const source = await readMigration('010_create_pv_validation_and_corrections.sql');
  assert.match(source, /elections_v2\.result_corrections/i);
  assert.match(source, /source_pv_result_id/i);
  assert.match(source, /target_pv_result_id/i);
  assert.match(source, /elections_v2\.result_correction_items/i);
  assert.match(source, /old_value\s+JSONB/i);
  assert.match(source, /new_value\s+JSONB/i);
});

test('Publication batches and snapshots are present', async () => {
  const source = await readMigration('011_create_publication_model.sql');
  for (const table of ['publication_batches', 'publication_batch_items', 'published_result_snapshots']) {
    assert.match(source, new RegExp(`elections_v2\\.${table}\\b`, 'i'), table);
  }
});

test('Published snapshots are separate from entry tables', async () => {
  const source = await readMigration('011_create_publication_model.sql');
  assert.match(source, /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+elections_v2\.published_result_snapshots/i);
  assert.doesNotMatch(source, /ALTER\s+TABLE\s+elections_v2\.pv_results/i);
});

test('PV validation script is strictly read-only', async () => {
  const source = await readMigration('013_pv_schema_validation.sql');
  assert.match(source, /\bSELECT\b/i);
  assert.doesNotMatch(source, /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|GRANT|REVOKE)\b/i);
  assert.doesNotMatch(source, new RegExp('\\bD' + 'ROP\\b', 'i'));
  assert.doesNotMatch(source, new RegExp('\\bTRUN' + 'CATE\\b', 'i'));
});

test('PV migrations do not explicitly modify historical tables', async () => {
  const source = await readPvMigrations();
  const pattern = /\b(ALTER|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?(results_votes|results_department|locations_electoral_units|candidates)\b/i;
  assert.doesNotMatch(source, pattern);
});

test('PV table names are coherent with the data dictionary', async () => {
  const dictionary = await read('docs/ELECTORAL_DATA_DICTIONARY.md');
  for (const table of pvTables) {
    assert.match(dictionary, new RegExp(`\\b${table}\\b`), table);
  }
});

test('PV policy documents are present', async () => {
  for (const file of [
    'docs/PV_DATA_MODEL.md',
    'docs/PV_VALIDATION_RULES.md',
    'docs/PV_PUBLICATION_MODEL.md',
    'docs/PV_CORRECTION_POLICY.md'
  ]) {
    const source = await read(file);
    assert.match(source, /^# /, file);
  }
});

test('results_votes mapping to PV tables is documented', async () => {
  const source = await read('docs/V2_SCHEMA_MAPPING.md');
  for (const phrase of [
    'expected_pvs',
    'pv_submissions',
    'pv_results',
    'pv_candidate_results',
    'candidate non mappable',
    'territoire non mappable',
    'election_id invalide'
  ]) {
    assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), phrase);
  }
});

test('PV Sprint 5 files contain no obvious real data or secrets', async () => {
  const source = [
    await readPvMigrations(),
    await read('docs/PV_DATA_MODEL.md'),
    await read('docs/PV_VALIDATION_RULES.md'),
    await read('docs/PV_PUBLICATION_MODEL.md'),
    await read('docs/PV_CORRECTION_POLICY.md')
  ].join('\n');
  assert.doesNotMatch(source, /postgres(?:ql)?:\/\/|ADMIN_TOKEN|DATABASE_URL|sk-[A-Za-z0-9_-]+|BEGIN OPENSSH PRIVATE KEY/i);
  assert.doesNotMatch(source, /Alex Modele|Mira Exemple|Noe Temoin/i);
});
