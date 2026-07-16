const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const net = require("node:net");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const enabled = process.env.V2_BROWSER_TESTS === "1";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function waitFor(fn, timeoutMs = 8000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await delay(100);
  }
  throw lastError || new Error("Timed out waiting for condition");
}

async function startServer() {
  process.env.V2_READ_API = "true";
  process.env.V2_PUBLIC_UI = "true";
  process.env.PGHOST = "127.0.0.1";
  process.env.PGPORT = "55433";
  process.env.PGDATABASE = "juno7_elections_v2_test";

  const { app } = require("../index.js");
  const address = await app.listen({ host: "127.0.0.1", port: 0 });
  return { app, address };
}

async function startChrome() {
  assert.equal(fs.existsSync(chromePath), true, "Google Chrome must be installed for V2_BROWSER_TESTS=1");

  const debuggingPort = 49000 + Math.floor(Math.random() * 1000);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "juno7-v2-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "pipe"]
  });

  const baseUrl = `http://127.0.0.1:${debuggingPort}`;
  await waitFor(() => fetchJson(`${baseUrl}/json/version`), 10000);

  async function close() {
    if (!chrome.killed) chrome.kill("SIGTERM");
    await delay(250);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  return { baseUrl, close };
}

function encodeFrame(text) {
  const payload = Buffer.from(text);
  const length = payload.length;
  let headerLength = 2;
  if (length >= 126 && length <= 65535) headerLength += 2;
  if (length > 65535) headerLength += 8;

  const frame = Buffer.alloc(headerLength + 4 + length);
  frame[0] = 0x81;
  let offset = 2;
  if (length < 126) {
    frame[1] = 0x80 | length;
  } else if (length <= 65535) {
    frame[1] = 0x80 | 126;
    frame.writeUInt16BE(length, 2);
    offset = 4;
  } else {
    frame[1] = 0x80 | 127;
    frame.writeBigUInt64BE(BigInt(length), 2);
    offset = 10;
  }

  const mask = crypto.randomBytes(4);
  mask.copy(frame, offset);
  for (let i = 0; i < payload.length; i += 1) {
    frame[offset + 4 + i] = payload[i] ^ mask[i % 4];
  }
  return frame;
}

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + 4 > buffer.length) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > buffer.length) break;
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }

    const maskLength = masked ? 4 : 0;
    const frameEnd = offset + headerLength + maskLength + length;
    if (frameEnd > buffer.length) break;

    let payload = buffer.subarray(offset + headerLength + maskLength, frameEnd);
    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }
    if (opcode === 1) messages.push(payload.toString("utf8"));
    offset = frameEnd;
  }

  return { messages, rest: buffer.subarray(offset) };
}

function connectWebSocket(wsUrl) {
  const parsed = new URL(wsUrl);
  const key = crypto.randomBytes(16).toString("base64");
  const socket = net.createConnection(Number(parsed.port), parsed.hostname);
  let buffer = Buffer.alloc(0);
  let opened = false;
  let onMessage = () => {};

  const openPromise = new Promise((resolve, reject) => {
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write([
        `GET ${parsed.pathname}${parsed.search} HTTP/1.1`,
        `Host: ${parsed.host}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "",
        ""
      ].join("\r\n"));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!opened) {
        const end = buffer.indexOf("\r\n\r\n");
        if (end === -1) return;
        const header = buffer.subarray(0, end).toString("utf8");
        if (!/^HTTP\/1\.1 101\b/.test(header)) {
          reject(new Error(`WebSocket handshake failed: ${header}`));
          return;
        }
        opened = true;
        buffer = buffer.subarray(end + 4);
        resolve();
      }

      const decoded = decodeFrames(buffer);
      buffer = decoded.rest;
      for (const message of decoded.messages) onMessage(message);
    });
  });

  return {
    open: openPromise,
    onMessage(handler) {
      onMessage = handler;
    },
    send(text) {
      socket.write(encodeFrame(text));
    },
    close() {
      socket.end();
    }
  };
}

async function openPage(chromeBaseUrl) {
  const tabs = await fetchJson(`${chromeBaseUrl}/json/list`);
  const tab = tabs.find(item => item.type === "page") || tabs[0];
  const ws = connectWebSocket(tab.webSocketDebuggerUrl);
  await ws.open;

  let id = 0;
  const pending = new Map();
  const events = [];
  const requests = [];
  const httpErrors = [];
  const failures = [];
  const consoleErrors = [];

  ws.onMessage((message) => {
    const payload = JSON.parse(message);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result || {});
      return;
    }
    events.push(payload);
    if (payload.method === "Network.requestWillBeSent") {
      requests.push({
        url: payload.params.request.url,
        method: payload.params.request.method
      });
    }
    if (payload.method === "Network.loadingFailed") {
      failures.push(payload.params);
    }
    if (payload.method === "Network.responseReceived" && payload.params.response.status >= 400) {
      httpErrors.push({
        url: payload.params.response.url,
        status: payload.params.response.status
      });
    }
    if (payload.method === "Runtime.exceptionThrown") {
      consoleErrors.push(payload.params.exceptionDetails.text || "Runtime exception");
    }
    if (payload.method === "Log.entryAdded" && ["error", "warning"].includes(payload.params.entry.level)) {
      consoleErrors.push(payload.params.entry.text);
    }
  });

  function command(method, params = {}) {
    const commandId = ++id;
    ws.send(JSON.stringify({ id: commandId, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(commandId, { resolve, reject });
    });
  }

  async function evaluate(expression) {
    const result = await command("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Evaluation failed");
    }
    return result.result.value;
  }

  return { command, evaluate, requests, httpErrors, failures, consoleErrors, close: () => ws.close() };
}

function isExpectedBrowser404(item) {
  return item.status === 404 && (
    item.url.endsWith("/favicon.ico") ||
    item.url.includes("/api/v2/elections/not_found_v2")
  );
}

function isExpectedConsole404(text) {
  return text === "Failed to load resource: the server responded with a status of 404 (Not Found)";
}

async function navigateAndWait(page, url) {
  await page.command("Page.navigate", { url });
  await waitFor(async () => (
    page.evaluate("document.readyState === 'complete' && document.getElementById('page-status') && !document.getElementById('page-status').textContent.includes('Chargement')")
  ), 12000);
}

test("V2 dashboard browser smoke test", { skip: enabled ? false : "Set V2_BROWSER_TESTS=1 to run local Chrome dashboard checks." }, async () => {
  const server = await startServer();
  const chrome = await startChrome();
  const page = await openPage(chrome.baseUrl);

  try {
    await page.command("Page.enable");
    await page.command("Runtime.enable");
    await page.command("Network.enable");
    await page.command("Log.enable");

    await page.command("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await navigateAndWait(page, `${server.address}/v2-dashboard`);

    assert.equal(await page.evaluate("document.title"), "Juno7 Elections - Tableau V2");
    assert.equal(await page.evaluate("document.querySelector('.banner').textContent"), "V2 — DONNÉES DE DÉMONSTRATION");
    assert.equal(await page.evaluate("document.querySelectorAll('button.election').length > 0"), true);
    assert.equal(await page.evaluate("document.getElementById('rounds-content').textContent.includes('Fictional Demo Round')"), true);
    assert.equal(await page.evaluate("document.getElementById('offices-content').textContent.includes('Fictional Demo Office')"), true);
    assert.equal(await page.evaluate("document.getElementById('candidacies-content').textContent.includes('Fictional Demo Candidate')"), true);
    assert.equal(await page.evaluate("document.getElementById('progress-content').textContent.includes('PV attendus')"), true);
    assert.equal(await page.evaluate("document.getElementById('publication-content').textContent.includes('provisional')"), true);

    await page.command("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
      scale: 1
    });
    await page.command("Emulation.setTouchEmulationEnabled", { enabled: true });
    await navigateAndWait(page, `${server.address}/v2-dashboard`);
    assert.equal(await page.evaluate("Math.round(window.visualViewport?.width || window.innerWidth) <= 390"), true);
    assert.equal(await page.evaluate("document.querySelector('.banner').getBoundingClientRect().width <= window.innerWidth"), true);

    assert.equal(await page.evaluate("renderOffices({ items: [] }); document.getElementById('offices-content').textContent.includes('Aucun poste électif disponible.')"), true);
    assert.equal(await page.evaluate("setStatus('Erreur de démonstration', true); document.getElementById('page-status').classList.contains('error')"), true);
    assert.equal(await page.evaluate("selectElection('not_found_v2').then(() => document.getElementById('page-status').textContent.includes('Élection introuvable.'))"), true);

    const writeRequests = page.requests.filter(request => (
      request.url.includes("/api/v2/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)
    ));
    assert.deepEqual(writeRequests, []);
    assert.deepEqual(page.httpErrors.filter(item => !isExpectedBrowser404(item)), []);
    assert.deepEqual(page.failures.filter(item => item.errorText !== "net::ERR_ABORTED"), []);
    assert.deepEqual(page.consoleErrors.filter(text => !isExpectedConsole404(text)), []);
  } finally {
    page.close();
    await chrome.close();
    await server.app.close();
  }
});
