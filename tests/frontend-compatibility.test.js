const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, '..');
const officialPages = [
  'frontend/admin-electoral.html',
  'frontend/admin.html'
];
const publicPages = [
  'frontend/index.html',
  'frontend/communes.html'
];
const bannerPages = [
  ...officialPages,
  ...publicPages
];

async function read(file) {
  return fs.readFile(path.join(root, file), 'utf8');
}

test('official interfaces do not use demo-2026', async () => {
  for (const file of officialPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /demo-2026/, file);
  }
});

test('official interfaces define a numeric ACTIVE_ELECTION_ID', async () => {
  for (const file of officialPages) {
    const source = await read(file);
    assert.match(source, /const\s+ACTIVE_ELECTION_ID\s*=\s*1\s*;/, file);
    assert.doesNotMatch(source, /ACTIVE_ELECTION_ID\s*=\s*["']/, file);
  }
});

test('admin token is not persisted in browser storage', async () => {
  for (const file of officialPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /localStorage/, file);
    assert.doesNotMatch(source, /sessionStorage/, file);
  }
});

test('official interfaces do not hard-code ADMIN_TOKEN values', async () => {
  for (const file of officialPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /ADMIN_TOKEN/, file);
    assert.doesNotMatch(source, /expected-token|123456|sk-[A-Za-z0-9_-]+/, file);
  }
});

test('official admin interfaces send x-admin-token header', async () => {
  for (const file of officialPages) {
    const source = await read(file);
    assert.match(source, /"x-admin-token"\s*:/, file);
  }
});

test('admin-electoral uses submit-electoral-result and sends required payload fields', async () => {
  const source = await read('frontend/admin-electoral.html');
  const requiredFields = [
    'election_id',
    'dept_name',
    'commune_name',
    'section_name',
    'centre_vote_name',
    'bv_no',
    'pv_code',
    'candidate',
    'votes'
  ];

  assert.match(source, /\/api\/submit-electoral-result/);
  for (const field of requiredFields) {
    assert.match(source, new RegExp(`${field}\\s*:`), field);
  }
});

test('admin dashboard no longer uses submit-results as primary entry', async () => {
  const source = await read('frontend/admin.html');
  assert.doesNotMatch(source, /\/api\/submit-results/);
  assert.doesNotMatch(source, /function\s+sendResults/);
  assert.match(source, /\/admin-electoral/);
});

test('public pages contain no admin token logic', async () => {
  for (const file of publicPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /x-admin-token|adminToken|tokenInput|ADMIN_TOKEN/, file);
  }
});

test('admin-modern remains marked as a non-official prototype in documentation', async () => {
  const source = await read('docs/SPRINT_2C_FRONTEND_COMPATIBILITY.md');
  assert.match(source, /admin-modern\.html` reste un prototype non officiel/);
});

test('html files keep basic structural coherence', async () => {
  for (const file of [...officialPages, ...publicPages]) {
    const source = await read(file);
    assert.match(source, /<!DOCTYPE html>/i, file);
    assert.equal((source.match(/<html\b/gi) || []).length, 1, file);
    assert.equal((source.match(/<\/html>/gi) || []).length, 1, file);
    assert.equal((source.match(/<script\b/gi) || []).length, (source.match(/<\/script>/gi) || []).length, file);
  }
});

test('staging banner is wired through public config on official and public pages', async () => {
  for (const file of bannerPages) {
    const source = await read(file);
    assert.match(source, /STAGING — DONNÉES DE DÉMONSTRATION/, file);
    assert.match(source, /\/api\/config\/public/, file);
    assert.match(source, /config\.staging === true/, file);
  }
});

test('frontend pages do not reference secret environment variables', async () => {
  for (const file of bannerPages) {
    const source = await read(file);
    assert.doesNotMatch(source, /DATABASE_URL|STAGING_PASSWORD|STAGING_USER/, file);
  }
});
