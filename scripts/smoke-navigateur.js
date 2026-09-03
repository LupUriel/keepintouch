#!/usr/bin/env node
"use strict";

// Automatise le smoke de Keep In Touch dans un navigateur Chromium headless.
// Prérequis : Node.js 22 ou plus (WebSocket natif).
// Exemples : node scripts/smoke-navigateur.js ; KIT_BROWSER="C:\\...\\msedge.exe" node scripts/smoke-navigateur.js
//            node scripts/smoke-navigateur.js --url http://localhost:8000

var childProcess = require("child_process");
var fs = require("fs");
var http = require("http");
var os = require("os");
var path = require("path");

var browserProcess = null;
var localServer = null;
var profile = null;
var socket = null;
var browserSocket = null;
var debugPort = null;
var sendBrowserCdp = null;
var cleanupPromise = null;

function messageAndExit(message, code) {
  process.stderr.write(message + "\n");
  process.exitCode = code;
}

function parseOptions(argv) {
  var options = { url: null, timeout: 90, minOk: 100, browser: null };
  var names = { "--url": "url", "--timeout": "timeout", "--min-ok": "minOk", "--browser": "browser" };
  var i;
  var key;
  for (i = 0; i < argv.length; i += 1) {
    key = names[argv[i]];
    if (!key || i + 1 >= argv.length) throw new Error("Option invalide ou valeur manquante : " + argv[i]);
    options[key] = argv[i + 1];
    i += 1;
  }
  options.timeout = Number(options.timeout);
  options.minOk = Number(options.minOk);
  if (!isFinite(options.timeout) || options.timeout <= 0) throw new Error("--timeout doit être un nombre positif");
  if (!isFinite(options.minOk) || options.minOk < 0 || Math.floor(options.minOk) !== options.minOk) throw new Error("--min-ok doit être un entier positif ou nul");
  if (options.url && !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(options.url)) {
    throw new Error("--url doit viser http://127.0.0.1 ou http://localhost");
  }
  return options;
}

function findBrowser(explicit) {
  var windows = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  var commands = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge"];
  var i;
  var result;
  if (explicit) return explicit;
  for (i = 0; i < windows.length; i += 1) if (fs.existsSync(windows[i])) return windows[i];
  for (i = 0; i < commands.length; i += 1) {
    result = childProcess.spawnSync(commands[i], ["--version"], { stdio: "ignore" });
    if (!result.error && result.status === 0) return commands[i];
  }
  return null;
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function freePort() {
  return new Promise(function (resolve, reject) {
    var server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", function () {
      var port = server.address().port;
      server.close(function (error) { if (error) reject(error); else resolve(port); });
    });
  });
}

function getJson(port, pathname) {
  return new Promise(function (resolve, reject) {
    var request = http.get({ host: "127.0.0.1", port: port, path: pathname }, function (response) {
      var data = "";
      response.setEncoding("utf8");
      response.on("data", function (chunk) { data += chunk; });
      response.on("end", function () {
        if (response.statusCode !== 200) { reject(new Error("CDP HTTP " + response.statusCode)); return; }
        try { resolve(JSON.parse(data)); } catch (error) { reject(error); }
      });
    });
    request.setTimeout(1000, function () { request.destroy(new Error("Délai CDP HTTP dépassé")); });
    request.on("error", reject);
  });
}

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise(function (resolve) { server.close(function () { resolve(); }); });
}

async function waitForBrowserToClose() {
  var i;
  if (!debugPort) return;
  for (i = 0; i < 25; i += 1) {
    try { await getJson(debugPort, "/json/version"); } catch (error) { return; }
    await sleep(200);
  }
}

function cleanup() {
  if (cleanupPromise) return cleanupPromise;
  cleanupPromise = (async function () {
    var exited;
    if (sendBrowserCdp && browserSocket && browserSocket.readyState === WebSocket.OPEN) {
      try { await withTimeout(sendBrowserCdp("Browser.close"), 2000, "Délai de fermeture CDP dépassé"); } catch (error) { /* nettoyage au mieux */ }
    }
    await waitForBrowserToClose();
    try { if (socket) socket.close(); } catch (error2) { /* nettoyage au mieux */ }
    try { if (browserSocket) browserSocket.close(); } catch (error3) { /* nettoyage au mieux */ }
    if (browserProcess && browserProcess.exitCode === null && browserProcess.signalCode === null) {
      exited = new Promise(function (resolve) { browserProcess.once("exit", resolve); });
      try { browserProcess.kill(); } catch (error4) { /* nettoyage au mieux */ }
      await Promise.race([exited, sleep(3000)]);
      if (browserProcess.exitCode === null && browserProcess.signalCode === null) {
        try { browserProcess.kill("SIGKILL"); } catch (error5) { /* nettoyage au mieux */ }
        await Promise.race([exited, sleep(1000)]);
      }
    }
    await closeServer(localServer);
    if (profile) {
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch (error6) { /* nettoyage au mieux */ }
    }
  }());
  return cleanupPromise;
}

function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error(label)); }, ms);
    promise.then(function (value) { clearTimeout(timer); resolve(value); }, function (error) { clearTimeout(timer); reject(error); });
  });
}

async function run() {
  var options;
  var browser;
  var appUrl;
  var args;
  var versionInfo = null;
  var targets;
  var page;
  var nextId = 0;
  var pending = {};
  var browserNextId = 0;
  var browserPending = {};
  var exceptions = [];
  var logErrors = [];
  var loadResolve;
  var loadPromise = new Promise(function (resolve) { loadResolve = resolve; });
  var started;
  var evaluation;
  var appResult;
  var swResult;
  var report;
  var failed;
  var i;
  var launchError = null;
  var launcherHint = "";

  if (typeof WebSocket === "undefined") {
    messageAndExit("Node 22 ou plus requis (WebSocket natif)", 2);
    return;
  }
  try { options = parseOptions(process.argv.slice(2)); } catch (error) { messageAndExit(error.message, 2); return; }
  browser = findBrowser(options.browser || process.env.KIT_BROWSER);
  if (!browser) {
    messageAndExit("Aucun navigateur Chromium trouvé ; définir KIT_BROWSER ou utiliser --browser <chemin>", 2);
    return;
  }

  try {
    if (options.url) appUrl = options.url;
    else {
      started = await require("./serve-app.js").start(0);
      localServer = started.server;
      appUrl = "http://127.0.0.1:" + started.port + "/?smoke=1";
    }
    debugPort = await freePort();
    profile = fs.mkdtempSync(path.join(os.tmpdir(), "kit-smoke-"));
    args = ["--headless=new", "--disable-gpu", "--disable-background-networking", "--no-first-run", "--no-default-browser-check"];
    if (process.platform === "linux") args.push("--no-sandbox");
    args.push("--remote-debugging-port=" + debugPort, "--user-data-dir=" + profile, "about:blank");
    browserProcess = childProcess.spawn(browser, args, { stdio: "ignore" });
    browserProcess.once("error", function (error) {
      launchError = error;
      Object.keys(pending).forEach(function (id) { pending[id].reject(error); delete pending[id]; });
    });

    for (i = 0; i < 100 && !versionInfo; i += 1) {
      if (launchError) throw launchError;
      try { versionInfo = await getJson(debugPort, "/json/version"); } catch (error2) { await sleep(200); }
    }
    if (!versionInfo) {
      if (browserProcess.exitCode !== null) launcherHint = " ; le processus lanceur s'est terminé avec le code " + browserProcess.exitCode;
      else if (browserProcess.signalCode !== null) launcherHint = " ; le processus lanceur s'est terminé avec le signal " + browserProcess.signalCode;
      throw new Error("Le navigateur n'a pas ouvert le protocole DevTools sous 20 s" + launcherHint);
    }
    browserSocket = new WebSocket(versionInfo.webSocketDebuggerUrl);
    await withTimeout(new Promise(function (resolve, reject) { browserSocket.onopen = resolve; browserSocket.onerror = function () { reject(new Error("Connexion WebSocket navigateur impossible")); }; }), 5000, "Délai de connexion au navigateur dépassé");
    browserSocket.onmessage = function (event) {
      var msg = JSON.parse(event.data);
      var item;
      if (msg.id && browserPending[msg.id]) {
        item = browserPending[msg.id];
        delete browserPending[msg.id];
        if (msg.error) item.reject(new Error(msg.error.message));
        else item.resolve(msg);
      }
    };
    sendBrowserCdp = function (method, params) {
      return new Promise(function (resolve, reject) {
        var id = ++browserNextId;
        browserPending[id] = { resolve: resolve, reject: reject };
        browserSocket.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    };
    targets = await getJson(debugPort, "/json/list");
    page = targets.filter(function (target) { return target.type === "page"; })[0];
    if (!page) throw new Error("Aucune page CDP disponible");
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await withTimeout(new Promise(function (resolve, reject) { socket.onopen = resolve; socket.onerror = function () { reject(new Error("Connexion WebSocket CDP impossible")); }; }), 5000, "Délai de connexion CDP dépassé");

    socket.onmessage = function (event) {
      var msg = JSON.parse(event.data);
      var item;
      if (msg.id && pending[msg.id]) {
        item = pending[msg.id];
        delete pending[msg.id];
        if (msg.error) item.reject(new Error(msg.error.message));
        else item.resolve(msg);
      } else if (msg.method === "Page.loadEventFired") loadResolve();
      else if (msg.method === "Runtime.exceptionThrown") exceptions.push(msg.params.exceptionDetails.text || "Exception sans libellé");
      else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") logErrors.push(msg.params.entry.text || "Erreur sans libellé");
    };
    function send(method, params) {
      return new Promise(function (resolve, reject) {
        var id = ++nextId;
        pending[id] = { resolve: resolve, reject: reject };
        socket.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Log.enable");
    await send("Page.navigate", { url: appUrl });
    await withTimeout(loadPromise, options.timeout * 1000, "Page.loadEventFired non reçu avant le délai");

    evaluation = await send("Runtime.evaluate", {
      expression: "(function () { var logs = [], errors = [], oldLog = console.log, oldError = console.error, failures = -1, timing = performance.getEntriesByType('navigation')[0], html = document.documentElement.outerHTML, match = /var APP_VERSION = [\\\"']([^\\\"']+)[\\\"']/.exec(html); console.log = function () { logs.push(Array.prototype.join.call(arguments, ' ')); }; console.error = function () { errors.push(Array.prototype.join.call(arguments, ' ')); }; try { if (typeof KIT_TESTS !== 'undefined' && KIT_TESTS && typeof KIT_TESTS.run === 'function') failures = KIT_TESTS.run(); } catch (e) { errors.push(String(e && e.stack || e)); failures = -1; } finally { console.log = oldLog; console.error = oldError; } var all = logs.concat(errors); return { version: match ? match[1] : null, password: !!document.querySelector('input[type=password]'), rootHasBoot: !!(document.querySelector('#root') && document.querySelector('#root').innerHTML.indexOf('kit-boot') >= 0), dclMs: timing ? timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart : -1, kitTests: { failures: failures, ok: logs.filter(function (line) { return /^OK /.test(line); }).length, nonOk: all.filter(function (line) { return !/^OK /.test(line); }).slice(0, 5) } }; })()",
      returnByValue: true
    });
    if (!evaluation.result || !evaluation.result.result || evaluation.result.result.subtype === "error") throw new Error("Évaluation du smoke impossible");
    appResult = evaluation.result.result.value;
    await sleep(2000);
    swResult = await send("Runtime.evaluate", { expression: "('serviceWorker' in navigator) ? navigator.serviceWorker.getRegistrations().then(function (registrations) { return registrations.length; }) : -1", awaitPromise: true, returnByValue: true });
    report = appResult;
    report.swRegistrations = swResult.result && swResult.result.result ? swResult.result.result.value : -1;
    report.browser = versionInfo.Browser || null;
    report.exceptions = exceptions;
    report.logErrors = logErrors;
    report.url = appUrl;
    failed = report.password !== true || report.kitTests.failures !== 0 || report.kitTests.ok < options.minOk || exceptions.length > 0 || logErrors.some(function (entry) { return entry.indexOf("SyntaxError") >= 0; }) || report.rootHasBoot === true;
    process.stdout.write(JSON.stringify(report) + "\n");
    process.stdout.write((failed ? "SMOKE_ECHEC" : "SMOKE_OK") + "\n");
    process.exitCode = failed ? 1 : 0;
  } catch (error3) {
    messageAndExit("Smoke impossible : " + (error3 && error3.message || error3), 2);
  } finally {
    await cleanup();
  }
}

process.on("exit", function () {
  try { if (socket) socket.close(); } catch (error) { /* nettoyage au mieux */ }
  try { if (browserSocket) browserSocket.close(); } catch (error2) { /* nettoyage au mieux */ }
  try { if (browserProcess && !browserProcess.killed) browserProcess.kill(); } catch (error3) { /* nettoyage au mieux */ }
  if (profile) try { fs.rmSync(profile, { recursive: true, force: true }); } catch (error4) { /* nettoyage au mieux */ }
});
process.on("SIGINT", function () { cleanup().then(function () { process.exit(130); }); });
process.on("SIGTERM", function () { cleanup().then(function () { process.exit(143); }); });

run();
