#!/usr/bin/env node
"use strict";

var fs = require("fs");
var vm = require("vm");
var html = fs.readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
var sw = fs.readFileSync(require("path").join(__dirname, "..", "sw.js"), "utf8");
function lireOuVide(path) { try { return fs.readFileSync(path, "utf8"); } catch (e) { return ""; } }
var docs = lireOuVide(require("path").join(__dirname, "..", "LISEZMOI.txt")) + "\n" + lireOuVide(require("path").join(__dirname, "..", "docs", "RECETTE.md"));
var scripts = [];
var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
var match;
while ((match = re.exec(html))) {
  if (/\bsrc\s*=/.test(match[1]) || /\btype\s*=\s*["']text\/babel["']/.test(match[1])) continue;
  scripts.push(match[2]);
}
var storage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {}, key: function () { return null; }, length: 0 };
var sandbox = { console: console, localStorage: storage, location: { hostname: "localhost" }, navigator: { onLine: true }, window: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, Promise: Promise, KIT_SOURCE_HTML: html, KIT_SOURCE_SW: sw, KIT_SOURCE_DOCS: docs };
vm.createContext(sandbox);
try {
  vm.runInContext(fs.readFileSync(require("path").join(__dirname, "..", "data", "naf-2025.js"), "utf8"), sandbox, { filename: "naf-2025.js" });
  scripts.forEach(function (source, index) { vm.runInContext(source, sandbox, { filename: "index-inline-" + String(index + 1) + ".js" }); });
  var debutAides = html.indexOf("/* ── KIT_SYNC_HELPERS ── */");
  var finAides = html.indexOf("/* ── KIT_SYNC_HELPERS_END ── */", debutAides);
  if (debutAides >= 0 && finAides > debutAides) vm.runInContext(html.slice(debutAides, finAides), sandbox, { filename: "kit-sync-helpers.js" });
  var failures = sandbox.KIT_TESTS.run();
  process.exitCode = failures ? 1 : 0;
} catch (error) {
  console.error(error && error.stack || error);
  process.exitCode = 1;
}
