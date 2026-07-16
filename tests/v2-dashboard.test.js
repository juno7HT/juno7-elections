const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const dashboardPath = path.join(root, "frontend", "v2-dashboard.html");
const source = fs.readFileSync(dashboardPath, "utf8");

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, ["-e", script], {
      cwd: root,
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

test("V2 public dashboard is hidden when feature flag is disabled", async () => {
  const script = `
    delete process.env.V2_PUBLIC_UI;
    const { app } = require("./index.js");
    Promise.all([
      app.inject({ method: "GET", url: "/v2-dashboard" }),
      app.inject({ method: "GET", url: "/v2-dashboard.html" })
    ]).then(([page, file]) => {
      console.log("PAGE:" + page.statusCode);
      console.log("FILE:" + file.statusCode);
      return app.close();
    }).catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
  `;
  const result = await runNode(script, { V2_READ_API: "" });
  assert.match(result.stdout, /PAGE:404/);
  assert.match(result.stdout, /FILE:404/);
});

test("V2 public dashboard is available when feature flag is enabled", async () => {
  const script = `
    process.env.V2_PUBLIC_UI = "true";
    const { app } = require("./index.js");
    app.inject({ method: "GET", url: "/v2-dashboard" })
      .then((res) => {
        console.log("STATUS:" + res.statusCode);
        console.log("HAS_BANNER:" + res.body.includes("V2 — DONNÉES DE DÉMONSTRATION"));
        return app.close();
      })
      .catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  `;
  const result = await runNode(script, { V2_READ_API: "" });
  assert.match(result.stdout, /STATUS:200/);
  assert.match(result.stdout, /HAS_BANNER:true/);
});

test("V2 public dashboard has no write flow, admin token or browser storage", () => {
  assert.doesNotMatch(source, /\b(POST|PUT|PATCH|DELETE)\b/);
  assert.doesNotMatch(source, /x-admin-token|ADMIN_TOKEN|adminToken|token/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("V2 public dashboard references only expected V2 endpoints", () => {
  const expected = [
    "/api/v2/elections",
    "/api/v2/elections/${encodeURIComponent(publicId)}",
    "/api/v2/elections/${encodeURIComponent(publicId)}/rounds",
    "/api/v2/offices",
    "/api/v2/candidacies?electionPublicId=${encodeURIComponent(publicId)}",
    "/api/v2/pvs/progress?electionPublicId=${encodeURIComponent(publicId)}",
    "/api/v2/publications/latest?electionPublicId=${encodeURIComponent(publicId)}"
  ];

  for (const endpoint of expected) {
    assert.match(source, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  const endpointReferences = source.match(/\/api\/v2\/[A-Za-z0-9_/?=${}().:-]+/g) || [];
  for (const endpoint of endpointReferences) {
    assert.ok(expected.some(allowed => endpoint.startsWith(allowed.split("?")[0])), endpoint);
  }
});

test("V2 public dashboard HTML and scripts are structurally coherent", () => {
  assert.match(source, /<!DOCTYPE html>/i);
  assert.equal((source.match(/<html\b/gi) || []).length, 1);
  assert.equal((source.match(/<\/html>/gi) || []).length, 1);
  assert.equal((source.match(/<script\b/gi) || []).length, (source.match(/<\/script>/gi) || []).length);
  assert.match(source, /Chargement des élections/);
  assert.match(source, /Aucune donnée V2 disponible/);
  assert.match(source, /Élection introuvable/);
});
