#!/usr/bin/env node
"use strict";

// Sert l'application Keep In Touch depuis la racine du dépôt, sans cache.
// Prérequis : Node.js ; le smoke navigateur associé exige Node.js 22 ou plus.
// Exemple : node scripts/serve-app.js 8000

var fs = require("fs");
var http = require("http");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".md": "text/markdown; charset=utf-8"
};

function respond(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(body);
}

function handler(request, response) {
  var pathname;
  var relative;
  var filename;

  try {
    pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  } catch (error) {
    respond(response, 404, "Introuvable\n");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    respond(response, 404, "Introuvable\n");
    return;
  }

  relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (relative.indexOf("\0") !== -1 || relative.split(/[\\/]+/).some(function (segment) { return segment === ".." || segment.charAt(0) === "."; })) {
    respond(response, 404, "Introuvable\n");
    return;
  }

  filename = path.resolve(ROOT, relative);
  if (filename !== ROOT && filename.indexOf(ROOT + path.sep) !== 0) {
    respond(response, 404, "Introuvable\n");
    return;
  }

  fs.stat(filename, function (statError, stat) {
    if (statError || !stat.isFile()) {
      respond(response, 404, "Introuvable\n");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": MIME_TYPES[path.extname(filename).toLowerCase()] || "application/octet-stream"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filename).on("error", function () {
      if (!response.headersSent) respond(response, 404, "Introuvable\n");
      else response.destroy();
    }).pipe(response);
  });
}

function start(port) {
  return new Promise(function (resolve, reject) {
    var server = http.createServer(handler);
    server.once("error", reject);
    server.listen(Number(port) || 0, "127.0.0.1", function () {
      server.removeListener("error", reject);
      resolve({ server: server, port: server.address().port });
    });
  });
}

module.exports.start = start;

if (require.main === module) {
  start(process.argv[2]).then(function (result) {
    process.stdout.write("PORT=" + result.port + "\n");
  }).catch(function (error) {
    process.stderr.write(String(error && error.message || error) + "\n");
    process.exitCode = 1;
  });
}
