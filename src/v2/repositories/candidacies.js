const {
  addCondition,
  pageMeta,
  parsePagination,
  readBoolean,
  readEnum,
  readString
} = require("./common");

const CANDIDACY_STATUSES = ["draft", "submitted", "pending", "approved", "rejected", "withdrawn", "archived"];

function mapCandidacy(row) {
  return {
    publicId: row.public_id,
    electionPublicId: row.election_public_id,
    roundPublicId: row.round_public_id,
    officePublicId: row.office_public_id,
    districtPublicId: row.district_public_id,
    candidateCode: row.candidate_code,
    ballotName: row.ballot_name,
    ballotNumber: row.ballot_number,
    status: row.status,
    isActive: row.is_active,
    person: row.person_public_id ? {
      publicId: row.person_public_id,
      displayName: row.person_display_name
    } : null,
    party: row.party_public_id ? {
      publicId: row.party_public_id,
      name: row.party_name,
      acronym: row.party_acronym
    } : null,
    coalition: row.coalition_public_id ? {
      publicId: row.coalition_public_id,
      name: row.coalition_name,
      acronym: row.coalition_acronym
    } : null
  };
}

async function listCandidacies(db, query = {}) {
  const pagination = parsePagination(query);
  const electionPublicId = readString(query.electionPublicId, "electionPublicId");
  const roundPublicId = readString(query.roundPublicId, "roundPublicId");
  const officePublicId = readString(query.officePublicId, "officePublicId");
  const status = readEnum(query.status, "status", CANDIDACY_STATUSES);
  const active = readBoolean(query.active, "active");
  const errors = [
    ...pagination.errors,
    ...electionPublicId.errors,
    ...roundPublicId.errors,
    ...officePublicId.errors,
    ...status.errors,
    ...active.errors
  ];
  if (errors.length) return { errors };

  const where = [];
  const params = [];
  addCondition(where, params, "e.public_id = ?", electionPublicId.value);
  addCondition(where, params, "r.public_id = ?", roundPublicId.value);
  addCondition(where, params, "o.public_id = ?", officePublicId.value);
  addCondition(where, params, "c.status = ?", status.value);
  addCondition(where, params, "c.is_active = ?", active.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT
      c.public_id, e.public_id AS election_public_id, r.public_id AS round_public_id,
      o.public_id AS office_public_id, d.public_id AS district_public_id,
      c.candidate_code, c.ballot_name, c.ballot_number, c.status, c.is_active,
      p.public_id AS person_public_id, p.display_name AS person_display_name,
      pp.public_id AS party_public_id, pp.name AS party_name, pp.acronym AS party_acronym,
      co.public_id AS coalition_public_id, co.name AS coalition_name, co.acronym AS coalition_acronym
    FROM elections_v2.candidacies c
    JOIN elections_v2.elections e ON e.id = c.election_id
    LEFT JOIN elections_v2.election_rounds r ON r.id = c.round_id
    JOIN elections_v2.electoral_offices o ON o.id = c.office_id
    LEFT JOIN elections_v2.electoral_districts d ON d.id = c.district_id
    LEFT JOIN elections_v2.persons p ON p.id = c.person_id
    LEFT JOIN elections_v2.political_parties pp ON pp.id = c.party_id
    LEFT JOIN elections_v2.coalitions co ON co.id = c.coalition_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY c.display_order ASC NULLS LAST, c.candidate_code ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapCandidacy),
    meta: pageMeta(pagination, result.rows.length)
  };
}

module.exports = {
  CANDIDACY_STATUSES,
  listCandidacies
};
