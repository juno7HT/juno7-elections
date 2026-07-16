function isV2PublicResultsBridgeEnabled(env = process.env) {
  return env.V2_PUBLIC_RESULTS_BRIDGE === "true";
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCandidate(row) {
  const metadata = parseMetadata(row.metadata);
  const code = metadata.candidate_code || metadata.candidateCode || metadata.candidacy_code || metadata.candidacyCode;
  if (code) return String(code).trim().toUpperCase();
  if (row.candidacy_id !== null && row.candidacy_id !== undefined) return `CANDIDACY_${row.candidacy_id}`;
  return String(row.public_id || "UNKNOWN").trim().toUpperCase();
}

function sourceGroupKey(row) {
  const metadata = parseMetadata(row.metadata);
  return metadata.source_pv_result_id ||
    metadata.sourcePvResultId ||
    [
      row.aggregation_level || "snapshot",
      row.territory_id || "territory",
      row.district_id || "district",
      row.office_id || "office",
      row.publication_batch_id || "batch"
    ].join(":");
}

function isDepartmentLevel(level) {
  return ["department", "departement", "dept", "adm1"].includes(String(level || "").toLowerCase());
}

function extractDepartmentIso(row) {
  const metadata = parseMetadata(row.metadata);
  const value = metadata.dept_iso ||
    metadata.department_iso ||
    metadata.departmentIso ||
    metadata.territory_iso ||
    metadata.territoryIso ||
    metadata.iso_code ||
    metadata.isoCode;
  const text = String(value || "").trim().toUpperCase();
  return /^HT-[A-Z]{2}$/.test(text) ? text : "";
}

async function readLatestPublishedSnapshots(db) {
  const batch = await db.query(`
    SELECT id, public_id, publication_type, publication_status, version_number, published_at
    FROM elections_v2.publication_batches
    WHERE publication_status = $1
    ORDER BY published_at DESC NULLS LAST, version_number DESC, id DESC
    LIMIT 1
  `, ["published"]);

  if (!batch.rows.length) {
    return { batch: null, snapshots: [] };
  }

  const selected = batch.rows[0];
  const snapshots = await db.query(`
    SELECT id, public_id, publication_batch_id, aggregation_level, territory_id,
      district_id, office_id, candidacy_id, votes, percentage, ranking, metadata
    FROM elections_v2.published_result_snapshots
    WHERE publication_batch_id = $1
    ORDER BY aggregation_level ASC, ranking ASC NULLS LAST, public_id ASC
  `, [selected.id]);

  return { batch: selected, snapshots: snapshots.rows };
}

function selectNationalRows(snapshots) {
  const priorities = [
    ["national", "country"],
    ["department", "departement", "dept", "adm1"],
    ["territory"],
    ["polling_station"]
  ];

  for (const levels of priorities) {
    const rows = snapshots.filter(row => levels.includes(String(row.aggregation_level || "").toLowerCase()));
    if (rows.length) return rows;
  }
  return snapshots;
}

function buildNationalPayload(snapshots) {
  const totals = new Map();
  for (const row of selectNationalRows(snapshots)) {
    const candidate = normalizeCandidate(row);
    totals.set(candidate, (totals.get(candidate) || 0) + asNumber(row.votes));
  }

  let totalVotes = 0;
  const ranking = [...totals.entries()]
    .map(([candidate, votes]) => {
      totalVotes += votes;
      return { candidate, votes };
    })
    .sort((a, b) => b.votes - a.votes)
    .map(row => ({
      ...row,
      pct: totalVotes > 0 ? Number((row.votes / totalVotes).toFixed(4)) : 0
    }));

  let leader = null;
  let isTie = false;
  if (ranking.length) {
    leader = ranking[0].candidate;
    if (ranking.length > 1 && ranking[0].votes === ranking[1].votes) {
      leader = null;
      isTie = true;
    }
  }

  return { ok: true, totalVotes, ranking, leader, isTie };
}

function buildDepartmentsPayload(snapshots) {
  const byDept = {};

  for (const row of snapshots.filter(item => isDepartmentLevel(item.aggregation_level))) {
    const iso = extractDepartmentIso(row);
    if (!iso) continue;
    const candidate = normalizeCandidate(row);
    const votes = asNumber(row.votes);
    if (!byDept[iso]) byDept[iso] = { total: 0, byCandidate: {} };
    byDept[iso].byCandidate[candidate] = (byDept[iso].byCandidate[candidate] || 0) + votes;
    byDept[iso].total += votes;
  }

  const items = {};
  for (const [iso, data] of Object.entries(byDept)) {
    let winner = "";
    let winnerVotes = -1;
    let topCount = 0;

    for (const [candidate, votes] of Object.entries(data.byCandidate)) {
      if (votes > winnerVotes) {
        winner = candidate;
        winnerVotes = votes;
        topCount = 1;
      } else if (votes === winnerVotes) {
        topCount += 1;
      }
    }

    const isTie = topCount > 1;
    items[iso] = {
      winner: isTie ? null : winner,
      isTie,
      winnerPct: !isTie && data.total > 0 ? Number((winnerVotes / data.total).toFixed(4)) : 0,
      total: data.total,
      byCandidate: data.byCandidate
    };
  }

  return { ok: true, items };
}

function buildProgressPayload(snapshots) {
  const keys = new Set(snapshots.map(sourceGroupKey));
  const processed = keys.size;
  const total = processed;
  return {
    ok: true,
    processed,
    total,
    pct: total > 0 ? 100 : 0
  };
}

function buildDepartmentsProgressPayload(snapshots) {
  const groups = new Map();

  for (const row of snapshots.filter(item => isDepartmentLevel(item.aggregation_level))) {
    const iso = extractDepartmentIso(row);
    if (!iso) continue;
    if (!groups.has(iso)) groups.set(iso, new Set());
    groups.get(iso).add(sourceGroupKey(row));
  }

  const items = {};
  for (const [iso, keys] of groups.entries()) {
    const processed = keys.size;
    items[iso] = {
      processed,
      total: processed,
      pct: processed > 0 ? 100 : 0
    };
  }

  return { ok: true, items };
}

async function getNationalLive(db) {
  const { snapshots } = await readLatestPublishedSnapshots(db);
  return buildNationalPayload(snapshots);
}

async function getDepartmentsLive(db) {
  const { snapshots } = await readLatestPublishedSnapshots(db);
  return buildDepartmentsPayload(snapshots);
}

async function getProgress(db) {
  const { snapshots } = await readLatestPublishedSnapshots(db);
  return buildProgressPayload(snapshots);
}

async function getDepartmentsProgress(db) {
  const { snapshots } = await readLatestPublishedSnapshots(db);
  return buildDepartmentsProgressPayload(snapshots);
}

module.exports = {
  buildDepartmentsPayload,
  buildDepartmentsProgressPayload,
  buildNationalPayload,
  buildProgressPayload,
  getDepartmentsLive,
  getDepartmentsProgress,
  getNationalLive,
  getProgress,
  isV2PublicResultsBridgeEnabled,
  readLatestPublishedSnapshots
};
