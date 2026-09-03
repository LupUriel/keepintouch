#!/usr/bin/env node
"use strict";

// Cet enchaîneur exécute les portes de qualité du projet dans leur ordre obligatoire.
// Usage : node scripts/run-gates.js [--with-smoke], depuis n'importe quel répertoire courant.

var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var racine = path.join(__dirname, "..");
var argumentsCli = process.argv.slice(2);
var inconnus = argumentsCli.filter(function (a) { return a !== "--with-smoke"; });
if (inconnus.length) {
  console.error("Argument(s) inconnu(s) : " + inconnus.join(" ") + " (seule l'option --with-smoke est acceptée)");
  process.exit(2);
}
var avecSmoke = argumentsCli.indexOf("--with-smoke") !== -1;
var debutGlobal = Date.now();
var portes = [
  { nom: "check-babel.js", arguments: [path.join(racine, "scripts", "check-babel.js")] },
  { nom: "kit-tests-node.js", arguments: [path.join(racine, "scripts", "kit-tests-node.js")] },
  { nom: "check-lib-hashes.js", arguments: [path.join(racine, "scripts", "check-lib-hashes.js")] },
  { nom: "sw.js", arguments: ["--check", path.join(racine, "sw.js")] }
];

if (avecSmoke) {
  var cheminSmoke = path.join(racine, "scripts", "smoke-navigateur.js");
  portes.push({ nom: "smoke-navigateur.js", arguments: [cheminSmoke], absent: !fs.existsSync(cheminSmoke) });
}

portes.forEach(function (porte) {
  var debut = Date.now();
  if (porte.absent) {
    console.error("PORTE ECHEC : smoke-navigateur.js absent");
    process.exit(1);
  }
  var resultat = childProcess.spawnSync(process.execPath, porte.arguments, { stdio: "inherit", cwd: racine });
  if (resultat.error || resultat.status !== 0) {
    if (resultat.error) console.error(resultat.error.message);
    console.error("PORTE ECHEC : " + porte.nom);
    process.exit(1);
  }
  console.log("OK " + porte.nom + " (" + String(Date.now() - debut) + " ms)");
});

console.log("GATES_OK (" + String(portes.length) + " portes, " + String(Date.now() - debutGlobal) + " ms)");
