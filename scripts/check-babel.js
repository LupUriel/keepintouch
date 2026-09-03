#!/usr/bin/env node
"use strict";

// Cette porte compile le bloc Babel d'index.html avec le bundle autonome du projet.
// Usage : node scripts/check-babel.js, depuis n'importe quel répertoire courant.

var fs = require("fs");
var path = require("path");
var vm = require("vm");
var racine = path.join(__dirname, "..");
var debut = Date.now();

try {
  var html = fs.readFileSync(path.join(racine, "index.html"), "utf8");
  var correspondance = html.match(/<script\b[^>]*type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);

  if (!correspondance) {
    throw new Error("bloc <script type=\"text/babel\"> absent dans index.html");
  }

  if (typeof global.window === "undefined") global.window = global;
  if (typeof global.self === "undefined") global.self = global;
  if (typeof global.navigator === "undefined") global.navigator = { userAgent: "node" };

  var Babel = require(path.join(racine, "lib", "babel.min.js"));
  var resultat = Babel.transform(correspondance[1], {
    presets: ["react"],
    plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
    sourceType: "module",
    sourceMaps: false
  });
  var code = resultat.code;

  try {
    new vm.Script(code);
  } catch (erreurAnalyse) {
    // Les modules gardant import/export ne sont pas acceptés par vm.Script ; la compilation Babel réussie fait alors foi.
    if (!/(?:Cannot use import statement|Unexpected token ['\"]?export|Unexpected token 'export')/.test(String(erreurAnalyse && erreurAnalyse.message))) {
      throw erreurAnalyse;
    }
  }

  console.log("BABEL_OK (" + String(code.length) + " caractères, " + String(Date.now() - debut) + " ms)");
} catch (erreur) {
  var message = erreur && erreur.message ? erreur.message : String(erreur);
  console.error("ECHEC BABEL: " + message.split(/\r?\n/)[0]);
  process.exitCode = 1;
}
