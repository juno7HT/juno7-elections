const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_TOKEN = 'expected-token';

const { app, helpers } = require('../index.js');

const silentLogger = { error() {} };

test('admin token missing returns 401', () => {
  const result = helpers.checkAdminToken({}, 'expected-token', silentLogger);
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 401);
});

test('admin token invalid returns 403', () => {
  const result = helpers.checkAdminToken({ 'x-admin-token': 'wrong-token' }, 'expected-token', silentLogger);
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 403);
});

test('admin token valid is authorized', () => {
  const result = helpers.checkAdminToken({ 'x-admin-token': 'expected-token' }, 'expected-token', silentLogger);
  assert.equal(result.ok, true);
});

test('negative votes are rejected', () => {
  const result = helpers.validateResultPayload(validPayload({ votes: -1 }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /votes/);
});

test('decimal votes are rejected', () => {
  const result = helpers.validateResultPayload(validPayload({ votes: 10.5 }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /votes/);
});

test('blank pv_code is rejected', () => {
  const result = helpers.validateResultPayload(validPayload({ pv_code: '   ' }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /pv_code/);
});

test('invalid election_id is rejected', () => {
  const result = helpers.validateResultPayload(validPayload({ election_id: 'demo-2026' }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /election_id/);
});

test('valid result payload is accepted and normalized', () => {
  const result = helpers.validateResultPayload(validPayload({ candidate: ' abc ' }));
  assert.equal(result.ok, true);
  assert.equal(result.value.candidate, 'ABC');
  assert.equal(result.value.votes, 12);
});

test('office filter produces a parameterized query', () => {
  const result = helpers.buildCandidateOfficeQuery('President');
  assert.match(result.sql, /office = \$1/);
  assert.deepEqual(result.params, ['President']);
  assert.doesNotMatch(result.sql, /President/);
});

test('submit-results route no longer references the missing results table', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const source = await fs.readFile(path.join(__dirname, '..', 'index.js'), 'utf8');
  const routeStart = source.indexOf('app.post("/api/submit-results"');
  const routeEnd = source.indexOf('app.get("/api/admin/recent"', routeStart);
  const routeSource = source.slice(routeStart, routeEnd);
  assert.equal(routeStart >= 0, true);
  assert.doesNotMatch(routeSource, /INSERT\s+INTO\s+results\b/i);
  assert.doesNotMatch(routeSource, /UPDATE\s+results\b/i);
  assert.match(routeSource, /INSERT\s+INTO\s+results_votes\b/i);
});

test('query string token is ignored by admin token checker', () => {
  const result = helpers.checkAdminToken({ query: { 'x-admin-token': 'expected-token' } }, 'expected-token', silentLogger);
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 401);
});

test('missing ADMIN_TOKEN refuses access without echoing token values', () => {
  const result = helpers.checkAdminToken({ 'x-admin-token': 'provided-token' }, '', silentLogger);
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 403);
  assert.doesNotMatch(result.error, /provided-token/);
});

test('legacy incomplete payload is rejected by result validator', () => {
  const result = helpers.validateResultPayload({
    election_id: '2026',
    dept_iso: 'HT-OU',
    candidate: 'A',
    votes: 12,
    pv_code: 'PV-001'
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /commune_name/);
  assert.match(result.errors.join(' '), /section_name/);
});

test('public API result routes do not call admin auth helper', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const source = await fs.readFile(path.join(__dirname, '..', 'index.js'), 'utf8');
  const publicRoutes = [
    '/api/results',
    '/api/national',
    '/api/electoral/departments',
    '/api/electoral/communes',
    '/api/electoral/sections',
    '/api/electoral/bvs',
    '/api/results/departments-live',
    '/api/results/national-live',
    '/api/results/communes',
    '/api/results/progress',
    '/api/results/departments-progress',
    '/api/results/departments-live-named',
    '/api/candidate-directory',
    '/api/reports/:id'
  ];

  for (const route of publicRoutes) {
    const start = source.indexOf(`"${route}"`);
    assert.equal(start >= 0, true, `${route} exists`);
    const routeStart = source.lastIndexOf('app.', start);
    const nextRoute = source.indexOf('\napp.', start);
    const routeSource = source.slice(routeStart, nextRoute === -1 ? source.length : nextRoute);
    assert.doesNotMatch(routeSource, /requireAdmin\(req, reply\)/, `${route} remains public`);
  }
});

test('all /api/admin routes call admin auth helper', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const source = await fs.readFile(path.join(__dirname, '..', 'index.js'), 'utf8');
  const routeRegex = /app\.(get|post|put|delete|patch)\("(\/api\/admin[^"]*)"/g;
  let match;
  let count = 0;

  while ((match = routeRegex.exec(source))) {
    count += 1;
    const routeStart = match.index;
    const nextRoute = source.indexOf('\napp.', routeStart + 1);
    const routeSource = source.slice(routeStart, nextRoute === -1 ? source.length : nextRoute);
    assert.match(routeSource, /requireAdmin\(req, reply\)/, `${match[1].toUpperCase()} ${match[2]} is protected`);
  }

  assert.equal(count > 0, true);
});

test('admin routes return 401 without token and 403 with invalid token', async () => {
  const adminRoutes = [
    ['GET', '/api/admin/recent'],
    ['POST', '/api/admin/party'],
    ['GET', '/api/admin/parties'],
    ['POST', '/api/admin/candidate'],
    ['GET', '/api/admin/candidates'],
    ['GET', '/api/admin/electoral-tree'],
    ['GET', '/api/admin/vote-entries'],
    ['POST', '/api/admin/vote-entry'],
    ['PUT', '/api/admin/candidate/1'],
    ['POST', '/api/admin/report']
  ];

  for (const [method, url] of adminRoutes) {
    const missing = await app.inject({ method, url });
    assert.equal(missing.statusCode, 401, `${method} ${url} missing token`);

    const invalid = await app.inject({ method, url, headers: { 'x-admin-token': 'invalid-token' } });
    assert.equal(invalid.statusCode, 403, `${method} ${url} invalid token`);
    assert.doesNotMatch(invalid.body, /invalid-token/);
  }
});

test('admin routes reject token in query string', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/admin/recent?x-admin-token=expected-token'
  });

  assert.equal(response.statusCode, 401);
});

function validPayload(overrides = {}) {
  return {
    election_id: '2026',
    dept_name: 'Ouest',
    commune_name: 'Port-au-Prince',
    section_name: '1ere Sect. Turgeau',
    centre_vote_name: 'Centre A',
    bv_no: '1',
    pv_code: 'PV-001',
    candidate: 'A',
    votes: 12,
    ...overrides
  };
}
