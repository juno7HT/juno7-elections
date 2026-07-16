const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePagination(query = {}) {
  const errors = [];
  const rawLimit = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit);
  const rawOffset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > MAX_LIMIT) {
    errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  if (!Number.isInteger(rawOffset) || rawOffset < 0) {
    errors.push("offset must be an integer greater than or equal to 0");
  }

  return {
    ok: errors.length === 0,
    errors,
    limit: errors.length ? DEFAULT_LIMIT : rawLimit,
    offset: errors.length ? 0 : rawOffset
  };
}

function readString(value, name, { max = 120, pattern = /^[A-Za-z0-9_.:-]+$/ } = {}) {
  if (value === undefined || value === null || value === "") return { value: null, errors: [] };
  const text = String(value).trim();
  if (!text || text.length > max || !pattern.test(text)) {
    return { value: null, errors: [`${name} is invalid`] };
  }
  return { value: text, errors: [] };
}

function readBoolean(value, name) {
  if (value === undefined || value === null || value === "") return { value: null, errors: [] };
  if (value === "true" || value === true) return { value: true, errors: [] };
  if (value === "false" || value === false) return { value: false, errors: [] };
  return { value: null, errors: [`${name} must be true or false`] };
}

function readEnum(value, name, allowed) {
  const parsed = readString(value, name, { max: 80, pattern: /^[A-Za-z0-9_-]+$/ });
  if (parsed.errors.length || parsed.value === null) return parsed;
  if (!allowed.includes(parsed.value)) {
    return { value: null, errors: [`${name} is not supported`] };
  }
  return parsed;
}

function addCondition(parts, params, sql, value) {
  if (value === null || value === undefined) return;
  params.push(value);
  parts.push(sql.replace("?", `$${params.length}`));
}

function pageMeta(pagination, count, extra = {}) {
  return {
    limit: pagination.limit,
    offset: pagination.offset,
    count,
    ...extra
  };
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  addCondition,
  pageMeta,
  parsePagination,
  readBoolean,
  readEnum,
  readString
};
