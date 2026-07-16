const {
  addCondition,
  pageMeta,
  parsePagination,
  readString
} = require("./common");

function mapProgress(row) {
  return {
    electionPublicId: row.election_public_id,
    roundPublicId: row.round_public_id,
    expectedPvs: Number(row.expected_pvs) || 0,
    submissions: Number(row.submissions) || 0,
    retainedResults: Number(row.retained_results) || 0,
    publishedResults: Number(row.published_results) || 0,
    completionRate: Number(row.expected_pvs) > 0
      ? Number((Number(row.submissions) / Number(row.expected_pvs) * 100).toFixed(2))
      : null
  };
}

async function listPvProgress(db, query = {}) {
  const pagination = parsePagination(query);
  const electionPublicId = readString(query.electionPublicId, "electionPublicId");
  const roundPublicId = readString(query.roundPublicId, "roundPublicId");
  const errors = [...pagination.errors, ...electionPublicId.errors, ...roundPublicId.errors];
  if (errors.length) return { errors };

  const where = [];
  const params = [];
  addCondition(where, params, "e.public_id = ?", electionPublicId.value);
  addCondition(where, params, "r.public_id = ?", roundPublicId.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT
      e.public_id AS election_public_id,
      r.public_id AS round_public_id,
      COUNT(DISTINCT ep.id) AS expected_pvs,
      COUNT(DISTINCT ps.id) AS submissions,
      COUNT(DISTINCT pr.id) FILTER (
        WHERE pr.result_layer = 'retained' AND pr.result_status = 'active'
      ) AS retained_results,
      COUNT(DISTINCT pbi.id) FILTER (
        WHERE pb.publication_status = 'published'
      ) AS published_results
    FROM elections_v2.elections e
    LEFT JOIN elections_v2.election_rounds r ON r.election_id = e.id
    LEFT JOIN elections_v2.expected_pvs ep ON ep.election_id = e.id AND ep.round_id = r.id
    LEFT JOIN elections_v2.pv_submissions ps ON ps.expected_pv_id = ep.id
    LEFT JOIN elections_v2.pv_results pr ON pr.pv_submission_id = ps.id
    LEFT JOIN elections_v2.publication_batch_items pbi ON pbi.pv_result_id = pr.id
    LEFT JOIN elections_v2.publication_batches pb ON pb.id = pbi.publication_batch_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY e.public_id, r.public_id
    ORDER BY e.public_id ASC, r.public_id ASC NULLS LAST
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapProgress),
    meta: pageMeta(pagination, result.rows.length)
  };
}

module.exports = {
  listPvProgress
};
