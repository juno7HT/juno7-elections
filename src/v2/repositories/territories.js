const {
  addCondition,
  pageMeta,
  parsePagination,
  readBoolean,
  readEnum,
  readString
} = require("./common");

const TERRITORY_LEVELS = ["country", "department", "arrondissement", "commune", "section"];

function mapTerritory(row) {
  return {
    publicId: row.public_id,
    parentPublicId: row.parent_public_id,
    code: row.code,
    name: row.name,
    normalizedName: row.normalized_name,
    territoryLevel: row.territory_level,
    path: row.path,
    isoCode: row.iso_code,
    isActive: row.is_active
  };
}

async function listTerritories(db, query = {}) {
  const pagination = parsePagination(query);
  const level = readEnum(query.level, "level", TERRITORY_LEVELS);
  const parentPublicId = readString(query.parentPublicId, "parentPublicId");
  const active = readBoolean(query.active, "active");
  const errors = [...pagination.errors, ...level.errors, ...parentPublicId.errors, ...active.errors];
  if (errors.length) return { errors };

  const where = [];
  const params = [];
  addCondition(where, params, "t.territory_level = ?", level.value);
  addCondition(where, params, "p.public_id = ?", parentPublicId.value);
  addCondition(where, params, "t.is_active = ?", active.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT t.public_id, p.public_id AS parent_public_id, t.code, t.name,
      t.normalized_name, t.territory_level, t.path, t.iso_code, t.is_active
    FROM elections_v2.territories t
    LEFT JOIN elections_v2.territories p ON p.id = t.parent_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY t.path ASC, t.name ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapTerritory),
    meta: pageMeta(pagination, result.rows.length)
  };
}

async function listTerritoryChildren(db, publicId, query = {}) {
  const id = readString(publicId, "publicId");
  const pagination = parsePagination(query);
  const active = readBoolean(query.active, "active");
  const errors = [...id.errors, ...pagination.errors, ...active.errors];
  if (errors.length || !id.value) return { errors };

  const parent = await db.query("SELECT id FROM elections_v2.territories WHERE public_id = $1", [id.value]);
  if (!parent.rows.length) {
    return { notFound: true };
  }

  const params = [parent.rows[0].id];
  const where = ["t.parent_id = $1"];
  addCondition(where, params, "t.is_active = ?", active.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT t.public_id, p.public_id AS parent_public_id, t.code, t.name,
      t.normalized_name, t.territory_level, t.path, t.iso_code, t.is_active
    FROM elections_v2.territories t
    LEFT JOIN elections_v2.territories p ON p.id = t.parent_id
    WHERE ${where.join(" AND ")}
    ORDER BY t.path ASC, t.name ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapTerritory),
    meta: pageMeta(pagination, result.rows.length, { parentPublicId: id.value })
  };
}

module.exports = {
  TERRITORY_LEVELS,
  listTerritories,
  listTerritoryChildren
};
