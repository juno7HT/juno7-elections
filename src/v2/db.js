const { Pool } = require("pg");

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function normalizeDatabaseName(value) {
  return String(value || "").trim();
}

function assertSafeDatabaseName(databaseName) {
  const name = normalizeDatabaseName(databaseName);
  if (!name) {
    throw new Error("V2_READ_API requires a local test database name");
  }
  if (/elections2026/i.test(name)) {
    throw new Error("V2_READ_API refuses elections2026");
  }
  if (!/(test|local)/i.test(name)) {
    throw new Error("V2_READ_API database name must contain test or local");
  }
  return name;
}

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  const parsed = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("V2_READ_API requires a PostgreSQL DATABASE_URL");
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error("V2_READ_API refuses non-local DATABASE_URL host");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  assertSafeDatabaseName(databaseName);
  return { connectionString: databaseUrl, databaseName, host: parsed.hostname };
}

function buildPoolConfig(env = process.env) {
  const databaseUrl = String(env.V2_DATABASE_URL || env.DATABASE_URL || "").trim();
  const parsedUrl = parseDatabaseUrl(databaseUrl);
  if (parsedUrl) {
    return parsedUrl;
  }

  const host = String(env.PGHOST || "127.0.0.1").trim();
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error("V2_READ_API refuses non-local PGHOST");
  }

  const databaseName = assertSafeDatabaseName(env.PGDATABASE || "juno7_elections_v2_test");
  return {
    host,
    port: Number(env.PGPORT || 55433),
    database: databaseName,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    databaseName
  };
}

function createV2Database(env = process.env) {
  const config = buildPoolConfig(env);
  const pool = new Pool(config.connectionString ? {
    connectionString: config.connectionString
  } : {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  });

  let runtimeCheck;

  async function assertRuntimeTarget() {
    if (runtimeCheck) return runtimeCheck;

    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS user_name,
        host(inet_server_addr()) AS server_addr,
        inet_server_port() AS server_port
    `);
    const row = result.rows[0] || {};
    assertSafeDatabaseName(row.database_name);
    if (!LOCAL_HOSTS.has(String(row.server_addr || ""))) {
      throw new Error("V2_READ_API refuses non-local PostgreSQL server");
    }
    runtimeCheck = row;
    return runtimeCheck;
  }

  return {
    async query(sql, params = []) {
      await assertRuntimeTarget();
      return pool.query(sql, params);
    },
    assertRuntimeTarget,
    close() {
      return pool.end();
    }
  };
}

module.exports = {
  LOCAL_HOSTS,
  assertSafeDatabaseName,
  buildPoolConfig,
  createV2Database
};
