require("dotenv").config();

const path = require("path");
const Fastify = require("fastify");
const cors = require("@fastify/cors");
const rateLimit = require("@fastify/rate-limit");
const fastifyStatic = require("@fastify/static");
const { Pool } = require("pg");

const app = Fastify({ logger: true });

app.register(cors, { origin: true });
app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// -----------------------------
// API
// -----------------------------
app.get("/health", async () => ({ ok: true }));

app.get("/db", async () => {
  const r = await pool.query("SELECT NOW() as now");
  return { db: "ok", now: r.rows[0].now };
});

// -----------------------------
// ✅ LIVE DEMO: Stream SSE (push temps réel)
// -----------------------------
app.get("/api/live", async (req, reply) => {
  // SSE headers
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // Petit helper pour envoyer un event SSE
  const send = (data) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // ✅ Démo: on simule des résultats qui bougent (toutes les 2s)
  // Format: même structure que deptResults côté frontend
  let tick = 0;

  const base = {
    "HT-OU": { valid: 950000, candidates: { A: 520000, B: 410000, C: 20000 } },
    "HT-AR": { valid: 300000, candidates: { A: 140000, B: 150000, C: 10000 } },
    "HT-ND": { valid: 240000, candidates: { A: 80000,  B: 150000, C: 10000 } },
    "HT-SD": { valid: 210000, candidates: { A: 100000, B: 105000, C: 5000 } },
  };

  const jitter = (n) => {
    // petites variations pour simuler l’arrivée de PV
    const delta = Math.round((Math.random() - 0.5) * 2000);
    return Math.max(0, n + delta);
  };

  const interval = setInterval(() => {
    tick++;

    // Clone + jitter
    const items = {};
    for (const [iso, v] of Object.entries(base)) {
      const A = jitter(v.candidates.A);
      const B = jitter(v.candidates.B);
      const C = jitter(v.candidates.C);
      const valid = A + B + C;

      items[iso] = { valid, candidates: { A, B, C } };
    }

    // Résumé national simple
    let natA = 0, natB = 0, natC = 0, natValid = 0;
    for (const v of Object.values(items)) {
      natA += v.candidates.A;
      natB += v.candidates.B;
      natC += v.candidates.C;
      natValid += v.valid;
    }

    const pct = (x) => (natValid ? Math.round((x / natValid) * 1000) / 10 : 0); // 1 décimale

    send({
      ts: Date.now(),
      tick,
      departments: items,
      national: {
        valid: natValid,
        byCandidate: { A: natA, B: natB, C: natC },
        pct: { A: pct(natA), B: pct(natB), C: pct(natC) },
      },
    });
  }, 2000);

  // Stop propre quand l’utilisateur ferme l’onglet
  req.raw.on("close", () => {
    clearInterval(interval);
  });

// Derniers votes (debug)
app.get("/votes", async () => {
  const r = await pool.query(
    "SELECT id, candidate, created_at FROM votes ORDER BY id DESC LIMIT 50"
  );
  return r.rows;
});

// Résultats par département (DEMO - liste)
app.get("/results/departments", async () => {
  return {
    items: [
      { iso: "HT-OU", winner: "Candidat A", winner_pct: 62 },
      { iso: "HT-AR", winner: "Candidat B", winner_pct: 55 },
      { iso: "HT-ND", winner: "Candidat A", winner_pct: 71 },
      { iso: "HT-SD", winner: "Candidat C", winner_pct: 51 },
      { iso: "HT-SE", winner: "Candidat A", winner_pct: 66 },
      { iso: "HT-NE", winner: "Candidat B", winner_pct: 59 },
      { iso: "HT-NO", winner: "Candidat A", winner_pct: 60 },
      { iso: "HT-CE", winner: "Candidat C", winner_pct: 53 },
      { iso: "HT-GA", winner: "Candidat B", winner_pct: 56 },
      { iso: "HT-NI", winner: "Candidat A", winner_pct: 52 },
    ],
  };
});
/**
 * ✅ Résultats par département (DEMO)
 * Format attendu côté frontend:
 * {
 *   "HT-OU": { winner: "A", winnerPct: 0.62, total: 12000, byCandidate: { A: 7440, B: 4560 } },
 *   ...
 * }
 */
app.get("/api/results", async () => {
  return {
    "HT-AR": {
      winner: "A",
      winnerPct: 0.58,
      total: 10000,
      byCandidate: { A: 5800, B: 4200 },
    },
    "HT-CE": {
      winner: "B",
      winnerPct: 0.52,
      total: 8000,
      byCandidate: { A: 3840, B: 4160 },
    },
    "HT-GA": {
      winner: "A",
      winnerPct: 0.67,
      total: 6000,
      byCandidate: { A: 4020, B: 1980 },
    },
    "HT-NI": {
      winner: "B",
      winnerPct: 0.55,
      total: 5000,
      byCandidate: { A: 2250, B: 2750 },
    },
    "HT-ND": {
      winner: "A",
      winnerPct: 0.61,
      total: 9000,
      byCandidate: { A: 5490, B: 3510 },
    },
    "HT-NE": {
      winner: "A",
      winnerPct: 0.53,
      total: 4000,
      byCandidate: { A: 2120, B: 1880 },
    },
    "HT-NO": {
      winner: "B",
      winnerPct: 0.57,
      total: 4500,
      byCandidate: { A: 1935, B: 2565 },
    },
    "HT-OU": {
      winner: "A",
      winnerPct: 0.64,
      total: 15000,
      byCandidate: { A: 9600, B: 5400 },
    },
    "HT-SD": {
      winner: "B",
      winnerPct: 0.51,
      total: 7000,
      byCandidate: { A: 3430, B: 3570 },
    },
    "HT-SE": {
      winner: "A",
      winnerPct: 0.56,
      total: 3500,
      byCandidate: { A: 1960, B: 1540 },
    },
  };
});

// -----------------------------
// Frontend (sert /frontend/index.html sur /)
// -----------------------------
app.register(fastifyStatic, {
  root: path.join(__dirname, "frontend"),
  prefix: "/",
});

app.get("/", async (req, reply) => {
  return reply.sendFile("index.html");
});

// -----------------------------
// Start server
// -----------------------------
const port = Number(process.env.PORT || 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
