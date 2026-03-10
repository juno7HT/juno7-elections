require("dotenv").config();

const path = require("path");
const Fastify = require("fastify");
const fastifyStatic = require("@fastify/static");
const { Pool } = require("pg");

const app = Fastify({ logger: true });

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "123456";

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
  const token = req.headers["x-admin-token"];

  if (!token || token !== ADMIN_TOKEN) {
    return reply.code(401).send({ ok: false, error: "Unauthorized" });
  }

  const body = req.body || {};
  const dept_iso = String(body.dept_iso || "").trim().toUpperCase();
  const candidate = String(body.candidate || "").trim().toUpperCase();
  const votes = Number(body.votes);

  if (!dept_iso || !candidate || !Number.isFinite(votes) || votes < 0) {
    return reply.code(400).send({
      ok: false,
      error: "Payload invalide",
      expected: { dept_iso: "HT-OU", candidate: "A", votes: 12000 },
    });
  }

  try {
    await pool.query(
      `
      INSERT INTO results_department (dept_iso, candidate, votes, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (dept_iso, candidate)
      DO UPDATE SET votes = EXCLUDED.votes, updated_at = NOW()
      `,
      [dept_iso, candidate, Math.trunc(votes)]
    );

    return {
      ok: true,
      dept_iso,
      candidate,
      votes: Math.trunc(votes),
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({ ok: false, error: "DB error" });
  }
});

app.get("/api/admin/recent", async (req, reply) => {
  const token = req.headers["x-admin-token"];

  if (!token || token !== ADMIN_TOKEN) {
    return reply.code(401).send({ ok: false, error: "Unauthorized" });
  }

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
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
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
  const token = req.headers["x-admin-token"];

  if (!token || token !== ADMIN_TOKEN) {
    return reply.code(401).send({ ok: false, error: "Unauthorized" });
  }

  const body = req.body || {};

  const election_id = String(body.election_id || "").trim();
  const dept_name = String(body.dept_name || "").trim();
  const commune_name = String(body.commune_name || "").trim();
  const section_name = String(body.section_name || "").trim();
  const centre_vote_name = String(body.centre_vote_name || "").trim();
  const bv_no = String(body.bv_no || "").trim();
  const pv_code = String(body.pv_code || "").trim();
  const candidate = String(body.candidate || "").trim().toUpperCase();
  const votes = Number(body.votes);

  if (
    !election_id ||
    !dept_name ||
    !commune_name ||
    !section_name ||
    !candidate ||
    !Number.isFinite(votes) ||
    votes < 0
  ) {
    return reply.code(400).send({
      ok: false,
      error: "Payload invalide",
      expected: {
        election_id: "demo-2026",
        dept_name: "Ouest",
        commune_name: "Port-au-Prince",
        section_name: "1ere Sect. Turgeau",
        centre_vote_name: "Ecole Nationale Turgeau",
        bv_no: "1",
        pv_code: "PV-O01",
        candidate: "A",
        votes: 350
      }
    });
  }

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
        Math.trunc(votes)
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
        votes: Math.trunc(votes)
      }
    };
  } catch (err) {
    app.log.error(err);
    return reply.code(500).send({
      ok: false,
      error: "DB error"
    });
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

      for (const [cand, votes] of Object.entries(data.byCandidate)) {
        if (votes > winnerVotes) {
          winnerVotes = votes;
          winner = cand;
        }
      }

      out[iso] = {
        winner,
        winnerPct: data.total > 0 ? Number((winnerVotes / data.total).toFixed(4)) : 0,
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

    return reply.send({
      ok: true,
      totalVotes,
      ranking
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

const start = async () => {
  await ensureSchema();
  await app.listen({ port: PORT, host: "0.0.0.0" });
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
