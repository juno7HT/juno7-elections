const {
  addCondition,
  pageMeta,
  parsePagination,
  readBoolean,
  readEnum,
  readString
} = require("./common");

const ELECTION_STATUSES = [
  "preparation",
  "configuration",
  "candidacies",
  "upcoming",
  "open",
  "counting",
  "pv_reception",
  "verification",
  "consolidation",
  "provisional_published",
  "contestation",
  "final_published",
  "archived"
];

function mapElection(row) {
  return {
    publicId: row.public_id,
    code: row.code,
    name: row.name,
    description: row.description,
    electionType: row.election_type,
    status: row.status,
    scheduledDate: row.scheduled_date,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRound(row) {
  return {
    publicId: row.public_id,
    electionPublicId: row.election_public_id,
    roundNumber: row.round_number,
    label: row.label,
    status: row.status,
    scheduledDate: row.scheduled_date,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    isActive: row.is_active
  };
}

async function listElections(db, query = {}) {
  const pagination = parsePagination(query);
  const status = readEnum(query.status, "status", ELECTION_STATUSES);
  const active = readBoolean(query.active, "active");
  const errors = [...pagination.errors, ...status.errors, ...active.errors];
  if (errors.length) return { errors };

  const where = [];
  const params = [];
  addCondition(where, params, "status = ?", status.value);
  addCondition(where, params, "is_active = ?", active.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT public_id, code, name, description, election_type, status,
      scheduled_date, opens_at, closes_at, is_active, created_at, updated_at
    FROM elections_v2.elections
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY scheduled_date DESC NULLS LAST, created_at DESC, public_id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapElection),
    meta: pageMeta(pagination, result.rows.length)
  };
}

async function getElectionByPublicId(db, publicId) {
  const id = readString(publicId, "publicId");
  if (id.errors.length || !id.value) return { errors: id.errors };

  const result = await db.query(`
    SELECT public_id, code, name, description, election_type, status,
      scheduled_date, opens_at, closes_at, is_active, created_at, updated_at
    FROM elections_v2.elections
    WHERE public_id = $1
  `, [id.value]);

  return {
    items: result.rows.map(mapElection),
    meta: { count: result.rows.length }
  };
}

async function listElectionRounds(db, publicId, query = {}) {
  const id = readString(publicId, "publicId");
  const pagination = parsePagination(query);
  const status = readEnum(query.status, "status", ELECTION_STATUSES);
  const errors = [...id.errors, ...pagination.errors, ...status.errors];
  if (errors.length || !id.value) return { errors };

  const election = await db.query("SELECT id, public_id FROM elections_v2.elections WHERE public_id = $1", [id.value]);
  if (!election.rows.length) {
    return { notFound: true };
  }

  const params = [election.rows[0].id];
  const where = ["r.election_id = $1"];
  addCondition(where, params, "r.status = ?", status.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT r.public_id, e.public_id AS election_public_id, r.round_number, r.label,
      r.status, r.scheduled_date, r.opens_at, r.closes_at, r.is_active
    FROM elections_v2.election_rounds r
    JOIN elections_v2.elections e ON e.id = r.election_id
    WHERE ${where.join(" AND ")}
    ORDER BY r.round_number ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapRound),
    meta: pageMeta(pagination, result.rows.length, { electionPublicId: id.value })
  };
}

module.exports = {
  ELECTION_STATUSES,
  getElectionByPublicId,
  listElectionRounds,
  listElections
};
