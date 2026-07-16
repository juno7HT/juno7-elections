const {
  readEnum,
  readString
} = require("./common");

const PUBLICATION_TYPES = ["provisional", "corrected", "final", "withdrawal"];

function mapSnapshot(row) {
  return {
    publicId: row.public_id,
    aggregationLevel: row.aggregation_level,
    territoryPublicId: row.territory_public_id,
    districtPublicId: row.district_public_id,
    officePublicId: row.office_public_id,
    candidacyPublicId: row.candidacy_public_id,
    candidateCode: row.candidate_code,
    ballotName: row.ballot_name,
    votes: row.votes === null ? null : Number(row.votes),
    registeredVoters: row.registered_voters === null ? null : Number(row.registered_voters),
    voters: row.voters === null ? null : Number(row.voters),
    validBallots: row.valid_ballots === null ? null : Number(row.valid_ballots),
    blankVotes: row.blank_votes === null ? null : Number(row.blank_votes),
    nullVotes: row.null_votes === null ? null : Number(row.null_votes),
    expressedVotes: row.expressed_votes === null ? null : Number(row.expressed_votes),
    percentage: row.percentage === null ? null : Number(row.percentage),
    ranking: row.ranking === null ? null : Number(row.ranking),
    calculatedAt: row.calculated_at
  };
}

async function getLatestPublication(db, query = {}) {
  const electionPublicId = readString(query.electionPublicId, "electionPublicId");
  const roundPublicId = readString(query.roundPublicId, "roundPublicId");
  const type = readEnum(query.type, "type", PUBLICATION_TYPES);
  const errors = [...electionPublicId.errors, ...roundPublicId.errors, ...type.errors];
  if (errors.length) return { errors };

  const params = [];
  const where = ["pb.publication_status = 'published'"];
  if (electionPublicId.value) {
    params.push(electionPublicId.value);
    where.push(`e.public_id = $${params.length}`);
  }
  if (roundPublicId.value) {
    params.push(roundPublicId.value);
    where.push(`r.public_id = $${params.length}`);
  }
  if (type.value) {
    params.push(type.value);
    where.push(`pb.publication_type = $${params.length}`);
  }

  const batch = await db.query(`
    SELECT pb.id, pb.public_id, e.public_id AS election_public_id,
      r.public_id AS round_public_id, pb.publication_type, pb.version_number,
      pb.publication_status, pb.published_at, pb.public_note, pb.batch_checksum
    FROM elections_v2.publication_batches pb
    JOIN elections_v2.elections e ON e.id = pb.election_id
    LEFT JOIN elections_v2.election_rounds r ON r.id = pb.round_id
    WHERE ${where.join(" AND ")}
    ORDER BY pb.published_at DESC NULLS LAST, pb.version_number DESC, pb.id DESC
    LIMIT 1
  `, params);

  if (!batch.rows.length) {
    return { items: [], meta: { count: 0 } };
  }

  const selected = batch.rows[0];
  const snapshots = await db.query(`
    SELECT s.public_id, s.aggregation_level, t.public_id AS territory_public_id,
      d.public_id AS district_public_id, o.public_id AS office_public_id,
      c.public_id AS candidacy_public_id, c.candidate_code, c.ballot_name,
      s.votes, s.registered_voters, s.voters, s.valid_ballots, s.blank_votes,
      s.null_votes, s.expressed_votes, s.percentage, s.ranking, s.calculated_at
    FROM elections_v2.published_result_snapshots s
    LEFT JOIN elections_v2.territories t ON t.id = s.territory_id
    LEFT JOIN elections_v2.electoral_districts d ON d.id = s.district_id
    LEFT JOIN elections_v2.electoral_offices o ON o.id = s.office_id
    LEFT JOIN elections_v2.candidacies c ON c.id = s.candidacy_id
    WHERE s.publication_batch_id = $1
    ORDER BY s.aggregation_level ASC, s.ranking ASC NULLS LAST, s.public_id ASC
  `, [selected.id]);

  return {
    items: [{
      publicId: selected.public_id,
      electionPublicId: selected.election_public_id,
      roundPublicId: selected.round_public_id,
      publicationType: selected.publication_type,
      versionNumber: Number(selected.version_number),
      publicationStatus: selected.publication_status,
      publishedAt: selected.published_at,
      publicNote: selected.public_note,
      batchChecksum: selected.batch_checksum,
      snapshots: snapshots.rows.map(mapSnapshot)
    }],
    meta: {
      count: 1,
      snapshotCount: snapshots.rows.length
    }
  };
}

module.exports = {
  PUBLICATION_TYPES,
  getLatestPublication
};
