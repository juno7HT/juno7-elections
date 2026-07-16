const { createV2Database } = require("../db");
const { listCandidacies } = require("../repositories/candidacies");
const { getElectionByPublicId, listElectionRounds, listElections } = require("../repositories/elections");
const { listOffices } = require("../repositories/offices");
const { getLatestPublication } = require("../repositories/publications");
const { listPvProgress } = require("../repositories/pvs");
const { listTerritories, listTerritoryChildren } = require("../repositories/territories");

function sendOk(reply, result) {
  return reply.send({
    ok: true,
    items: result.items || [],
    meta: result.meta || { count: (result.items || []).length }
  });
}

function sendValidation(reply, errors) {
  return reply.code(400).send({
    ok: false,
    items: [],
    meta: {
      error: "Validation failed",
      details: errors
    }
  });
}

function sendNotFound(reply) {
  return reply.code(404).send({
    ok: false,
    items: [],
    meta: {
      error: "Not found"
    }
  });
}

function sendInternal(reply, logger, err) {
  logger.error({ err }, "V2 read API failed");
  return reply.code(500).send({
    ok: false,
    items: [],
    meta: {
      error: "Internal server error"
    }
  });
}

async function handleRead(req, reply, action) {
  try {
    const result = await action();
    if (result.errors) return sendValidation(reply, result.errors);
    if (result.notFound) return sendNotFound(reply);
    return sendOk(reply, result);
  } catch (err) {
    return sendInternal(reply, req.log, err);
  }
}

function registerV2ReadApi(app, options = {}) {
  const db = options.db || createV2Database(options.env || process.env);

  app.addHook("onClose", async () => {
    if (!options.db) await db.close();
  });

  app.get("/api/v2/elections", async (req, reply) => (
    handleRead(req, reply, () => listElections(db, req.query))
  ));

  app.get("/api/v2/elections/:publicId", async (req, reply) => (
    handleRead(req, reply, async () => {
      const result = await getElectionByPublicId(db, req.params.publicId);
      if (!result.errors && result.items.length === 0) return { notFound: true };
      return result;
    })
  ));

  app.get("/api/v2/elections/:publicId/rounds", async (req, reply) => (
    handleRead(req, reply, () => listElectionRounds(db, req.params.publicId, req.query))
  ));

  app.get("/api/v2/territories", async (req, reply) => (
    handleRead(req, reply, () => listTerritories(db, req.query))
  ));

  app.get("/api/v2/territories/:publicId/children", async (req, reply) => (
    handleRead(req, reply, () => listTerritoryChildren(db, req.params.publicId, req.query))
  ));

  app.get("/api/v2/offices", async (req, reply) => (
    handleRead(req, reply, () => listOffices(db, req.query))
  ));

  app.get("/api/v2/candidacies", async (req, reply) => (
    handleRead(req, reply, () => listCandidacies(db, req.query))
  ));

  app.get("/api/v2/pvs/progress", async (req, reply) => (
    handleRead(req, reply, () => listPvProgress(db, req.query))
  ));

  app.get("/api/v2/publications/latest", async (req, reply) => (
    handleRead(req, reply, () => getLatestPublication(db, req.query))
  ));
}

module.exports = {
  registerV2ReadApi
};
