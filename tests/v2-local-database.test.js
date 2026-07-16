const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const enabled = process.env.V2_LOCAL_DB_TESTS === '1';
const env = {
  ...process.env,
  PGHOST: process.env.PGHOST || '127.0.0.1',
  PGPORT: process.env.PGPORT || '55433',
  PGDATABASE: process.env.PGDATABASE || 'juno7_elections_v2_test'
};

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: root,
      env,
      maxBuffer: 1024 * 1024 * 20,
      ...options
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

function assertSafeTarget() {
  assert.equal(env.PGHOST, '127.0.0.1');
  assert.doesNotMatch(env.PGDATABASE, /elections2026/i);
  assert.match(env.PGDATABASE, /(test|local)/i);
}

test('local V2 PostgreSQL workflow is opt-in', { skip: enabled ? false : 'Set V2_LOCAL_DB_TESTS=1 to run local PostgreSQL checks.' }, async () => {
  assertSafeTarget();

  const target = await run('psql', [
    '-tA',
    '-c',
    'SELECT current_database(), inet_server_addr(), inet_server_port();'
  ]);
  assert.match(target.stdout, /^juno7_elections_v2_test\|127\.0\.0\.1\|55433/m);

  const migrations = await run('bash', [
    'database/testing/run-v2-migrations.sh',
    '--twice'
  ]);
  assert.match(migrations.stdout, /V2 migration pass 2\/2/);

  const verify = await run('psql', [
    '-v', 'ON_ERROR_STOP=1',
    '-f', 'database/testing/verify-v2-schema.sql'
  ]);
  assert.match(verify.stdout, /elections_v2_table_count/);
  assert.doesNotMatch(verify.stdout, /unexpected_in_target/);

  const seed = await run('psql', [
    '-v', 'ON_ERROR_STOP=1',
    '-f', 'database/testing/seed-v2-demo.sql'
  ]);
  assert.match(seed.stdout, /demo_v2_seed_complete/);

  const constraints = await run('psql', [
    '-v', 'ON_ERROR_STOP=1',
    '-f', 'database/testing/test-v2-constraints.sql'
  ]);
  assert.match(`${constraints.stdout}\n${constraints.stderr}`, /PASS: vote negatif rejected/);
  assert.match(`${constraints.stdout}\n${constraints.stderr}`, /ROLLBACK/);

  const workflow = await run('psql', [
    '-v', 'ON_ERROR_STOP=1',
    '-f', 'database/testing/test-v2-workflow.sql'
  ]);
  assert.match(`${workflow.stdout}\n${workflow.stderr}`, /PASS: V2 workflow/);
  assert.match(`${workflow.stdout}\n${workflow.stderr}`, /ROLLBACK/);
});
