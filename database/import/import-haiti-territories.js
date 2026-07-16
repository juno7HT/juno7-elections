#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const GEO_DIR = path.join(REPO_ROOT, "frontend", "geo");
const ADM1_PATH = path.join(GEO_DIR, "HTI_ADM1.geojson");
const COMMUNES_PATH = path.join(GEO_DIR, "HTI_COMMUNES.geojson");
const ADM3_PATH = path.join(GEO_DIR, "HTI_ADM3.geojson");
const MAPPING_PATH = path.join(__dirname, "haiti-territory-mapping.json");

const SOURCE = "haiti_geojson_national_referential";
const COUNTRY = {
  publicId: "hti_country_national",
  code: "HT",
  name: "Haiti",
  normalizedName: "haiti",
  path: "/HT",
  isoCode: "HT"
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slug(value) {
  return normalizeName(value).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function departmentDisplayName(name) {
  return String(name || "")
    .replace(/^Département\s+(de\s+la|de\s+l'|du|des|de)\s+/i, "")
    .replace(/\s+Department$/i, "")
    .trim();
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function geometryRings(geometry) {
  return geometryPolygons(geometry).flatMap((polygon) => polygon);
}

function ringArea(ring) {
  let area = 0;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    area += ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
  }
  return area / 2;
}

function ringCentroid(ring) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const cross = ring[previous][0] * ring[index][1] - ring[index][0] * ring[previous][1];
    area2 += cross;
    cx += (ring[previous][0] + ring[index][0]) * cross;
    cy += (ring[previous][1] + ring[index][1]) * cross;
  }

  if (Math.abs(area2) < 1e-12) {
    const points = ring.slice(0, -1);
    return [
      points.reduce((total, point) => total + point[0], 0) / points.length,
      points.reduce((total, point) => total + point[1], 0) / points.length
    ];
  }

  return [cx / (3 * area2), cy / (3 * area2)];
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const xi = ring[index][0];
    const yi = ring[index][1];
    const xj = ring[previous][0];
    const yj = ring[previous][1];
    const intersects = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function pointInGeometry(point, geometry) {
  return geometryPolygons(geometry).some((polygon) => pointInPolygon(point, polygon));
}

function representativePoint(geometry) {
  const outerRing = geometryRings(geometry)
    .filter((ring) => ring.length)
    .sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0];

  const centroid = ringCentroid(outerRing);
  if (pointInGeometry(centroid, geometry)) return centroid;

  const insideVertex = outerRing.find((point) => pointInGeometry(point, geometry));
  return insideVertex || centroid;
}

function buildMapping() {
  const adm1 = readJson(ADM1_PATH);
  const communes = readJson(COMMUNES_PATH);
  const adm3 = readJson(ADM3_PATH);
  const adm3IsCommunesDuplicate = fileHash(COMMUNES_PATH) === fileHash(ADM3_PATH);

  const departments = adm1.features.map((feature) => {
    const isoCode = String(feature.properties.ISO_Code || "").trim().toUpperCase();
    const geojsonName = String(feature.properties.NAME || "").trim();
    const name = departmentDisplayName(geojsonName);
    const code = isoCode;
    return {
      name,
      code,
      isoCode,
      geojsonName,
      geojsonCode: isoCode,
      publicId: `hti_department_${isoCode.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      path: `/${COUNTRY.code}/${code}`,
      normalizedName: normalizeName(name),
      featureId: String(feature.properties.feature_id || ""),
      gbid: String(feature.properties.gbid || ""),
      geometryType: feature.geometry?.type || ""
    };
  });

  const departmentGeometries = adm1.features.map((feature) => ({
    isoCode: String(feature.properties.ISO_Code || "").trim().toUpperCase(),
    geometry: feature.geometry
  }));

  const ambiguousCommunes = [];
  const unmappedCommunes = [];
  const communeItems = communes.features.map((feature) => {
    const name = String(feature.properties.shapeName || "").trim();
    const point = representativePoint(feature.geometry);
    const matches = departmentGeometries.filter((department) => pointInGeometry(point, department.geometry));

    if (matches.length === 0) unmappedCommunes.push(name);
    if (matches.length > 1) ambiguousCommunes.push({ name, matches: matches.map((item) => item.isoCode) });

    const departmentIsoCode = matches[0]?.isoCode || "";
    const departmentCode = departmentIsoCode;
    const communeSlug = slug(name);
    const code = `HT-COM-${departmentIsoCode.replace("HT-", "")}-${communeSlug}`;

    return {
      name,
      code,
      departmentCode,
      departmentIsoCode,
      geojsonName: name,
      geojsonCode: String(feature.properties.shapeID || "").trim(),
      publicId: `hti_commune_${departmentIsoCode.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${communeSlug.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      path: `/${COUNTRY.code}/${departmentCode}/${code}`,
      normalizedName: normalizeName(name),
      shapeId: String(feature.properties.shapeID || "").trim(),
      shapeType: String(feature.properties.shapeType || "").trim(),
      geometryType: feature.geometry?.type || "",
      representativePoint: {
        longitude: Number(point[0].toFixed(7)),
        latitude: Number(point[1].toFixed(7))
      }
    };
  });

  const duplicateCommuneNames = duplicateValues(communeItems.map((item) => item.normalizedName));
  const duplicateCommuneCodes = duplicateValues(communeItems.map((item) => item.code));

  return {
    version: 1,
    source: SOURCE,
    generatedFrom: {
      departments: "frontend/geo/HTI_ADM1.geojson",
      communes: "frontend/geo/HTI_COMMUNES.geojson",
      adm3: "frontend/geo/HTI_ADM3.geojson"
    },
    hashes: {
      adm1: fileHash(ADM1_PATH),
      communes: fileHash(COMMUNES_PATH),
      adm3: fileHash(ADM3_PATH)
    },
    analysis: {
      departmentFeatureCount: adm1.features.length,
      communeFeatureCount: communes.features.length,
      adm3FeatureCount: adm3.features.length,
      adm3IsCommunesDuplicate,
      sectionSourceAvailable: false,
      trueSectionCount: 0,
      unmappedCommuneCount: unmappedCommunes.length,
      ambiguousCommuneCount: ambiguousCommunes.length,
      duplicateCommuneNameCount: duplicateCommuneNames.length,
      duplicateCommuneCodeCount: duplicateCommuneCodes.length
    },
    country: COUNTRY,
    departments,
    communes: communeItems,
    sections: [],
    anomalies: {
      unmappedCommunes,
      ambiguousCommunes,
      duplicateCommuneNames,
      duplicateCommuneCodes
    }
  };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function validateLocalDatabaseEnv(env) {
  const databaseUrl = String(env.DATABASE_URL || "");
  let host = String(env.PGHOST || "127.0.0.1");
  let database = String(env.PGDATABASE || "");

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    host = parsed.hostname;
    database = parsed.pathname.replace(/^\/+/, "");
  }

  const normalizedHost = host === "::1" ? "::1" : host.toLowerCase();
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (!localHosts.has(normalizedHost)) {
    throw new Error(`Refusing non-local PostgreSQL host: ${host}`);
  }

  if (database.toLowerCase() === "elections2026") {
    throw new Error("Refusing protected production database name");
  }

  if (!/(test|local)/i.test(database)) {
    throw new Error(`Refusing database without test/local marker: ${database}`);
  }
}

async function upsertTerritory(client, item) {
  const result = await client.query(`
    INSERT INTO elections_v2.territories (
      public_id, parent_id, code, name, normalized_name, territory_level,
      path, iso_code, latitude, longitude, metadata, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, TRUE)
    ON CONFLICT (territory_level, code)
    DO UPDATE SET
      public_id = EXCLUDED.public_id,
      parent_id = EXCLUDED.parent_id,
      name = EXCLUDED.name,
      normalized_name = EXCLUDED.normalized_name,
      path = EXCLUDED.path,
      iso_code = EXCLUDED.iso_code,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      metadata = EXCLUDED.metadata,
      is_active = TRUE,
      archived_at = NULL,
      updated_at = NOW()
    RETURNING id
  `, [
    item.publicId,
    item.parentId || null,
    item.code,
    item.name,
    item.normalizedName,
    item.level,
    item.path,
    item.isoCode || null,
    item.latitude || null,
    item.longitude || null,
    JSON.stringify(item.metadata || {})
  ]);

  return result.rows[0].id;
}

async function importMapping(mapping, env = process.env) {
  validateLocalDatabaseEnv(env);

  const client = new Client();
  await client.connect();

  try {
    await client.query("BEGIN");

    const countryId = await upsertTerritory(client, {
      publicId: mapping.country.publicId,
      code: mapping.country.code,
      name: mapping.country.name,
      normalizedName: mapping.country.normalizedName,
      level: "country",
      path: mapping.country.path,
      isoCode: mapping.country.isoCode,
      metadata: {
        source: mapping.source,
        source_geojson: null,
        import_role: "country_root"
      }
    });

    const departmentIds = new Map();
    for (const department of mapping.departments) {
      const id = await upsertTerritory(client, {
        publicId: department.publicId,
        parentId: countryId,
        code: department.code,
        name: department.name,
        normalizedName: department.normalizedName,
        level: "department",
        path: department.path,
        isoCode: department.isoCode,
        metadata: {
          source: mapping.source,
          source_geojson: mapping.generatedFrom.departments,
          geojson_name: department.geojsonName,
          geojson_code: department.geojsonCode,
          feature_id: department.featureId,
          gbid: department.gbid,
          geometry_type: department.geometryType,
          source_hash: mapping.hashes.adm1
        }
      });
      departmentIds.set(department.code, id);
    }

    for (const commune of mapping.communes) {
      const parentId = departmentIds.get(commune.departmentCode);
      if (!parentId) throw new Error(`Missing department parent for commune ${commune.name}`);

      await upsertTerritory(client, {
        publicId: commune.publicId,
        parentId,
        code: commune.code,
        name: commune.name,
        normalizedName: commune.normalizedName,
        level: "commune",
        path: commune.path,
        latitude: commune.representativePoint.latitude,
        longitude: commune.representativePoint.longitude,
        metadata: {
          source: mapping.source,
          source_geojson: mapping.generatedFrom.communes,
          geojson_name: commune.geojsonName,
          geojson_code: commune.geojsonCode,
          shape_id: commune.shapeId,
          shape_type: commune.shapeType,
          geometry_type: commune.geometryType,
          parent_department_code: commune.departmentCode,
          adm3_duplicate_of_communes: mapping.analysis.adm3IsCommunesDuplicate,
          source_hash: mapping.hashes.communes
        }
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyImport(env = process.env) {
  validateLocalDatabaseEnv(env);

  const client = new Client();
  await client.connect();
  try {
    const result = await client.query(`
      SELECT territory_level, COUNT(*)::int AS count
      FROM elections_v2.territories
      WHERE metadata->>'source' = $1
      GROUP BY territory_level
      ORDER BY territory_level
    `, [SOURCE]);

    const duplicateResult = await client.query(`
      SELECT territory_level, code, COUNT(*)::int AS count
      FROM elections_v2.territories
      WHERE metadata->>'source' = $1
      GROUP BY territory_level, code
      HAVING COUNT(*) > 1
      ORDER BY territory_level, code
    `, [SOURCE]);

    return {
      counts: result.rows,
      duplicates: duplicateResult.rows
    };
  } finally {
    await client.end();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mapping = buildMapping();

  if (args.has("--write-mapping")) {
    fs.writeFileSync(MAPPING_PATH, `${JSON.stringify(mapping, null, 2)}\n`);
    console.log(JSON.stringify({
      ok: true,
      action: "write-mapping",
      path: path.relative(REPO_ROOT, MAPPING_PATH),
      departments: mapping.departments.length,
      communes: mapping.communes.length,
      trueSections: mapping.analysis.trueSectionCount,
      adm3IsCommunesDuplicate: mapping.analysis.adm3IsCommunesDuplicate
    }));
    return;
  }

  if (args.has("--analyze")) {
    console.log(JSON.stringify({
      ok: true,
      departments: mapping.departments.length,
      communes: mapping.communes.length,
      adm3Features: mapping.analysis.adm3FeatureCount,
      trueSections: mapping.analysis.trueSectionCount,
      adm3IsCommunesDuplicate: mapping.analysis.adm3IsCommunesDuplicate,
      unmappedCommunes: mapping.anomalies.unmappedCommunes,
      ambiguousCommunes: mapping.anomalies.ambiguousCommunes
    }, null, 2));
    return;
  }

  const fileMapping = readJson(MAPPING_PATH);
  if (args.has("--verify")) {
    console.log(JSON.stringify(await verifyImport(), null, 2));
    return;
  }

  await importMapping(fileMapping);
  console.log(JSON.stringify(await verifyImport(), null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  SOURCE,
  buildMapping,
  importMapping,
  validateLocalDatabaseEnv,
  verifyImport
};
