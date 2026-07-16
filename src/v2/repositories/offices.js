const {
  addCondition,
  pageMeta,
  parsePagination,
  readBoolean,
  readEnum
} = require("./common");

const OFFICE_SCOPE_LEVELS = ["national", "department", "commune", "section", "district"];

function mapOffice(row) {
  return {
    publicId: row.public_id,
    code: row.code,
    name: row.name,
    scopeLevel: row.scope_level,
    requiredTerritoryLevel: row.required_territory_level,
    description: row.description,
    displayOrder: row.display_order,
    isActive: row.is_active
  };
}

async function listOffices(db, query = {}) {
  const pagination = parsePagination(query);
  const scopeLevel = readEnum(query.scopeLevel, "scopeLevel", OFFICE_SCOPE_LEVELS);
  const active = readBoolean(query.active, "active");
  const errors = [...pagination.errors, ...scopeLevel.errors, ...active.errors];
  if (errors.length) return { errors };

  const where = [];
  const params = [];
  addCondition(where, params, "scope_level = ?", scopeLevel.value);
  addCondition(where, params, "is_active = ?", active.value);
  params.push(pagination.limit, pagination.offset);

  const result = await db.query(`
    SELECT public_id, code, name, scope_level, required_territory_level,
      description, display_order, is_active
    FROM elections_v2.electoral_offices
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY display_order ASC NULLS LAST, code ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return {
    items: result.rows.map(mapOffice),
    meta: pageMeta(pagination, result.rows.length)
  };
}

module.exports = {
  OFFICE_SCOPE_LEVELS,
  listOffices
};
