require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const Fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const { Pool } = require("pg");

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ACTIVE_ELECTION_ID = Number(process.env.ACTIVE_ELECTION_ID || 1);
const ACTIVE_ELECTION_LABEL = process.env.ACTIVE_ELECTION_LABEL || "Election active MVP";

function getDatabaseName(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch (err) {
    return "";
  }
}

function validateStartupEnvironment(env = process.env) {
  if (env.NODE_ENV !== "staging") {
    return { ok: true, errors: [] };
  }

  const errors = [];
  const port = Number(env.PORT || 3000);
  const databaseUrl = String(env.DATABASE_URL || "");
  const databaseName = getDatabaseName(databaseUrl);
  const adminToken = String(env.ADMIN_TOKEN || "");

  if (env.STAGING !== "true") {
    errors.push("STAGING must be true when NODE_ENV is staging");
  }
  if (port === 3000) {
    errors.push("Staging must not use production port 3000");
  }
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required for staging");
  } else if (!databaseName.toLowerCase().includes("staging")) {
    errors.push("Staging database name must clearly contain staging");
  }
  if (!adminToken || /CHANGE_ME|PLACEHOLDER|DEFAULT/i.test(adminToken)) {
    errors.push("ADMIN_TOKEN must be set to a non-placeholder staging value");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function assertStartupEnvironment(env = process.env) {
  const validation = validateStartupEnvironment(env);
  if (!validation.ok) {
    const err = new Error(`Invalid startup environment: ${validation.errors.join("; ")}`);
    err.validationErrors = validation.errors;
    throw err;
  }
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const DEMO_RESULTS = {
  "HT-AR": { winner: "A", winnerPct: 0.58, total: 10000, byCandidate: { A: 5800, B: 4200 } },
  "HT-CE": { winner: "B", winnerPct: 0.52, total: 8000, byCandidate: { A: 3840, B: 4160 } },
  "HT-GA": { winner: "A", winnerPct: 0.67, total: 6000, byCandidate: { A: 4020, B: 1980 } },
  "HT-NI": { winner: "B", winnerPct: 0.55, total: 5000, byCandidate: { A: 2250, B: 2750 } },
  "HT-ND": { winner: "A", winnerPct: 0.61, total: 9000, byCandidate: { A: 5490, B: 3510 } },
  "HT-NE": { winner: "A", winnerPct: 0.53, total: 4000, byCandidate: { A: 2120, B: 1880 } },
  "HT-NO": { winner: "B", winnerPct: 0.57, total: 4500, byCandidate: { A: 1935, B: 2565 } },
  "HT-OU": { winner: "A", winnerPct: 0.64, total: 15000, byCandidate: { A: 9600, B: 5400 } },
  "HT-SD": { winner: "B", winnerPct: 0.51, total: 7000, byCandidate: { A: 3430, B: 3570 } },
  "HT-SE": { winner: "A", winnerPct: 0.56, total: 3500, byCandidate: { A: 1960, B: 1540 } },
};

function normalizeText(value, { uppercase = false, max = 200 } = {}) {
  const text = String(value ?? "").trim();
  const clipped = text.length > max ? text.slice(0, max) : text;
  return uppercase ? clipped.toUpperCase() : clipped;
}

function safeCompareToken(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function checkAdminToken(headers = {}, expectedToken = ADMIN_TOKEN, logger = app.log) {
  const token = headers["x-admin-token"];
  if (!expectedToken) {
    logger.error("ADMIN_TOKEN is not configured; refusing admin request");
    return { ok: false, statusCode: 403, error: "Admin access is not configured" };
  }
  if (!token) {
    return { ok: false, statusCode: 401, error: "Admin token required" };
  }
  if (!safeCompareToken(token, expectedToken)) {
    return { ok: false, statusCode: 403, error: "Invalid admin token" };
  }
  return { ok: true };
}

function requireAdmin(req, reply) {
  const auth = checkAdminToken(req.headers);
  if (!auth.ok) {
    reply.code(auth.statusCode).send({ ok: false, error: auth.error });
    return false;
  }
  return true;
}

function sendValidationError(reply, errors) {
  return reply.code(400).send({
    ok: false,
    error: "Validation failed",
    errors
  });
}

function sendDbError(reply, logger, err) {
  logger.error(err);
  return reply.code(500).send({ ok: false, error: "Internal server error" });
}

function validateResultPayload(body = {}, options = {}) {
  const errors = [];
  const allowedFields = options.allowedFields || [
    "election_id",
    "dept_name",
    "dept_iso",
    "commune_name",
    "commune",
    "section_name",
    "section",
    "centre_vote_name",
    "centre",
    "bv_no",
    "bv",
    "pv_code",
    "candidate",
    "candidate_id",
    "votes",
    "office",
    "notes"
  ];

  for (const key of Object.keys(body || {})) {
    if (!allowedFields.includes(key) && key.startsWith("__")) {
      errors.push(`Unexpected field: ${key}`);
    }
  }

  const election_id = normalizeText(body.election_id, { max: 32 });
  if (!/^[1-9]\d*$/.test(election_id)) {
    errors.push("election_id must be a positive integer string");
  }

  const dept_name = normalizeText(body.dept_name || body.dept_iso, { max: 100 });
  const commune_name = normalizeText(body.commune_name || body.commune, { max: 100 });
  const section_name = normalizeText(body.section_name || body.section, { max: 150 });
  const centre_vote_name = normalizeText(body.centre_vote_name || body.centre, { max: 200 });
  const bv_no = normalizeText(body.bv_no || body.bv, { max: 50 });
  const pv_code = normalizeText(body.pv_code, { max: 80 });
  const candidate = normalizeText(body.candidate, { uppercase: true, max: 50 });
  const notes = normalizeText(body.notes, { max: 500 });

  if (options.requireDept !== false && !dept_name) errors.push("dept_name is required");
  if (options.requireCommune !== false && !commune_name) errors.push("commune_name is required");
  if (options.requireSection !== false && !section_name) errors.push("section_name is required");
  if (options.requireCentre && !centre_vote_name) errors.push("centre_vote_name is required");
  if (options.requireBv && !bv_no) errors.push("bv_no is required");
  if (!pv_code) errors.push("pv_code is required");
  if (!candidate && !body.candidate_id) errors.push("candidate is required");

  const votes = Number(body.votes);
  if (!Number.isInteger(votes) || votes < 0) {
    errors.push("votes must be an integer greater than or equal to 0");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: {
      election_id,
      dept_name,
      commune_name,
      section_name,
      centre_vote_name,
      bv_no,
      pv_code,
      candidate,
      candidate_id: body.candidate_id,
      votes,
      notes
    }
  };
}

function buildCandidateOfficeQuery(office) {
  const cleanOffice = normalizeText(office, { max: 50 });
  const params = [];
  let sql = `
    SELECT candidate_code, ballot_name, office
    FROM candidates
    WHERE is_active = TRUE
  `;

  if (cleanOffice) {
    params.push(cleanOffice);
    sql += ` AND office = $1`;
  }

  sql += ` ORDER BY candidate_code ASC`;
  return { sql, params };
}

app.register(fastifyStatic, {
  root: path.join(__dirname, "frontend"),
  prefix: "/",
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS results_department (
      id SERIAL PRIMARY KEY,
      dept_iso TEXT NOT NULL,
      candidate TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (dept_iso, candidate)
    );
  `);
}

function buildMapResults(rows) {
  const byDept = {};

  for (const row of rows) {
    const dept = String(row.dept_iso).trim().toUpperCase();
    const cand = String(row.candidate).trim().toUpperCase();
    const votes = Number(row.votes) || 0;

    if (!byDept[dept]) {
      byDept[dept] = {
        total: 0,
        byCandidate: {},
      };
    }

    byDept[dept].byCandidate[cand] = votes;
    byDept[dept].total += votes;
  }

  const out = {};

  for (const [dept, data] of Object.entries(byDept)) {
    let winner = "";
    let winnerVotes = -1;

    for (const [cand, votes] of Object.entries(data.byCandidate)) {
      if (votes > winnerVotes) {
        winnerVotes = votes;
        winner = cand;
      }
    }

    out[dept] = {
      winner,
      winnerPct: data.total > 0 ? Number((winnerVotes / data.total).toFixed(4)) : 0,
      total: data.total,
      byCandidate: data.byCandidate,
    };
  }

  return out;
}

app.get("/health", async () => ({ ok: true }));

app.get("/api/config/public", async () => ({
  environment: process.env.NODE_ENV || "production",
  staging: process.env.NODE_ENV === "staging" && process.env.STAGING === "true",
  activeElectionId: ACTIVE_ELECTION_ID,
  activeElectionLabel: ACTIVE_ELECTION_LABEL
}));

app.get("/", async (req, reply) => {
  return reply.sendFile("index.html");
});

app.get("/admin", async (req, reply) => {
  return reply.sendFile("admin.html");
});

app.get("/admin-electoral", async (req, reply) => {
  return reply.sendFile("admin-electoral.html");
});

app.get("/communes", async (req, reply) => {
  return reply.sendFile("communes.html");
});

app.get("/admin-communes", async (req, reply) => {
  return reply.sendFile("admin-communes.html");
});

app.get("/demo", async (req, reply) => {
  return reply.sendFile("demo.html");
});

app.get("/demo/brief", async (req, reply) => {
  return reply.sendFile("demo/brief.pdf");
});

app.get("/stream", async (req, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const interval = setInterval(() => {
    reply.raw.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 5000);

  req.raw.on("close", () => {
    clearInterval(interval);
  });
});

app.get("/votes", async () => {
  try {
    const r = await pool.query(
      "SELECT id, candidate, created_at FROM votes ORDER BY id DESC LIMIT 50"
    );
    return r.rows;
  } catch (err) {
    return [];
  }
});

app.get("/api/results", async () => {
  try {
    const r = await pool.query(`
      SELECT dept_iso, candidate, votes
      FROM results_department
      ORDER BY dept_iso, candidate
    `);

    if (!r.rows.length) {
      return DEMO_RESULTS;
    }

    return buildMapResults(r.rows);
  } catch (err) {
    app.log.error(err);
    return DEMO_RESULTS;
  }
});

app.get("/results/departments", async () => {
  const results = await app.inject({
    method: "GET",
    url: "/api/results",
  });

  const json = results.json();

  const items = Object.keys(json).sort().map((iso) => ({
    iso,
    winner: json[iso].winner ? `Candidat ${json[iso].winner}` : "Aucun",
    winner_pct: Math.round((json[iso].winnerPct || 0) * 100),
  }));

  return { items };
});

app.post("/api/submit-results", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const validation = validateResultPayload(req.body || {}, {
      requireDept: true,
      requireCommune: true,
      requireSection: true
    });

    if (!validation.ok) {
      return sendValidationError(reply, [
        "This route is deprecated; submit results with election_id, pv_code, candidate, votes, dept_name/dept_iso, commune_name/commune, and section_name/section.",
        ...validation.errors
      ]);
    }

    const payload = validation.value;
    let finalCandidate = payload.candidate || null;

    if (!finalCandidate && payload.candidate_id) {
      const c = await pool.query(
        `SELECT candidate_code, ballot_name
         FROM candidates
         WHERE id = $1
         LIMIT 1`,
        [Number(payload.candidate_id)]
      );

      if (c.rows.length) {
        finalCandidate = c.rows[0].candidate_code || null;
      }
    }

    if (!finalCandidate) {
      return sendValidationError(reply, ["candidate could not be resolved"]);
    }

    const result = await pool.query(
      `
      INSERT INTO results_votes (
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (election_id, pv_code, candidate)
      DO UPDATE SET
        dept_name = EXCLUDED.dept_name,
        commune_name = EXCLUDED.commune_name,
        section_name = EXCLUDED.section_name,
        centre_vote_name = EXCLUDED.centre_vote_name,
        bv_no = EXCLUDED.bv_no,
        votes = EXCLUDED.votes,
        updated_at = NOW()
      RETURNING *
      `,
      [
        payload.election_id,
        payload.dept_name,
        payload.commune_name,
        payload.section_name,
        payload.centre_vote_name,
        payload.bv_no,
        payload.pv_code,
        finalCandidate,
        payload.votes
      ]
    );

    return reply.send({
      ok: true,
      deprecated: true,
      message: "Deprecated compatibility route. Result was stored in results_votes.",
      item: result.rows[0]
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/admin/recent", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const r = await pool.query(`
      SELECT dept_iso, candidate, votes, updated_at
      FROM results_department
      ORDER BY updated_at DESC
      LIMIT 20
    `);

    return {
      ok: true,
      items: r.rows
    };
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/national", async () => {
  try {
    const r = await pool.query(`
      SELECT candidate, SUM(votes) AS votes
      FROM results_department
      GROUP BY candidate
      ORDER BY votes DESC
    `);

    const rows = r.rows || [];
    const totals = {};
    let grandTotal = 0;

    for (const row of rows) {
      const cand = String(row.candidate).toUpperCase();
      const v = Number(row.votes) || 0;
      totals[cand] = v;
      grandTotal += v;
    }

    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const leader = entries.length ? entries[0][0] : null;
    const leaderVotes = entries.length ? entries[0][1] : 0;

    const pct = {};
    for (const [cand, v] of entries) {
      pct[cand] = grandTotal ? Number((v / grandTotal).toFixed(4)) : 0;
    }

    return {
      totalVotes: grandTotal,
      totals,
      pct,
      leader,
      leaderPct: grandTotal ? Number((leaderVotes / grandTotal).toFixed(4)) : 0
    };
  } catch (err) {
    app.log.error(err);
    return { totalVotes: 0, totals: {}, pct: {}, leader: null, leaderPct: 0 };
  }
});

// =====================
// ELECTORAL CASCADE API
// =====================

app.get("/api/electoral/departments", async (req, reply) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT dept_name
      FROM locations_electoral_units
      WHERE is_active = TRUE
      ORDER BY dept_name ASC
    `);

    return {
      ok: true,
      items: r.rows.map(row => row.dept_name)
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

app.get("/api/electoral/communes", async (req, reply) => {
  const dept_name = String(req.query.dept_name || "").trim();

  if (!dept_name) {
    return reply.code(400).send({ ok: false, error: "dept_name requis" });
  }

  try {
    const r = await pool.query(`
      SELECT DISTINCT commune_name
      FROM locations_electoral_units
      WHERE is_active = TRUE
        AND dept_name = $1
      ORDER BY commune_name ASC
    `, [dept_name]);

    return {
      ok: true,
      items: r.rows.map(row => row.commune_name)
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

app.get("/api/electoral/sections", async (req, reply) => {
  const dept_name = String(req.query.dept_name || "").trim();
  const commune_name = String(req.query.commune_name || "").trim();

  if (!dept_name || !commune_name) {
    return reply.code(400).send({ ok: false, error: "dept_name et commune_name requis" });
  }

  try {
    const r = await pool.query(`
      SELECT DISTINCT section_name
      FROM locations_electoral_units
      WHERE is_active = TRUE
        AND dept_name = $1
        AND commune_name = $2
      ORDER BY section_name ASC
    `, [dept_name, commune_name]);

    return {
      ok: true,
      items: r.rows.map(row => row.section_name)
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

app.get("/api/electoral/bvs", async (req, reply) => {
  const dept_name = String(req.query.dept_name || "").trim();
  const commune_name = String(req.query.commune_name || "").trim();
  const section_name = String(req.query.section_name || "").trim();

  if (!dept_name || !commune_name || !section_name) {
    return reply.code(400).send({ ok: false, error: "dept_name, commune_name et section_name requis" });
  }

  try {
    const r = await pool.query(`
      SELECT centre_vote_name, bv_no, pv_code
      FROM locations_electoral_units
      WHERE is_active = TRUE
        AND dept_name = $1
        AND commune_name = $2
        AND section_name = $3
      ORDER BY centre_vote_name ASC, bv_no ASC
    `, [dept_name, commune_name, section_name]);

    return {
      ok: true,
      items: r.rows
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

// =====================
// ELECTORAL RESULTS API
// =====================

app.post("/api/submit-electoral-result", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  const validation = validateResultPayload(req.body || {}, {
    requireDept: true,
    requireCommune: true,
    requireSection: true
  });

  if (!validation.ok) {
    return sendValidationError(reply, validation.errors);
  }

  const {
    election_id,
    dept_name,
    commune_name,
    section_name,
    centre_vote_name,
    bv_no,
    pv_code,
    candidate,
    votes
  } = validation.value;

  try {
    await pool.query(
      `
      INSERT INTO results_votes (
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      ON CONFLICT (election_id, pv_code, candidate)
      DO UPDATE SET
        dept_name = EXCLUDED.dept_name,
        commune_name = EXCLUDED.commune_name,
        section_name = EXCLUDED.section_name,
        centre_vote_name = EXCLUDED.centre_vote_name,
        bv_no = EXCLUDED.bv_no,
        votes = EXCLUDED.votes,
        updated_at = NOW()
      `,
      [
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes
      ]
    );

    return {
      ok: true,
      item: {
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes
      }
    };
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});
app.get("/api/results/departments-live", async (req, reply) => {
  try {
    const r = await pool.query(`
      SELECT
        dept_name,
        candidate,
        SUM(votes) AS total_votes
      FROM results_votes
      GROUP BY dept_name, candidate
      ORDER BY dept_name, candidate
    `);

    const DEPT_TO_ISO = {
      "Artibonite": "HT-AR",
      "Centre": "HT-CE",
      "Grand'Anse": "HT-GA",
      "Grand Anse": "HT-GA",
      "Nippes": "HT-NI",
      "Nord": "HT-ND",
      "Nord-Est": "HT-NE",
      "Nord Est": "HT-NE",
      "Nord-Ouest": "HT-NO",
      "Nord Ouest": "HT-NO",
      "Ouest": "HT-OU",
      "Sud": "HT-SD",
      "Sud-Est": "HT-SE",
      "Sud Est": "HT-SE"
    };

    const byDept = {};

    for (const row of r.rows) {
      const deptName = String(row.dept_name || "").trim();
      const iso = DEPT_TO_ISO[deptName];
      if (!iso) continue;

      const candidate = String(row.candidate || "").trim().toUpperCase();
      const votes = Number(row.total_votes) || 0;

      if (!byDept[iso]) {
        byDept[iso] = {
          total: 0,
          byCandidate: {}
        };
      }

      byDept[iso].byCandidate[candidate] = votes;
      byDept[iso].total += votes;
    }

    const out = {};

    for (const [iso, data] of Object.entries(byDept)) {
      let winner = "";
      let winnerVotes = -1;
      let topCount = 0;

      for (const [cand, votes] of Object.entries(data.byCandidate)) {
        if (votes > winnerVotes) {
          winnerVotes = votes;
          winner = cand;
          topCount = 1;
        } else if (votes === winnerVotes) {
          topCount += 1;
        }
      }

      const isTie = topCount > 1;

      out[iso] = {
        winner: isTie ? null : winner,
        isTie,
        winnerPct: (!isTie && data.total > 0) ? Number((winnerVotes / data.total).toFixed(4)) : 0,
        total: data.total,
        byCandidate: data.byCandidate
      };
    }

    return reply.send({
      ok: true,
      items: out
    });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
  }
});

app.get("/api/results/national-live", async (req, reply) => {
  try {
    const r = await pool.query(`
      SELECT
        candidate,
        SUM(votes) AS total_votes
      FROM results_votes
      GROUP BY candidate
      ORDER BY SUM(votes) DESC
    `);

    let totalVotes = 0;
    const rows = r.rows.map(row => {
      const votes = Number(row.total_votes) || 0;
      totalVotes += votes;
      return {
        candidate: String(row.candidate || "").trim().toUpperCase(),
        votes
      };
    });

    const ranking = rows
      .map(row => ({
        candidate: row.candidate,
        votes: row.votes,
        pct: totalVotes > 0 ? Number((row.votes / totalVotes).toFixed(4)) : 0
      }))
      .sort((a, b) => b.votes - a.votes);

    let leader = null;
    let isTie = false;

    if (ranking.length > 0) {
      leader = ranking[0].candidate;
      if (ranking.length > 1 && ranking[0].votes === ranking[1].votes) {
        leader = null;
        isTie = true;
      }
    }

    return reply.send({
      ok: true,
      totalVotes,
      ranking,
      leader,
      isTie
    });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
  }
});
app.get("/api/results/communes", async (req, reply) => {
  try {
    const r = await pool.query(`
      SELECT
        dept_name,
        commune_name,
        candidate,
        SUM(votes) AS total_votes
      FROM results_votes
      GROUP BY dept_name, commune_name, candidate
      ORDER BY dept_name, commune_name, candidate
    `);

    return reply.send({
      ok: true,
      items: r.rows
    });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
  }
});
app.get("/api/results/progress", async (req, reply) => {
  try {
    const totalPvRes = await pool.query(`
      SELECT COUNT(DISTINCT pv_code) AS total
      FROM locations_electoral_units
      WHERE pv_code IS NOT NULL
        AND TRIM(pv_code) <> ''
        AND is_active = TRUE
    `);

    const processedPvRes = await pool.query(`
      SELECT COUNT(DISTINCT pv_code) AS total
      FROM results_votes
      WHERE pv_code IS NOT NULL
        AND TRIM(pv_code) <> ''
    `);

    const total = Number(totalPvRes.rows[0]?.total || 0);
    const processed = Number(processedPvRes.rows[0]?.total || 0);
    const pct = total > 0 ? Number(((processed / total) * 100).toFixed(1)) : 0;

    return reply.send({
      ok: true,
      processed,
      total,
      pct
    });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
  }
});

app.get("/api/results/departments-progress", async (req, reply) => {
  try {
    const refRes = await pool.query(`
      SELECT
        dept_name,
        COUNT(DISTINCT pv_code) AS total
      FROM locations_electoral_units
      WHERE pv_code IS NOT NULL
        AND TRIM(pv_code) <> ''
        AND is_active = TRUE
      GROUP BY dept_name
    `);

    const doneRes = await pool.query(`
      SELECT
        dept_name,
        COUNT(DISTINCT pv_code) AS processed
      FROM results_votes
      WHERE pv_code IS NOT NULL
        AND TRIM(pv_code) <> ''
      GROUP BY dept_name
    `);

    const DEPT_TO_ISO = {
      "Artibonite": "HT-AR",
      "Centre": "HT-CE",
      "Grand'Anse": "HT-GA",
      "Grand Anse": "HT-GA",
      "Nippes": "HT-NI",
      "Nord": "HT-ND",
      "Nord-Est": "HT-NE",
      "Nord Est": "HT-NE",
      "Nord-Ouest": "HT-NO",
      "Nord Ouest": "HT-NO",
      "Ouest": "HT-OU",
      "Sud": "HT-SD",
      "Sud-Est": "HT-SE",
      "Sud Est": "HT-SE"
    };

    const out = {};

    for (const row of refRes.rows) {
      const deptName = String(row.dept_name || "").trim();
      const iso = DEPT_TO_ISO[deptName];
      if (!iso) continue;

      out[iso] = {
        processed: 0,
        total: Number(row.total) || 0,
        pct: 0
      };
    }

    for (const row of doneRes.rows) {
      const deptName = String(row.dept_name || "").trim();
      const iso = DEPT_TO_ISO[deptName];
      if (!iso) continue;

      if (!out[iso]) {
        out[iso] = { processed: 0, total: 0, pct: 0 };
      }

      out[iso].processed = Number(row.processed) || 0;
    }

    for (const iso of Object.keys(out)) {
      const item = out[iso];
      item.pct = item.total > 0 ? Number(((item.processed / item.total) * 100).toFixed(1)) : 0;
    }

    return reply.send({
      ok: true,
      items: out
    });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
  }
});

app.post("/api/admin/party", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const {
      name,
      acronym,
      color,
      logo,
      address,
      phone,
      email
    } = req.body || {};

    const r = await pool.query(
      `INSERT INTO political_parties
      (name, acronym, color, logo, address, phone, email)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [name, acronym, color, logo, address, phone, email]
    );

    return reply.send({
      ok: true,
      party: r.rows[0]
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/admin/parties", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const r = await pool.query(`
      SELECT *
      FROM political_parties
      ORDER BY name ASC
    `);

    return reply.send({
      ok: true,
      parties: r.rows
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.post("/api/admin/candidate", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const {
      first_name,
      last_name,
      ballot_name,
      office,
      department,
      commune,
      photo,
      party_id
    } = req.body || {};

    const r = await pool.query(
      `INSERT INTO candidates
      (first_name, last_name, ballot_name, office, department, commune, photo, party_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        first_name,
        last_name,
        ballot_name,
        office,
        department,
        commune,
        photo,
        party_id
      ]
    );

    return reply.send({
      ok: true,
      candidate: r.rows[0]
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/admin/candidates", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const r = await pool.query(`
      SELECT
        c.*,
        p.name AS party_name,
        p.color AS party_color
      FROM candidates c
      LEFT JOIN political_parties p
        ON p.id = c.party_id
      ORDER BY c.office ASC, c.last_name ASC, c.first_name ASC
    `);

    return reply.send({
      ok: true,
      candidates: r.rows
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/admin/electoral-tree", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const r = await pool.query(`
      SELECT
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code
      FROM locations_electoral_units
      WHERE is_active = TRUE
      ORDER BY dept_name, commune_name, section_name, centre_vote_name, bv_no
    `);

    const tree = { "Haïti": {} };

    for (const row of r.rows) {
      const country = "Haïti";
      const dept = String(row.dept_name || "").trim();
      const commune = String(row.commune_name || "").trim();
      const section = String(row.section_name || "").trim();
      const centre = String(row.centre_vote_name || "").trim();
      const bv = String(row.bv_no || "").trim();
      const pv_code = String(row.pv_code || "").trim();

      if (!tree[country][dept]) tree[country][dept] = {};
      if (!tree[country][dept][commune]) tree[country][dept][commune] = {};
      if (!tree[country][dept][commune][section]) tree[country][dept][commune][section] = {};
      if (!tree[country][dept][commune][section][centre]) tree[country][dept][commune][section][centre] = [];

      tree[country][dept][commune][section][centre].push({
        bv_no: bv,
        pv_code
      });
    }

    return reply.send({
      ok: true,
      tree
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/admin/vote-entries", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const r = await pool.query(`
      SELECT
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes
      FROM results_votes
      ORDER BY id DESC
      LIMIT 100
    `);

    return reply.send({
      ok: true,
      items: r.rows
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.post("/api/admin/vote-entry", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const validation = validateResultPayload(req.body || {}, {
      requireDept: true,
      requireCommune: true,
      requireSection: true,
      requireCentre: true,
      requireBv: true
    });

    if (!validation.ok) {
      return sendValidationError(reply, validation.errors);
    }

    const {
      election_id,
      dept_name,
      commune_name,
      section_name,
      centre_vote_name,
      bv_no,
      pv_code,
      candidate,
      votes
    } = validation.value;

    const exists = await pool.query(
      `SELECT id
       FROM results_votes
       WHERE election_id = $1
         AND pv_code = $2
         AND candidate = $3
       LIMIT 1`,
      [election_id, pv_code, candidate]
    );

    if (exists.rows.length) {
      return reply.code(409).send({
        ok: false,
        error: "Vote entry already exists for this election / PV / candidate"
      });
    }

    const r = await pool.query(
      `INSERT INTO results_votes
      (election_id, dept_name, commune_name, section_name, centre_vote_name, bv_no, pv_code, candidate, votes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        election_id,
        dept_name,
        commune_name,
        section_name,
        centre_vote_name,
        bv_no,
        pv_code,
        candidate,
        votes
      ]
    );

    return reply.send({
      ok: true,
      item: r.rows[0]
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});




app.put("/api/admin/candidate/:id", async (req, reply) => {
  if (!requireAdmin(req, reply)) return;

  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return reply.code(400).send({ ok: false, error: "Invalid id" });
    }

    const {
      first_name,
      last_name,
      ballot_name,
      office,
      department,
      commune,
      photo,
      party_id,
      candidate_code,
      scope_level,
      country_name,
      dept_name,
      commune_name,
      section_name,
      status,
      is_active
    } = req.body || {};

    const r = await pool.query(
      `UPDATE candidates
       SET first_name = $1,
           last_name = $2,
           ballot_name = $3,
           office = $4,
           department = $5,
           commune = $6,
           photo = $7,
           party_id = $8,
           candidate_code = $9,
           scope_level = $10,
           country_name = $11,
           dept_name = $12,
           commune_name = $13,
           section_name = $14,
           status = $15,
           is_active = $16
       WHERE id = $17
       RETURNING *`,
      [
        first_name,
        last_name,
        ballot_name,
        office,
        department,
        commune,
        photo,
        party_id || null,
        candidate_code || null,
        scope_level || null,
        country_name || "Haïti",
        dept_name || null,
        commune_name || null,
        section_name || null,
        status || "pending",
        typeof is_active === "boolean" ? is_active : true,
        id
      ]
    );

    if (!r.rows.length) {
      return reply.code(404).send({ ok: false, error: "Candidate not found" });
    }

    return reply.send({
      ok: true,
      candidate: r.rows[0]
    });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/results/departments-live-named", async (req, reply) => {
  try {
    const { office } = req.query || {};

    const resultsRes = await pool.query(`
      SELECT
        dept_name,
        candidate,
        SUM(votes) AS total_votes
      FROM results_votes
      GROUP BY dept_name, candidate
      ORDER BY dept_name, candidate
    `);

    const candidateQuery = buildCandidateOfficeQuery(office);
    const candidatesRes = await pool.query(candidateQuery.sql, candidateQuery.params);

    const nameMap = {};
    for (const row of candidatesRes.rows) {
      nameMap[String(row.candidate_code || "").trim().toUpperCase()] = row.ballot_name || row.candidate_code;
    }

    const items = resultsRes.rows.map(row => ({
      dept_name: row.dept_name,
      candidate_code: row.candidate,
      candidate_name: nameMap[String(row.candidate || "").trim().toUpperCase()] || row.candidate,
      total_votes: Number(row.total_votes) || 0
    }));

    return reply.send({ ok: true, items });
  } catch (err) {
    return sendDbError(reply, app.log, err);
  }
});

app.get("/api/candidate-directory", async (req, reply) => {
  try {
    const r = await pool.query(`
      SELECT candidate_code, ballot_name, first_name, last_name
      FROM candidates
      WHERE is_active = TRUE
      ORDER BY id ASC
    `);

    const items = {};
    for (const row of r.rows) {
      const code = String(row.candidate_code || "").trim().toUpperCase();
      const name = row.ballot_name || [row.first_name, row.last_name].filter(Boolean).join(" ");
      if (code && name) items[code] = name;
    }

    return reply.send({ ok: true, items });
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

const start = async () => {
  assertStartupEnvironment();
  await ensureSchema();
  await app.listen({ port: PORT, host: "0.0.0.0" });
};


/* ================================
   RAPPORT OFFICIEL ELECTION
================================ */

app.post("/api/admin/report", async (req,reply)=>{

if (!requireAdmin(req, reply)) return;

try{

const r=req.body;

const report=await pool.query(`
INSERT INTO election_reports(
election_date,round_label,election_type,office,
territory_level,territory_name,
pv_not_received,pv_excluded,pv_included,
expressed_choice,no_candidate_votes,
valid_votes,null_votes,source_note
)
VALUES(
$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
)
RETURNING id
`,[
r.election_date,
r.round_label,
r.election_type,
r.office,
r.territory_level,
r.territory_name,
r.pv_not_received,
r.pv_excluded,
r.pv_included,
r.expressed_choice,
r.no_candidate_votes,
r.valid_votes,
r.null_votes,
r.source_note
]);

const report_id=report.rows[0].id;

for(const c of r.candidates){

await pool.query(`
INSERT INTO election_report_candidates
(report_id,candidate_no,party_name,candidate_name,votes,pct)
VALUES($1,$2,$3,$4,$5,$6)
`,[
report_id,
c.candidate_no,
c.party_name,
c.candidate_name,
c.votes,
c.pct
]);

}

return reply.send({ok:true,report_id});

}catch(e){

return sendDbError(reply, app.log, e);

}

});

app.get("/api/reports/:id", async (req,reply)=>{

try{

const id=req.params.id;

const r=await pool.query(
"SELECT * FROM election_reports WHERE id=$1",[id]
);

if(!r.rows.length) return reply.send({ok:false});

const c=await pool.query(
"SELECT * FROM election_report_candidates WHERE report_id=$1 ORDER BY votes DESC",[id]
);

return reply.send({
ok:true,
report:r.rows[0],
candidates:c.rows
});

}catch(e){

return reply.code(500).send({ok:false});

}

});

module.exports = {
  app,
  helpers: {
    normalizeText,
    safeCompareToken,
    checkAdminToken,
    validateResultPayload,
    buildCandidateOfficeQuery,
    getDatabaseName,
    validateStartupEnvironment
  }
};

if (require.main === module) {
  start().catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}
