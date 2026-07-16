const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migrationDir = path.join(root, 'database', 'migrations', 'v2');
const expectedMigrationFiles = [
  '001_create_enums_and_helpers.sql',
  '002_create_election_core.sql',
  '003_create_territorial_referential.sql',
  '004_create_political_entities.sql',
  '005_create_access_control.sql',
  '006_create_indexes.sql',
  '007_schema_validation.sql'
];
const expectedTables = [
  'elections',
  'election_rounds',
  'electoral_offices',
  'territories',
  'electoral_districts',
  'electoral_district_territories',
  'polling_centers',
  'polling_stations',
  'persons',
  'political_parties',
  'coalitions',
  'coalition_members',
  'candidacies',
  'users',
  'roles',
  'user_roles',
  'audit_logs'
];

async function readProjectFile(file) {
  return fs.readFile(path.join(root, file), 'utf8');
}

async function readMigration(file) {
  return fs.readFile(path.join(migrationDir, file), 'utf8');
}

async function readAllMigrations() {
  const files = await fs.readdir(migrationDir);
  const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();
  const pairs = await Promise.all(sqlFiles.map(async (file) => [file, await readMigration(file)]));
  return { files: sqlFiles, source: pairs.map(([, source]) => source).join('\n') };
}

test('V2 migration files are present', async () => {
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
  assert.deepEqual(files, expectedMigrationFiles);
});

test('V2 migration files use the expected numeric order', async () => {
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
  const numbers = files.map((file) => Number(file.slice(0, 3)));
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7]);
});

test('V2 migrations do not contain destructive table removal tokens', async () => {
  const { source } = await readAllMigrations();
  assert.doesNotMatch(source, new RegExp('\\bD' + 'ROP\\b', 'i'));
});

test('V2 migrations do not contain table-emptying tokens', async () => {
  const { source } = await readAllMigrations();
  assert.doesNotMatch(source, new RegExp('\\bTRUN' + 'CATE\\b', 'i'));
});

test('V2 migrations do not reference the production database name', async () => {
  const { source } = await readAllMigrations();
  assert.doesNotMatch(source, /elections2026/i);
});

test('V2 migrations do not contain obvious secrets or credential URLs', async () => {
  const { source } = await readAllMigrations();
  assert.doesNotMatch(source, /postgres(?:ql)?:\/\/|ADMIN_TOKEN|DATABASE_URL|sk-[A-Za-z0-9_-]+|BEGIN OPENSSH PRIVATE KEY/i);
  assert.doesNotMatch(source, /PASSWORD\s+'[^']+'/i);
});

test('V2 migrations create all expected tables in the isolated schema', async () => {
  const { source } = await readAllMigrations();
  for (const table of expectedTables) {
    assert.match(
      source,
      new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+elections_v2\\.${table}\\b`, 'i'),
      table
    );
  }
});

test('V2 migrations include essential check constraints', async () => {
  const { source } = await readAllMigrations();
  const requiredConstraints = [
    'elections_status_check',
    'election_rounds_status_check',
    'electoral_offices_scope_check',
    'territories_level_check',
    'electoral_districts_type_check',
    'candidacies_status_check',
    'users_status_check',
    'audit_logs_action_check'
  ];
  for (const constraint of requiredConstraints) {
    assert.match(source, new RegExp(`CONSTRAINT\\s+${constraint}\\b`, 'i'), constraint);
  }
});

test('V2 migrations include essential indexes', async () => {
  const source = await readMigration('006_create_indexes.sql');
  const requiredIndexes = [
    'idx_v2_election_rounds_election_status',
    'idx_v2_territories_parent',
    'idx_v2_electoral_districts_election_office',
    'idx_v2_polling_stations_center',
    'idx_v2_candidacies_context_code_unique',
    'idx_v2_user_roles_user',
    'idx_v2_audit_logs_entity_date'
  ];
  for (const index of requiredIndexes) {
    assert.match(source, new RegExp(`CREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+${index}\\b`, 'i'), index);
  }
});

test('V2 migrations do not explicitly modify historical result tables', async () => {
  const { source } = await readAllMigrations();
  const writePattern = /\b(ALTER|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:public\.)?(results_votes|results_department)\b/i;
  assert.doesNotMatch(source, writePattern);
});

test('V2 rollback plan exists and explains non-automatic destructive rollback', async () => {
  const source = await readProjectFile('docs/V2_SCHEMA_ROLLBACK_PLAN.md');
  assert.match(source, /No automatic destructive rollback is provided/i);
  assert.match(source, /human approval/i);
  assert.match(source, /disable V2/i);
});

test('V2 mapping document exists and covers historical tables', async () => {
  const source = await readProjectFile('docs/V2_SCHEMA_MAPPING.md');
  for (const table of [
    'locations_electoral_units',
    'candidates',
    'political_parties',
    'results_votes',
    'results_department'
  ]) {
    assert.match(source, new RegExp(`\\b${table}\\b`), table);
  }
});

test('V2 table names are coherent with the electoral domain documents', async () => {
  const dictionary = await readProjectFile('docs/ELECTORAL_DATA_DICTIONARY.md');
  const erd = await readProjectFile('docs/ELECTORAL_ERD.md');
  for (const table of expectedTables) {
    assert.match(dictionary, new RegExp(`###\\s+${table}\\b`), `${table} in dictionary`);
    assert.match(erd, new RegExp(`\\b${table.toUpperCase()}\\b`), `${table} in ERD`);
  }
});

test('V2 transactional migrations end with COMMIT', async () => {
  const transactionalFiles = expectedMigrationFiles.filter((file) => file !== '007_schema_validation.sql');
  for (const file of transactionalFiles) {
    const source = await readMigration(file);
    assert.match(source, /\bBEGIN\s*;/i, `${file} starts transaction`);
    assert.match(source.trim(), /COMMIT\s*;$/i, `${file} ends transaction`);
  }
});

test('V2 schema validation script is read-only', async () => {
  const source = await readMigration('007_schema_validation.sql');
  assert.match(source, /\bSELECT\b/i);
  assert.doesNotMatch(source, /\b(BEGIN|COMMIT|CREATE|ALTER|INSERT|UPDATE|DELETE)\b/i);
  assert.doesNotMatch(source, new RegExp('\\bD' + 'ROP\\b', 'i'));
  assert.doesNotMatch(source, new RegExp('\\bTRUN' + 'CATE\\b', 'i'));
});
